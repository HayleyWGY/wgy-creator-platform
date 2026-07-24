/**
 * Distributed rate limiter backed by Upstash Redis.
 *
 * Replaces the previous module-level in-memory Map, which was per serverless
 * instance: on Vercel each new lambda started with an empty map, so the limit
 * was effectively multiplied by the number of warm instances. State now lives
 * in Redis and is shared across every instance.
 *
 * Usage (after the session check in a route handler):
 *   if (!(await rateLimit(`send:${session.user.id}`, 20, 60_000))) {
 *     return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
 *   }
 *
 * Failure policy — chosen per call site, never silent:
 *   failClosed: false (default) — if Redis is unreachable, ALLOW the request
 *     and report to Sentry. Correct for read/social paths where a Redis
 *     outage must not take the app down.
 *   failClosed: true — if Redis is unreachable, BLOCK (429). Correct for auth
 *     and for destructive admin broadcasts, where "unlimited" is a worse
 *     outcome than a temporary refusal.
 *
 * Either way the failure is reported — it is never swallowed.
 */
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import * as Sentry from '@sentry/nextjs'

export interface RateLimitOptions {
  /** Block instead of allowing when Redis is unreachable. Default false. */
  failClosed?: boolean
}

let redis: Redis | null | undefined
function getRedis(): Redis | null {
  if (redis !== undefined) return redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  redis = url && token ? new Redis({ url, token }) : null
  return redis
}

// Short-circuits identifiers already known to be blocked, so a client being
// throttled doesn't cost a Redis round-trip per attempt. Only caches the
// blocked state, so it can't wrongly allow anyone.
const ephemeralCache = new Map<string, number>()

/**
 * Key namespace. Overridable so the test suite can share one Upstash database
 * with production without their keys ever meeting — the free tier allows only
 * one database, so separate instances are not an option.
 *
 * A distinct prefix is what actually matters here. The danger was never
 * shared storage (a handful of test keys is nothing); it was COLLISION — a
 * test writing `login-ip:<a real address>` would throttle a real member out
 * of their own account. Different prefixes make that impossible, because no
 * test key can ever name the same slot as a production one.
 */
const KEY_PREFIX = process.env.UPSTASH_RATELIMIT_PREFIX || 'wgy-rl'

// One Ratelimit instance per (limit, window) pair — cheap to reuse.
const limiters = new Map<string, Ratelimit>()
function getLimiter(limit: number, windowMs: number): Ratelimit | null {
  const client = getRedis()
  if (!client) return null

  const seconds = Math.max(1, Math.ceil(windowMs / 1000))
  const cacheKey = `${limit}:${seconds}`
  let limiter = limiters.get(cacheKey)
  if (!limiter) {
    limiter = new Ratelimit({
      redis: client,
      limiter: Ratelimit.slidingWindow(limit, `${seconds} s`),
      prefix: KEY_PREFIX,
      analytics: false,
      ephemeralCache,
    })
    limiters.set(cacheKey, limiter)
  }
  return limiter
}

let warnedUnconfigured = false

/**
 * Returns true if the request is allowed, false if it should be rejected
 * with a 429.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  options: RateLimitOptions = {},
): Promise<boolean> {
  const { failClosed = false } = options
  const limiter = getLimiter(limit, windowMs)

  // NOT CONFIGURED (no credentials at all) — always allow, and shout.
  //
  // This deliberately ignores failClosed. A missing env var is a deployment
  // mistake, not an attack, and it is uniform: applying failClosed here locks
  // every user out of the product until someone notices. That is exactly what
  // happened on the first deploy of this module — Vercel only injects env
  // vars into deployments created after they are set, so the running build
  // had no credentials and refused every sign-in, including the owner's.
  //
  // A misconfiguration must degrade to "unthrottled and loudly reported",
  // never to "nobody can log in". The genuine outage case — configured but
  // unreachable — still honours failClosed in the catch below.
  if (!limiter) {
    if (!warnedUnconfigured) {
      warnedUnconfigured = true
      const msg = 'Rate limiting DISABLED — UPSTASH_REDIS_REST_URL/TOKEN missing. Requests are unthrottled.'
      console.error(`[rate-limit] ${msg}`)
      if (process.env.NODE_ENV === 'production') {
        Sentry.captureMessage(`[rate-limit] ${msg}`, 'error')
      }
    }
    return true
  }

  try {
    const { success } = await limiter.limit(key)
    return success
  } catch (err) {
    // Never swallow: report, then apply the call site's declared policy.
    console.error('[rate-limit] Redis unreachable:', err)
    Sentry.captureException(err, {
      tags: { subsystem: 'rate-limit', failClosed: String(failClosed) },
    })
    return !failClosed
  }
}

/**
 * Anything carrying request headers. Route handlers give us a real `Request`;
 * NextAuth's `authorize(credentials, req)` gives a plain object whose headers
 * are a string map. One implementation handles both so the IP is derived
 * identically everywhere (two divergent copies is exactly the bug class this
 * codebase has been bitten by).
 */
export type HeaderSource =
  | Request
  | { headers?: Record<string, string | string[] | undefined> }

function readHeader(source: HeaderSource, name: string): string | undefined {
  const headers = (source as { headers?: unknown }).headers
  if (headers && typeof (headers as Headers).get === 'function') {
    return (headers as Headers).get(name) ?? undefined
  }
  const map = headers as Record<string, string | string[] | undefined> | undefined
  const value = map?.[name] ?? map?.[name.toLowerCase()]
  return Array.isArray(value) ? value[0] : value
}

/**
 * Best-effort client IP, for limiting endpoints with no session to key on
 * (login, and the token-authenticated application receipt route).
 *
 * Vercel sets x-forwarded-for; the left-most entry is the client. Falls back
 * to a constant so a missing header degrades to a single shared bucket
 * rather than silently disabling the limit.
 */
export function getClientIp(source: HeaderSource): string {
  const forwarded = readHeader(source, 'x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return readHeader(source, 'x-real-ip')?.trim() || 'unknown-ip'
}

/**
 * Failure counters for progressive login backoff.
 *
 * Separate from rateLimit() because backoff needs the COUNT, not a verdict —
 * the count picks a delay rather than a yes/no. Kept in Redis so the delay is
 * consistent across serverless instances, exactly like the limiter.
 *
 * All three fail open (0 / silent no-op) when Redis is unavailable. A login
 * that cannot compute its backoff should proceed without one, not break.
 */

export async function bumpFailureCount(key: string, windowMs: number): Promise<number> {
  const client = getRedis()
  if (!client) return 0
  try {
    const namespaced = `${KEY_PREFIX}:fail:${key}`
    const count = await client.incr(namespaced)
    // Refresh the window on every failure, so a sustained attack keeps the
    // delay high rather than letting it lapse mid-run.
    await client.expire(namespaced, Math.ceil(windowMs / 1000))
    return count
  } catch (err) {
    console.error('[rate-limit] bumpFailureCount failed:', err)
    Sentry.captureException(err, { tags: { subsystem: 'rate-limit' } })
    return 0
  }
}

export async function readFailureCount(key: string): Promise<number> {
  const client = getRedis()
  if (!client) return 0
  try {
    const value = await client.get<number | string | null>(`${KEY_PREFIX}:fail:${key}`)
    const n = typeof value === 'string' ? parseInt(value, 10) : value
    return typeof n === 'number' && Number.isFinite(n) ? n : 0
  } catch (err) {
    console.error('[rate-limit] readFailureCount failed:', err)
    return 0
  }
}

export async function clearFailureCount(key: string): Promise<void> {
  const client = getRedis()
  if (!client) return
  try {
    await client.del(`${KEY_PREFIX}:fail:${key}`)
  } catch (err) {
    console.error('[rate-limit] clearFailureCount failed:', err)
  }
}
