/**
 * Lightweight in-memory sliding-window rate limiter.
 *
 * Scope: per serverless instance. On Vercel this is a BURST guard — it
 * throttles rapid-fire abuse hitting a warm instance, but is not a hard
 * global guarantee across instances. Login brute-force protection is
 * handled separately (DB-backed lockout in lib/auth.ts). If we later need
 * hard global limits, swap the internals for Upstash Ratelimit without
 * changing call sites.
 *
 * Usage (after the session check in a route handler):
 *   if (!rateLimit(`send:${session.user.id}`, 20, 60_000)) {
 *     return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
 *   }
 */

const hits = new Map<string, number[]>()

// Periodically drop stale keys so the map doesn't grow unbounded.
const SWEEP_INTERVAL = 5 * 60 * 1000
let lastSweep = Date.now()

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()

  if (now - lastSweep > SWEEP_INTERVAL) {
    lastSweep = now
    hits.forEach((times, k) => {
      if (times.length === 0 || now - times[times.length - 1] > SWEEP_INTERVAL) {
        hits.delete(k)
      }
    })
  }

  const windowStart = now - windowMs
  const times = (hits.get(key) ?? []).filter(t => t > windowStart)

  if (times.length >= limit) {
    hits.set(key, times)
    return false
  }

  times.push(now)
  hits.set(key, times)
  return true
}
