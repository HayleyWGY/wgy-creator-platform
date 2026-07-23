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
      prefix: 'wgy-rl',
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

  // Not configured. In production that's a misconfiguration and must apply
  // the route's failure policy; locally it just disables limiting so dev
  // doesn't require Redis.
  if (!limiter) {
    const isProd = process.env.NODE_ENV === 'production'
    if (!warnedUnconfigured) {
      warnedUnconfigured = true
      const msg = 'Rate limiting is not configured (UPSTASH_REDIS_REST_URL/TOKEN missing)'
      console.error(`[rate-limit] ${msg}`)
      if (isProd) Sentry.captureMessage(`[rate-limit] ${msg}`, 'error')
    }
    return isProd ? !failClosed : true
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
