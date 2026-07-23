import { describe, it, expect } from 'vitest'
import type { CredentialsConfig } from 'next-auth/providers/credentials'

/**
 * Verifies the login throttle is actually WIRED IN — not just that the
 * limiter works in isolation.
 *
 * We pre-exhaust the IP bucket directly, then call authorize(). Because the
 * throttle runs before the account lookup and before bcrypt, authorize must
 * refuse without touching the database — so this test needs no DB fixtures
 * and proves the ordering at the same time.
 *
 * Integration test against the real Upstash database; skipped without creds.
 */
const hasRedis = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
)

describe.skipIf(!hasRedis)('login rate limiting (wiring)', () => {
  it('authorize() refuses once the IP bucket is exhausted, before any DB work', async () => {
    const { rateLimit } = await import('@/lib/rate-limit')
    const { authOptions } = await import('@/lib/auth')

    const ip = `test-ip-${Date.now()}-${Math.random().toString(36).slice(2)}`

    // Burn the 20/15min IP allowance using the exact key lib/auth.ts uses.
    for (let i = 0; i < 20; i++) {
      await rateLimit(`login-ip:${ip}`, 20, 15 * 60_000, { failClosed: true })
    }

    // NOTE: next-auth v4 returns the provider as {...defaults, options},
    // where `.authorize` at the top level is its default `() => null` stub
    // and OUR implementation is nested under `.options`. next-auth merges
    // them at runtime. Reaching for the top-level one silently tests the
    // stub — it resolves null and proves nothing.
    const provider = authOptions.providers[0] as unknown as CredentialsConfig & {
      options?: Partial<CredentialsConfig>
    }
    const authorize = provider.options?.authorize ?? provider.authorize
    expect(String(authorize)).toContain('rate-limited') // guard: we have the real one

    // The sign-in page maps this exact string to a "too many attempts"
    // message; anything else would show "invalid password" instead.
    await expect(async () =>
      authorize(
        { email: 'nobody@example.com', password: 'irrelevant' },
        { headers: { 'x-forwarded-for': ip } } as never,
      ),
    ).rejects.toThrow('rate-limited')
  })

  it('a different IP is unaffected (buckets are per-IP, not global)', async () => {
    const { rateLimit } = await import('@/lib/rate-limit')
    const freshIp = `test-ip-${Date.now()}-${Math.random().toString(36).slice(2)}`
    expect(await rateLimit(`login-ip:${freshIp}`, 20, 15 * 60_000, { failClosed: true })).toBe(true)
  })
})
