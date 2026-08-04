import { describe, it, expect, afterAll } from 'vitest'
import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

/**
 * /api/profile/apply-click counts a member's Apply tap against a campaign's
 * applyClicks metric (shown to admins) and marks the onboarding "first apply".
 *
 * The regression: it used to increment for ANY Post id the client sent — a
 * draft, a community post, or a made-up string — so the metric was trivially
 * inflatable. The fix only counts a click for a PUBLISHED post in an
 * OPPORTUNITIES section, and only then marks firstApplyAt.
 *
 * The source assertions lock the route's shape; the DB test proves the exact
 * validation predicate: a draft opportunity id must NOT increment. DB tests
 * skip without a database URL.
 */

describe('apply-click route only counts published opportunities', () => {
  const src = fs
    .readFileSync(path.join(__dirname, '..', 'app/api/profile/apply-click/route.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

  it('rate-limits by the creator id', () => {
    expect(src).toMatch(/apply-click:\$\{session\.user\.id\}/)
  })

  it('validates the id is a published post in an OPPORTUNITIES section', () => {
    expect(src).toMatch(/status:\s*'published'/)
    expect(src).toMatch(/section:\s*\{\s*group:\s*'OPPORTUNITIES'\s*\}/)
  })

  it('does not increment or mark onboarding for an invalid id', () => {
    // The early return must sit before both writes.
    const guardAt = src.indexOf('validCampaign')
    const firstApplyAt = src.indexOf('firstApplyAt: new Date()')
    const incrementAt = src.indexOf('applyClicks')
    expect(guardAt).toBeGreaterThan(-1)
    expect(firstApplyAt).toBeGreaterThan(guardAt)
    expect(incrementAt).toBeGreaterThan(guardAt)
  })
})

const hasDb = Boolean(process.env.DIRECT_URL || process.env.DATABASE_URL)
const prisma = hasDb
  ? new PrismaClient({
      adapter: new PrismaPg({ connectionString: (process.env.DIRECT_URL || process.env.DATABASE_URL)!, max: 1 }),
    })
  : (null as unknown as PrismaClient)

// The predicate the route uses to decide whether a click counts. Kept in sync
// with route.ts by the source assertions above.
const validCampaignWhere = (id: string) => ({
  id,
  status: 'published',
  section: { group: 'OPPORTUNITIES' as const },
})

describe.skipIf(!hasDb)('apply-click validation predicate (integration)', () => {
  const tag = `vitest-applyclick-${Date.now()}`
  const ids: { creator?: string; oppSection?: string; communitySection?: string; posts: string[] } = { posts: [] }

  afterAll(async () => {
    if (!hasDb) return
    if (ids.posts.length) await prisma.post.deleteMany({ where: { id: { in: ids.posts } } })
    if (ids.oppSection) await prisma.section.deleteMany({ where: { id: ids.oppSection } })
    if (ids.communitySection) await prisma.section.deleteMany({ where: { id: ids.communitySection } })
    if (ids.creator) await prisma.creator.deleteMany({ where: { id: ids.creator } })
    await prisma.$disconnect()
  })

  it('a DRAFT opportunity id does not match (would not increment); a published one does', async () => {
    const author = await prisma.creator.create({
      data: { email: `${tag}@example.com`, passwordHash: 'x', firstName: 'T', lastName: 'T' },
    })
    ids.creator = author.id

    const oppSection = await prisma.section.create({
      data: { name: 'Opps', slug: `${tag}-opps`, group: 'OPPORTUNITIES' },
    })
    ids.oppSection = oppSection.id
    const communitySection = await prisma.section.create({
      data: { name: 'Community', slug: `${tag}-comm`, group: 'COMMUNITY' },
    })
    ids.communitySection = communitySection.id

    const mkPost = (sectionId: string, status: string) =>
      prisma.post.create({
        data: { sectionId, authorId: author.id, title: 't', body: 'b', status },
      })

    const draftOpp = await mkPost(oppSection.id, 'draft')
    const publishedOpp = await mkPost(oppSection.id, 'published')
    const publishedCommunity = await mkPost(communitySection.id, 'published')
    ids.posts.push(draftOpp.id, publishedOpp.id, publishedCommunity.id)

    // THE CORE ASSERTION: a draft campaign id is not a valid apply target.
    expect(await prisma.post.findFirst({ where: validCampaignWhere(draftOpp.id), select: { id: true } })).toBeNull()
    // A published post outside OPPORTUNITIES is also rejected.
    expect(
      await prisma.post.findFirst({ where: validCampaignWhere(publishedCommunity.id), select: { id: true } }),
    ).toBeNull()
    // Only the published opportunity counts.
    expect(
      await prisma.post.findFirst({ where: validCampaignWhere(publishedOpp.id), select: { id: true } }),
    ).not.toBeNull()

    // And an increment scoped by the predicate leaves the draft's counter at 0.
    await prisma.post.updateMany({ where: validCampaignWhere(draftOpp.id), data: { applyClicks: { increment: 1 } } })
    expect((await prisma.post.findUnique({ where: { id: draftOpp.id } }))?.applyClicks).toBe(0)
  })
})
