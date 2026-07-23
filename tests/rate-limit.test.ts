import { describe, it, expect, vi } from 'vitest'

/**
 * The point of this suite is the cross-instance behaviour.
 *
 * The old limiter kept counts in a module-level `new Map()`, so every
 * serverless instance started empty and the effective limit was multiplied by
 * the number of warm lambdas. `vi.resetModules()` + a fresh dynamic import
 * simulates exactly that: a brand-new module instance, as a cold lambda would
 * have. With the in-memory implementation the second instance saw a clean
 * slate; backed by Redis it sees the shared count.
 *
 * These are integration tests against the real Upstash database, so they're
 * skipped when credentials aren't present (e.g. CI without secrets).
 */

const hasRedis = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
)

// Namespaced so test traffic can never collide with real counters — we
// currently share one Upstash database with production.
const testKey = (name: string) => `test:${name}:${Date.now()}-${Math.random().toString(36).slice(2)}`

async function freshLimiterInstance() {
  vi.resetModules()
  return (await import('@/lib/rate-limit')).rateLimit
}

describe.skipIf(!hasRedis)('rateLimit — distributed across instances (integration)', () => {
  it('allows up to the limit then blocks, within one instance', async () => {
    const { rateLimit } = await import('@/lib/rate-limit')
    const key = testKey('single')

    expect(await rateLimit(key, 3, 60_000)).toBe(true)
    expect(await rateLimit(key, 3, 60_000)).toBe(true)
    expect(await rateLimit(key, 3, 60_000)).toBe(true)
    expect(await rateLimit(key, 3, 60_000)).toBe(false)
  })

  it('THE REGRESSION: a second instance sees the count from the first', async () => {
    const key = testKey('cross-instance')

    // Instance A exhausts the limit.
    const limitA = await freshLimiterInstance()
    expect(await limitA(key, 2, 60_000)).toBe(true)
    expect(await limitA(key, 2, 60_000)).toBe(true)
    expect(await limitA(key, 2, 60_000)).toBe(false)

    // Instance B is a completely fresh module — a cold lambda. With the old
    // in-memory Map this returned true (limit reset). It must stay blocked.
    const limitB = await freshLimiterInstance()
    expect(await limitB(key, 2, 60_000)).toBe(false)
  })

  it('keeps separate keys independent across instances', async () => {
    const a = testKey('independent-a')
    const b = testKey('independent-b')

    const limitA = await freshLimiterInstance()
    expect(await limitA(a, 1, 60_000)).toBe(true)
    expect(await limitA(a, 1, 60_000)).toBe(false)

    const limitB = await freshLimiterInstance()
    expect(await limitB(b, 1, 60_000)).toBe(true) // untouched key still allowed
    expect(await limitB(a, 1, 60_000)).toBe(false) // exhausted key still blocked
  })
})

describe('getClientIp', () => {
  it('reads the left-most x-forwarded-for entry from a Request', async () => {
    const { getClientIp } = await import('@/lib/rate-limit')
    const req = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '203.0.113.7, 70.41.3.18' },
    })
    expect(getClientIp(req)).toBe('203.0.113.7')
  })

  it('reads headers from NextAuth-style plain objects too', async () => {
    const { getClientIp } = await import('@/lib/rate-limit')
    // authorize(credentials, req) hands us a plain header map, not a Headers
    expect(getClientIp({ headers: { 'x-forwarded-for': '198.51.100.4' } })).toBe('198.51.100.4')
    expect(getClientIp({ headers: { 'x-real-ip': '198.51.100.9' } })).toBe('198.51.100.9')
  })

  it('degrades to a shared bucket rather than disabling the limit', async () => {
    const { getClientIp } = await import('@/lib/rate-limit')
    expect(getClientIp({ headers: {} })).toBe('unknown-ip')
    expect(getClientIp(new Request('https://example.com'))).toBe('unknown-ip')
  })
})

describe('unconfigured (no Redis credentials)', () => {
  it('ALLOWS even when failClosed is set — a missing env var must never lock everyone out', async () => {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    try {
      vi.resetModules()
      const { rateLimit } = await import('@/lib/rate-limit')
      // This is the login configuration. Before the fix it returned false,
      // which refused every sign-in in production.
      expect(await rateLimit('test:unconfigured', 1, 60_000, { failClosed: true })).toBe(true)
    } finally {
      if (url) process.env.UPSTASH_REDIS_REST_URL = url
      if (token) process.env.UPSTASH_REDIS_REST_TOKEN = token
      vi.resetModules()
    }
  })
})
