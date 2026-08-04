import { describe, it, expect } from 'vitest'
import bcrypt from 'bcryptjs'
import { loginBackoffMs, accountBackoffMs, chooseLoginDelay } from '@/lib/auth'

/**
 * Three defects in the credentials flow, all in authorize():
 *
 *  1. Lockout was keyed to the ACCOUNT with no throttle in front, so anyone
 *     who knew a member's email could lock them out with five requests. Member
 *     emails are not secret and there is no password-reset flow.
 *  2. The failure counter was read-modify-write, so concurrent attempts read
 *     the same stale value and the threshold barely applied.
 *  3. Two enumeration oracles: an early return before bcrypt made missing
 *     accounts answer far faster, and only a REGISTERED address could ever
 *     produce the "locked" message.
 */

describe('progressive backoff curve', () => {
  it('does not punish the first couple of typos', () => {
    // Mistyping your own password twice is normal, not suspicious.
    expect(loginBackoffMs(0)).toBe(0)
    expect(loginBackoffMs(1)).toBe(0)
  })

  it('escalates once failures look deliberate', () => {
    expect(loginBackoffMs(2)).toBe(250)
    expect(loginBackoffMs(3)).toBe(500)
    expect(loginBackoffMs(4)).toBe(1000)
    expect(loginBackoffMs(5)).toBe(2000)
  })

  it('is CAPPED — an uncapped delay would bill us and eat our own concurrency', () => {
    // A sleeping serverless function still occupies a slot and costs money,
    // so the curve must not grow without bound.
    for (const n of [6, 10, 50, 1000, 10_000]) {
      expect(loginBackoffMs(n)).toBeLessThanOrEqual(3000)
    }
    expect(loginBackoffMs(1000)).toBe(3000)
  })

  it('never denies — the member always eventually gets in', () => {
    // THE FIX for defect 1: the curve returns a delay, never a refusal. No
    // input produces "blocked", so no attacker can lock a member out.
    for (const n of [0, 5, 100, 100_000]) {
      const delay = loginBackoffMs(n)
      expect(Number.isFinite(delay)).toBe(true)
      expect(delay).toBeLessThanOrEqual(3000)
    }
  })
})

describe('per-account backoff — the distributed brute-force backstop', () => {
  it('does not delay a member’s occasional typos (below the high threshold)', () => {
    for (const n of [0, 1, 5, 9]) expect(accountBackoffMs(n)).toBe(0)
  })

  it('kicks in past the threshold and is CAPPED (denial-of-wallet bound)', () => {
    expect(accountBackoffMs(10)).toBe(250)
    expect(accountBackoffMs(11)).toBe(500)
    for (const n of [20, 100, 10_000]) expect(accountBackoffMs(n)).toBeLessThanOrEqual(3000)
    expect(accountBackoffMs(1000)).toBe(3000)
  })

  it('never denies — only ever a finite, capped delay', () => {
    for (const n of [0, 10, 100, 100_000]) {
      const d = accountBackoffMs(n)
      expect(Number.isFinite(d)).toBe(true)
      expect(d).toBeLessThanOrEqual(3000)
    }
  })

  it('DISTRIBUTED CASE: many IPs against one account is still throttled', () => {
    // A botnet rotates IPs, so the (email+ip) counter is ~fresh (0–1) on every
    // attempt — the OLD design had no per-account ceiling and imposed ~no delay
    // here. The email-alone counter accumulates across ALL those IPs, so the
    // delay still climbs to the cap despite the rotation.
    const perIpFresh = 1
    const accountUnderAttack = 200
    expect(loginBackoffMs(perIpFresh)).toBe(0) // what the old design saw: nothing
    expect(chooseLoginDelay({ emailIpFailures: perIpFresh, acctFailures: accountUnderAttack })).toBe(3000)
  })

  it('REDIS-DOWN CASE: counters fail open to 0 → no delay, logins not blocked', () => {
    // Both counters live in Redis and fail open to 0 during an outage, so the
    // delay is 0 — a Redis hiccup must NEVER lock the platform. Documented
    // posture: during an outage bcrypt's cost + Sentry alerting are the only
    // online protection; there is intentionally NO DB-backed per-account
    // backstop, because it would have to run after the account lookup and would
    // reintroduce the account-existence timing oracle this flow eliminates.
    expect(chooseLoginDelay({ emailIpFailures: 0, acctFailures: 0 })).toBe(0)
  })
})

describe('timing equalisation closes the enumeration oracle', () => {
  // The real defence is that authorize() always runs a bcrypt comparison.
  // These assert the property that makes it work: comparing against the dummy
  // hash costs the same as comparing against a real one, so a missing account
  // cannot be identified by how fast the answer comes back.
  const DUMMY = '$2b$10$HQXUHTUqbVnsUDbmJ2FntujkpTAfoN3pJnn1dRrpO9izQnc4FGtYW'

  it('the dummy hash is a valid bcrypt hash of the same cost', () => {
    expect(DUMMY).toMatch(/^\$2[aby]\$10\$/)
  })

  it('never matches a submitted password', async () => {
    for (const attempt of ['password', '', 'admin', DUMMY]) {
      expect(await bcrypt.compare(attempt, DUMMY)).toBe(false)
    }
  })

  it('costs the same as comparing against a real hash', async () => {
    const real = await bcrypt.hash('a-real-password', 10)

    const time = async (hash: string) => {
      const start = performance.now()
      await bcrypt.compare('some-guess', hash)
      return performance.now() - start
    }

    // Median of several runs — a single sample is too noisy to judge.
    const samples = 5
    const realTimes: number[] = []
    const dummyTimes: number[] = []
    for (let i = 0; i < samples; i++) {
      realTimes.push(await time(real))
      dummyTimes.push(await time(DUMMY))
    }
    const median = (xs: number[]) => xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)]

    const realMedian = median(realTimes)
    const dummyMedian = median(dummyTimes)
    const ratio = Math.max(realMedian, dummyMedian) / Math.min(realMedian, dummyMedian)

    // The old gap was ~2ms vs ~100ms — a 50x tell. Same cost factor should be
    // within noise; 2x is a generous bound for a loaded CI machine.
    expect(ratio).toBeLessThan(2)
  })
})

describe('authorize() wiring', () => {
  // Behavioural coverage of authorize() needs a live NextAuth request; these
  // assert the structural properties that make the fixes real.
  const fs = require('fs') as typeof import('fs')
  const path = require('path') as typeof import('path')
  const whole = fs
    .readFileSync(path.join(__dirname, '..', 'lib/auth.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

  // Scope to authorize(). The file also contains getCreatorStatus(), whose own
  // findUnique sits ABOVE authorize — searching the whole file would compare
  // positions across two unrelated functions and prove nothing.
  const src = whole.slice(whole.indexOf('async authorize('))

  it('no longer hard-locks an account', () => {
    expect(src).not.toMatch(/throw new Error\('locked'\)/)
    expect(src).not.toMatch(/lockedUntil:\s*new Date\(Date\.now\(\)/)
  })

  it('per-account pressure is a Redis-keyed delay, not the old dead DB column', () => {
    // failedLoginAttempts + lockedUntil were dead (written, never read to lock).
    // Removed. Per-account pressure now lives in the (email-alone) Redis
    // counter, and Redis INCR is atomic (the DB counter's read-modify-write was
    // the concurrency bug this replaces).
    expect(src).toMatch(/acctKey\s*=\s*`login-acct:\$\{emailKey\}`/)
    expect(src).not.toMatch(/failedLoginAttempts/)
    expect(src).not.toMatch(/lockedUntil/)
  })

  it('per-account backstop is a DELAY, never a per-account deny (no lockout weapon)', () => {
    // login-acct is used with the backoff helpers (delay), never rateLimit
    // (deny). A per-account deny would be the old account-lockout DoS.
    expect(src).not.toMatch(/rateLimit\(`login-acct/)
  })

  it('always reaches bcrypt.compare, even with no account', () => {
    const compareAt = src.indexOf('bcrypt.compare')
    const guardAt = src.indexOf('if (!creator || !passwordMatch)')
    expect(compareAt).toBeGreaterThan(-1)
    // The early `if (!creator) return null` must not precede the comparison.
    expect(guardAt).toBeGreaterThan(compareAt)
    expect(src).toMatch(/DUMMY_PASSWORD_HASH/)
  })

  it('counts failures for unknown addresses too, on BOTH counters', () => {
    // Otherwise the delay itself reveals which addresses are real. Both the
    // (email+ip) and the (email-alone) counter are bumped unconditionally in
    // the failure path — no per-account-existence guard gates them.
    const guardAt = src.indexOf('if (!creator || !passwordMatch)')
    const block = src.slice(guardAt, src.indexOf('return null', guardAt))
    expect(block).toMatch(/bumpFailureCount\(backoffKey/)
    expect(block).toMatch(/bumpFailureCount\(acctKey/)
    expect(block).not.toMatch(/if \(creator\)/)
  })

  it('delays before the account lookup, so timing is uniform', () => {
    const delayAt = src.indexOf('setTimeout')
    const lookupAt = src.indexOf('prisma.creator.findUnique')
    expect(delayAt).toBeGreaterThan(-1)
    expect(delayAt).toBeLessThan(lookupAt)
  })

  it('keys backoff on email AND ip, not email alone', () => {
    expect(src).toMatch(/backoffKey\s*=\s*`login:\$\{emailKey\}:\$\{ip\}`/)
  })

  it('has no per-email deny, which would be the lockout bug again', () => {
    expect(src).not.toMatch(/rateLimit\(`login-email/)
  })
})

describe('sign-in page gives one generic message', () => {
  const fs = require('fs') as typeof import('fs')
  const path = require('path') as typeof import('path')
  // Comments stripped: the file explains WHY the locked message was removed,
  // and that prose would otherwise satisfy a "must not contain" assertion.
  const page = fs
    .readFileSync(path.join(__dirname, '..', 'app/(auth)/sign-in/page.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

  it('no longer tells anyone an account is locked', () => {
    // Only a registered address could ever produce that message.
    expect(page).not.toMatch(/account is locked/i)
    expect(page).not.toMatch(/result\.error === "locked"/)
  })

  it('uses one message for wrong password and unknown address', () => {
    expect(page).toMatch(/Invalid email or password/)
  })
})
