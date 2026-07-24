import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { loginBackoffMs } from '@/lib/auth'

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

const hasDb = Boolean(process.env.DIRECT_URL || process.env.DATABASE_URL)

const prisma = hasDb
  ? new PrismaClient({
      adapter: new PrismaPg({
        connectionString: (process.env.DIRECT_URL || process.env.DATABASE_URL)!,
        max: 10,
      }),
    })
  : (null as unknown as PrismaClient)

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

describe.skipIf(!hasDb)('atomic failure counter (integration)', () => {
  let id = ''

  beforeAll(async () => {
    const row = await prisma.creator.create({
      data: {
        email: `vitest-login-${Date.now()}-${Math.random().toString(36).slice(2)}@example.invalid`,
        firstName: 'Vitest',
        lastName: 'Login',
        passwordHash: 'x',
      },
      select: { id: true },
    })
    id = row.id
  })

  afterAll(async () => {
    if (id) {
      await prisma.auditLog.deleteMany({ where: { actorId: id } })
      await prisma.creator.delete({ where: { id } }).catch(() => {})
    }
    await prisma.$disconnect()
  })

  it('THE REGRESSION: 50 concurrent increments all land', async () => {
    await prisma.creator.update({ where: { id }, data: { failedLoginAttempts: 0 } })

    await Promise.all(
      Array.from({ length: 50 }, () =>
        prisma.creator.update({
          where: { id },
          data: { failedLoginAttempts: { increment: 1 } },
        }),
      ),
    )

    const after = await prisma.creator.findUnique({
      where: { id },
      select: { failedLoginAttempts: true },
    })
    // Measured against the old read-modify-write, this came back as 1.
    expect(after?.failedLoginAttempts).toBe(50)
  })

  it('read-modify-write loses updates — why increment is required', async () => {
    await prisma.creator.update({ where: { id }, data: { failedLoginAttempts: 0 } })

    await Promise.all(
      Array.from({ length: 50 }, async () => {
        const row = await prisma.creator.findUnique({
          where: { id },
          select: { failedLoginAttempts: true },
        })
        return prisma.creator.update({
          where: { id },
          data: { failedLoginAttempts: (row?.failedLoginAttempts ?? 0) + 1 },
        })
      }),
    )

    const after = await prisma.creator.findUnique({
      where: { id },
      select: { failedLoginAttempts: true },
    })
    // Demonstrates the defect rather than asserting an exact number, since
    // how many are lost depends on scheduling. The point is: not all of them.
    expect(after?.failedLoginAttempts).toBeLessThan(50)
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

  it('uses the atomic increment, not read-modify-write', () => {
    expect(src).toMatch(/failedLoginAttempts:\s*\{\s*increment:\s*1\s*\}/)
    expect(src).not.toMatch(/creator\.failedLoginAttempts\s*\+\s*1/)
  })

  it('always reaches bcrypt.compare, even with no account', () => {
    const compareAt = src.indexOf('bcrypt.compare')
    const guardAt = src.indexOf('if (!creator || !passwordMatch)')
    expect(compareAt).toBeGreaterThan(-1)
    // The early `if (!creator) return null` must not precede the comparison.
    expect(guardAt).toBeGreaterThan(compareAt)
    expect(src).toMatch(/DUMMY_PASSWORD_HASH/)
  })

  it('counts failures for unknown addresses too', () => {
    // Otherwise the backoff itself reveals which addresses are real.
    const block = src.slice(src.indexOf('if (!creator || !passwordMatch)'))
    const bumpAt = block.indexOf('bumpFailureCount')
    const creatorGuardAt = block.indexOf('if (creator)')
    expect(bumpAt).toBeGreaterThan(-1)
    expect(bumpAt).toBeLessThan(creatorGuardAt)
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
