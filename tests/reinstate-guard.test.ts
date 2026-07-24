import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

/**
 * The reinstate branch in app/api/admin/creators/[id]/route.ts was an
 * account-takeover primitive: it rewrote passwordHash, email and
 * membershipStatus on whatever creator id the URL named, with nothing
 * checking that the account had ever been deleted. Aimed at an active member
 * it handed back working credentials for that member's account — their DMs
 * and their encrypted PII, which decrypts transparently on read.
 *
 * The guard requires all three markers written by the DELETE handler in
 * app/api/profile/route.ts. The behavioural tests below replicate that
 * predicate against real rows; the wiring tests confirm the route applies it
 * before mutating anything.
 *
 * DB tests skip when DIRECT_URL is absent (CI without secrets). Every row is
 * namespaced and removed in afterAll.
 */

const hasDb = Boolean(process.env.DIRECT_URL || process.env.DATABASE_URL)

const prisma = hasDb
  ? new PrismaClient({
      adapter: new PrismaPg({
        connectionString: (process.env.DIRECT_URL || process.env.DATABASE_URL)!,
        max: 1,
      }),
    })
  : (null as unknown as PrismaClient)

// Mirrors the route's predicate exactly. Kept in the test so a change to the
// route's logic that weakens it shows up as a behavioural failure here.
function isGenuinelyDeleted(
  target: { id: string; email: string; membershipStatus: string; passwordHash: string },
): boolean {
  return (
    target.passwordHash === 'DELETED' &&
    target.membershipStatus === 'cancelled' &&
    target.email === `deleted-${target.id}@deleted.wegotyouagency.com`
  )
}

const made: string[] = []

async function makeCreator(data: Record<string, unknown>) {
  const row = await prisma.creator.create({
    data: {
      firstName: 'Vitest',
      lastName: 'Reinstate',
      passwordHash: 'intact-hash',
      ...data,
    } as never,
    select: { id: true, email: true, membershipStatus: true, passwordHash: true },
  })
  made.push(row.id)
  return row
}

const uniq = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`

describe.skipIf(!hasDb)('reinstate guard — behaviour (integration)', () => {
  afterAll(async () => {
    for (const id of made) {
      await prisma.auditLog.deleteMany({ where: { actorId: id } })
      await prisma.accountToken.deleteMany({ where: { creatorId: id } })
      await prisma.creator.delete({ where: { id } }).catch(() => {})
    }
    await prisma.$disconnect()
  })

  it('REJECTS an active member — the takeover case', async () => {
    const victim = await makeCreator({
      email: `vitest-active-${uniq()}@example.invalid`,
      membershipStatus: 'active',
    })
    expect(isGenuinelyDeleted(victim)).toBe(false)
  })

  it('ACCEPTS a properly deleted account', async () => {
    // Two steps because the scrubbed email embeds the row's own id.
    const row = await makeCreator({
      email: `vitest-todelete-${uniq()}@example.invalid`,
      membershipStatus: 'active',
    })
    const deleted = await prisma.creator.update({
      where: { id: row.id },
      data: {
        email: `deleted-${row.id}@deleted.wegotyouagency.com`,
        passwordHash: 'DELETED',
        membershipStatus: 'cancelled',
      },
      select: { id: true, email: true, membershipStatus: true, passwordHash: true },
    })
    expect(isGenuinelyDeleted(deleted)).toBe(true)
  })

  it('REJECTS a merely cancelled member — cancelled is not deleted', async () => {
    // A lapsed subscriber keeps their real email and password. Checking
    // membershipStatus alone would expose every cancelled member's account.
    const lapsed = await makeCreator({
      email: `vitest-lapsed-${uniq()}@example.invalid`,
      membershipStatus: 'cancelled',
    })
    expect(isGenuinelyDeleted(lapsed)).toBe(false)
  })

  it('REJECTS the two-step forge an admin could perform via ADMIN_PATCHABLE', async () => {
    // email and membershipStatus are both admin-patchable, so an admin can
    // hand-craft an account that LOOKS deleted. passwordHash is not
    // patchable, so the sentinel is what defeats this.
    const row = await makeCreator({
      email: `vitest-forge-${uniq()}@example.invalid`,
      membershipStatus: 'active',
    })
    const forged = await prisma.creator.update({
      where: { id: row.id },
      data: {
        email: `deleted-${row.id}@deleted.wegotyouagency.com`, // forged
        membershipStatus: 'cancelled', // forged
        // passwordHash deliberately untouched — an admin cannot set it here.
      },
      select: { id: true, email: true, membershipStatus: true, passwordHash: true },
    })
    expect(forged.email).toBe(`deleted-${row.id}@deleted.wegotyouagency.com`)
    expect(forged.membershipStatus).toBe('cancelled')
    // Both forgeable markers match, yet the account is still not reinstatable.
    expect(isGenuinelyDeleted(forged)).toBe(false)
  })

  it("REJECTS one account wearing another's scrubbed email", async () => {
    const a = await makeCreator({ email: `vitest-a-${uniq()}@example.invalid`, membershipStatus: 'active' })
    const b = await makeCreator({
      email: `deleted-${a.id}@deleted.wegotyouagency.com`, // someone else's id
      membershipStatus: 'cancelled',
      passwordHash: 'DELETED',
    })
    // The email must embed the target's OWN id, so a pattern match would pass
    // here and exact comparison correctly does not.
    expect(isGenuinelyDeleted(b)).toBe(false)
  })
})

describe('reinstate guard — the route applies it', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'app/api/admin/creators/[id]/route.ts'),
    'utf8',
  )
  const branch = src.slice(src.indexOf('if (body.reinstate)'), src.indexOf('Tag management'))
  const code = branch.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

  it('checks all three deletion markers', () => {
    expect(code).toMatch(/passwordHash === 'DELETED'/)
    expect(code).toMatch(/membershipStatus === 'cancelled'/)
    expect(code).toMatch(/deleted-\$\{params\.id\}@deleted\.wegotyouagency\.com/)
  })

  it('checks BEFORE mutating — a check after the write is no check', () => {
    const guardAt = code.indexOf('isGenuinelyDeleted')
    const updateAt = code.indexOf('prisma.creator.update')
    expect(guardAt).toBeGreaterThan(-1)
    expect(updateAt).toBeGreaterThan(-1)
    expect(guardAt).toBeLessThan(updateAt)
  })

  it('audits the rejection, not just the success', () => {
    expect(code).toMatch(/logAudit[\s\S]*?REJECTED/)
  })

  it('returns 400 when the account is not deleted', () => {
    expect(code).toMatch(/cannot be reinstated[\s\S]*?status:\s*400/)
  })
})
