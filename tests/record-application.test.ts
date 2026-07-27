import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

/**
 * M2 hardening for /api/record-application: single-use receipts and
 * slug-based de-duplication. The route is unauthenticated (gated by a signed
 * receipt), so without these a creator who reads their own receipt out of the
 * portal form could loop it to spam CampaignApplication rows.
 *
 * The single-use mechanism (a RedeemedReceipt row keyed by the receipt's jti,
 * with a unique PK) is exercised directly against the DB here; the wiring test
 * below confirms the route applies it. DB tests skip without DIRECT_URL.
 */

const hasDb = Boolean(process.env.DIRECT_URL || process.env.DATABASE_URL)
const prisma = hasDb
  ? new PrismaClient({
      adapter: new PrismaPg({ connectionString: (process.env.DIRECT_URL || process.env.DATABASE_URL)!, max: 1 }),
    })
  : (null as unknown as PrismaClient)

describe.skipIf(!hasDb)('single-use receipt redemption (integration)', () => {
  const jtis: string[] = []
  const uniq = () => {
    const j = `vitest-${Date.now()}-${Math.random().toString(36).slice(2)}`
    jtis.push(j)
    return j
  }

  afterAll(async () => {
    await prisma.redeemedReceipt.deleteMany({ where: { jti: { in: jtis } } })
    await prisma.$disconnect()
  })

  it('a jti can be redeemed once; the second attempt collides (P2002)', async () => {
    const jti = uniq()
    const expiresAt = new Date(Date.now() + 60_000)

    await prisma.redeemedReceipt.create({ data: { jti, expiresAt } })

    // The replay: same jti again must violate the unique primary key.
    await expect(
      prisma.redeemedReceipt.create({ data: { jti, expiresAt } }),
    ).rejects.toMatchObject({ code: 'P2002' })
  })

  it('purge removes only expired rows', async () => {
    const live = uniq()
    const dead = uniq()
    await prisma.redeemedReceipt.create({ data: { jti: live, expiresAt: new Date(Date.now() + 60_000) } })
    await prisma.redeemedReceipt.create({ data: { jti: dead, expiresAt: new Date(Date.now() - 60_000) } })

    await prisma.redeemedReceipt.deleteMany({ where: { expiresAt: { lt: new Date() } } })

    expect(await prisma.redeemedReceipt.findUnique({ where: { jti: live } })).not.toBeNull()
    expect(await prisma.redeemedReceipt.findUnique({ where: { jti: dead } })).toBeNull()
  })
})

describe('record-application route applies the M2 controls', () => {
  const src = fs
    .readFileSync(path.join(__dirname, '..', 'app/api/record-application/route.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

  it('rate-limits by the creator id in the receipt, not just IP', () => {
    expect(src).toMatch(/record-application-cid:\$\{creatorId\}/)
  })

  it('records the jti for single use and rejects a replay as 409', () => {
    expect(src).toMatch(/redeemedReceipt\.create/)
    expect(src).toMatch(/'P2002'/)
    expect(src).toMatch(/status:\s*409/)
  })

  it('de-duplicates on campaignSlug, not free-text campaignName', () => {
    // The name-only dedup was defeated by changing one character.
    expect(src).toMatch(/campaignSlug:\s*slug/)
    expect(src).toMatch(/slug\s*\?/) // slug-first branch
  })

  it('redeems inside a transaction so the jti and the row commit together', () => {
    expect(src).toMatch(/\$transaction/)
    const txAt = src.indexOf('$transaction')
    const createAt = src.indexOf('campaignApplication.create')
    expect(txAt).toBeGreaterThan(-1)
    expect(createAt).toBeGreaterThan(txAt)
  })
})
