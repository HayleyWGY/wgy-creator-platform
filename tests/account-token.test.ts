import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

/**
 * Integration tests for the admin setup-link flow against a real database.
 *
 * These exercise the security properties that matter:
 *   - the raw token is never stored
 *   - a link works exactly once
 *   - expiry is enforced
 *   - re-issuing invalidates the previous link
 *
 * Skipped when DIRECT_URL is absent (e.g. CI without secrets). Every row
 * created is namespaced and removed in afterAll.
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

// A throwaway creator this suite owns outright.
const testEmail = `vitest-token-${Date.now()}-${Math.random().toString(36).slice(2)}@example.invalid`
let creatorId = ''

describe.skipIf(!hasDb)('account setup tokens (integration)', () => {
  beforeAll(async () => {
    const created = await prisma.creator.create({
      data: {
        email: testEmail,
        firstName: 'Vitest',
        lastName: 'Token',
        passwordHash: 'x',
        passwordSetAt: null,
      },
      select: { id: true },
    })
    creatorId = created.id
  })

  afterAll(async () => {
    if (creatorId) {
      await prisma.accountToken.deleteMany({ where: { creatorId } })
      await prisma.creator.delete({ where: { id: creatorId } })
    }
    await prisma.$disconnect()
  })

  it('stores only a hash — the raw token never reaches the database', async () => {
    const { createAccountToken } = await import('@/lib/account-token')
    const raw = await createAccountToken(creatorId, 'admin_setup')

    const rows = await prisma.accountToken.findMany({ where: { creatorId } })
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row.tokenHash).not.toBe(raw)
    }
    // It is specifically SHA-256 of the raw value.
    const expected = crypto.createHash('sha256').update(raw).digest('hex')
    expect(rows.some(r => r.tokenHash === expected)).toBe(true)
  })

  it('redeems exactly once — a replayed link is refused', async () => {
    const { createAccountToken, consumeAccountToken } = await import('@/lib/account-token')
    const raw = await createAccountToken(creatorId, 'admin_setup')

    expect(await consumeAccountToken(raw, 'admin_setup')).toBe(creatorId)
    // THE PROPERTY: the same link must not work a second time.
    expect(await consumeAccountToken(raw, 'admin_setup')).toBeNull()
  })

  it('refuses an expired link', async () => {
    const { createAccountToken, consumeAccountToken, peekAccountToken } = await import('@/lib/account-token')
    const raw = await createAccountToken(creatorId, 'admin_setup', -1000) // already expired

    expect(await peekAccountToken(raw, 'admin_setup')).toBeNull()
    expect(await consumeAccountToken(raw, 'admin_setup')).toBeNull()
  })

  it('re-issuing invalidates the previous link', async () => {
    const { createAccountToken, consumeAccountToken } = await import('@/lib/account-token')
    const first = await createAccountToken(creatorId, 'admin_setup')
    const second = await createAccountToken(creatorId, 'admin_setup')

    // Two live links to one account would double the attack surface.
    expect(await consumeAccountToken(first, 'admin_setup')).toBeNull()
    expect(await consumeAccountToken(second, 'admin_setup')).toBe(creatorId)
  })

  it('will not redeem a token issued for a different purpose', async () => {
    const { createAccountToken, consumeAccountToken } = await import('@/lib/account-token')
    const raw = await createAccountToken(creatorId, 'password_reset')

    expect(await consumeAccountToken(raw, 'admin_setup')).toBeNull()
    expect(await consumeAccountToken(raw, 'password_reset')).toBe(creatorId)
  })

  it('rejects rubbish input without throwing', async () => {
    const { consumeAccountToken, peekAccountToken } = await import('@/lib/account-token')
    for (const bad of ['', 'not-a-token', null, undefined, 42, {}]) {
      expect(await peekAccountToken(bad, 'admin_setup')).toBeNull()
      expect(await consumeAccountToken(bad, 'admin_setup')).toBeNull()
    }
  })
})
