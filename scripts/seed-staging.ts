import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'
import { encryptField } from '../lib/field-crypto'

/**
 * STAGING seed — fills a SEPARATE staging database with realistic FAKE data for
 * load testing and breakage testing. Everything is obviously fake (@staging.test
 * emails, "Test" names). Idempotent: it TRUNCATEs every table and rebuilds, so
 * re-running gives the same clean dataset.
 *
 *   npm run seed:staging        (see package.json — sets the staging URLs)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SAFETY: this script refuses to run unless the database URL points at the known
 * STAGING Supabase project. It TRUNCATEs everything, so it must NEVER touch
 * production. The guard below is the last line of defence — do not weaken it.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// The staging Supabase project ref. The connection URL MUST contain this, or the
// script aborts. Production has a different ref, so a prod URL can never pass.
const STAGING_DB_REF = 'ffbaencyqdcmawgueztf'

const DB_URL = process.env.DIRECT_URL || process.env.DATABASE_URL || ''

function assertStagingDb(): string {
  if (!DB_URL) {
    throw new Error('No DIRECT_URL/DATABASE_URL set — refusing to run.')
  }
  if (!DB_URL.includes(STAGING_DB_REF)) {
    // Do NOT print the URL (it carries a password); print only the host.
    const host = DB_URL.replace(/^.*@/, '').replace(/\/.*$/, '')
    throw new Error(
      `\n🛑 REFUSING TO SEED: the database URL does not point at the staging ` +
        `project (${STAGING_DB_REF}).\n   Target host was: ${host}\n   This script ` +
        `TRUNCATEs every table and must only ever run against staging.\n`,
    )
  }
  return DB_URL
}

const url = assertStagingDb()
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url, max: 1 }) })

// ── deterministic helpers ──────────────────────────────────────────────────
const now = Date.now()
const DAY = 24 * 60 * 60 * 1000
const pick = <T>(arr: T[], i: number): T => arr[i % arr.length]
const rand = (n: number) => Math.floor(Math.random() * n)
const daysAgo = (d: number) => new Date(now - d * DAY)
const id = (prefix: string, n: number) => `stg-${prefix}-${String(n).padStart(5, '0')}`

const FIRST = ['Ava', 'Mia', 'Zoe', 'Leo', 'Kai', 'Ivy', 'Max', 'Nia', 'Jae', 'Ola', 'Sam', 'Ruby', 'Theo', 'Elle', 'Finn']
const LAST = ['Test', 'Fake', 'Demo', 'Sample', 'Mock', 'Staging']
const CITIES = ['London', 'Manchester', 'Leeds', 'Bristol', 'Glasgow', 'Cardiff']
const NICHES = ['fashion', 'beauty', 'fitness', 'food', 'travel', 'lifestyle', 'tech', 'parenting']
const BRANDS = ['GlowCo', 'FitFuel', 'UrbanThread', 'PurePlate', 'Wanderly', 'TechNest']

// Membership mix: mostly active, with real minorities to exercise the gated flows.
function membershipStatus(i: number): string {
  const r = i % 100
  if (r < 80) return 'active'
  if (r < 88) return 'payment_failed'
  if (r < 95) return 'cancelled'
  return 'paused'
}

const hasCryptoKey = Boolean(process.env.FIELD_ENCRYPTION_KEY)

async function truncateAll() {
  const rows = await prisma.$queryRawUnsafe<{ tablename: string }[]>(
    `select tablename from pg_tables where schemaname = 'public' and tablename <> '_prisma_migrations'`,
  )
  const names = rows.map(r => `"${r.tablename}"`).join(', ')
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`)
  console.log(`✓ Truncated ${rows.length} tables`)
}

async function seedSections() {
  const sections = [
    { slug: 'pr-gifted-campaigns', name: 'PR / Gifted Campaigns', group: 'OPPORTUNITIES', iconEmoji: '🤝', sortOrder: 1, sectionType: 'post_feed' },
    { slug: 'paid-collaborations', name: 'Paid Collaborations', group: 'OPPORTUNITIES', iconEmoji: '💰', sortOrder: 2, sectionType: 'post_feed' },
    { slug: 'events', name: 'Events', group: 'OPPORTUNITIES', iconEmoji: '🎪', sortOrder: 3, sectionType: 'post_feed' },
    { slug: 'news-updates', name: 'News & Updates', group: 'WELCOME', iconEmoji: '📢', sortOrder: 1, sectionType: 'post_feed' },
    { slug: 'video-library', name: 'Video Library', group: 'LEARNING', iconEmoji: '🎬', sortOrder: 1, sectionType: 'post_feed' },
    { slug: 'social-tips', name: 'Social Tips', group: 'LEARNING', iconEmoji: '💡', sortOrder: 2, sectionType: 'post_feed' },
  ]
  await prisma.section.createMany({ data: sections })
  const created = await prisma.section.findMany({ select: { id: true, slug: true, group: true } })
  console.log(`✓ ${created.length} sections`)
  return created
}

async function seedAdmins() {
  // Known test password for every staging admin.
  const hash = bcrypt.hashSync('StagingAdmin1!', 10)
  const admins = [
    { id: id('admin', 1), email: 'owner@staging.test', firstName: 'Olivia', lastName: 'Owner' },
    { id: id('admin', 2), email: 'admin2@staging.test', firstName: 'Adam', lastName: 'Admin' },
    { id: id('admin', 3), email: 'admin3@staging.test', firstName: 'Aisha', lastName: 'Admin' },
  ]
  await prisma.creator.createMany({
    data: admins.map((a, i) => ({
      ...a,
      passwordHash: hash,
      isAdmin: true,
      membershipStatus: 'active',
      membershipType: 'paid',
      joinedAt: daysAgo(400 + i),
      lastSeenAt: daysAgo(0),
      passwordSetAt: daysAgo(400 + i),
    })),
  })
  console.log(`✓ ${admins.length} admins (password: StagingAdmin1!)`)
  return admins.map(a => a.id)
}

async function seedMembers(count: number) {
  // One shared bcrypt hash for all fake members — hashing 1,000 times would be
  // needlessly slow, and the password is fake test data anyway.
  const hash = bcrypt.hashSync('StagingMember1!', 10)
  const ids: string[] = []
  const batch: Record<string, unknown>[] = []

  for (let i = 1; i <= count; i++) {
    const mid = id('member', i)
    ids.push(mid)
    const first = pick(FIRST, i)
    const last = pick(LAST, i >> 2)
    const withProfile = i % 5 !== 0 // ~80% have some profile detail
    const withPii = hasCryptoKey && i % 7 === 0 // ~14% carry encrypted PII

    batch.push({
      id: mid,
      email: `member${String(i).padStart(4, '0')}@staging.test`,
      passwordHash: hash,
      firstName: first,
      lastName: last,
      membershipStatus: membershipStatus(i),
      membershipType: i % 11 === 0 ? 'free' : 'paid',
      joinedAt: daysAgo(rand(540)),
      lastSeenAt: daysAgo(rand(30)),
      firstApplyAt: i % 3 === 0 ? daysAgo(rand(120)) : null,
      bio: withProfile ? `Fake ${pick(NICHES, i)} creator #${i} — staging test account.` : null,
      instagramHandle: withProfile ? `@stg_${first.toLowerCase()}${i}` : null,
      city: withProfile ? pick(CITIES, i) : null,
      country: withProfile ? 'United Kingdom' : null,
      contentNiches: withProfile ? [pick(NICHES, i), pick(NICHES, i + 3)] : [],
      profileImageUrl: i % 4 === 0 ? `https://i.pravatar.cc/150?img=${(i % 70) + 1}` : null,
      // Encrypted-at-rest PII (only when the staging key is present).
      dateOfBirth: withPii ? encryptField(`19${80 + (i % 20)}-0${(i % 9) + 1}-1${i % 9}`) : null,
      address: withPii ? encryptField(`${i} Test Street, ${pick(CITIES, i)}`) : null,
      contactNumber: withPii ? encryptField(`0700${String(100000 + i).slice(0, 6)}`) : null,
      gender: withPii ? encryptField(pick(['female', 'male', 'non-binary', 'prefer not to say'], i)) : null,
    })
  }

  // createMany in chunks keeps a single statement from getting enormous.
  for (let i = 0; i < batch.length; i += 500) {
    await prisma.creator.createMany({ data: batch.slice(i, i + 500) as never })
  }
  const payingActive = ids.filter((_, i) => membershipStatus(i + 1) === 'active')
  console.log(`✓ ${count} members (password: StagingMember1!) — ${payingActive.length} active`)
  return ids
}

async function seedChatRooms(memberIds: string[], adminIds: string[]) {
  const rooms = [
    { id: id('room', 1), slug: 'general', name: 'General Chat', emoji: '💬', description: 'Say hello', sortOrder: 1 },
    { id: id('room', 2), slug: 'campaigns', name: 'Campaign Talk', emoji: '📸', description: 'Discuss live campaigns', sortOrder: 2 },
    { id: id('room', 3), slug: 'wins', name: 'Wins & Wooos', emoji: '🎉', description: 'Share your wins', sortOrder: 3 },
    { id: id('room', 4), slug: 'support', name: 'Help & Support', emoji: '🛟', description: 'Ask the team', sortOrder: 4 },
  ]
  await prisma.chatRoom.createMany({ data: rooms })

  const authors = [...memberIds, ...adminIds]
  const bodies = [
    'Just applied to the new campaign 🙌',
    'Has anyone worked with this brand before?',
    'Loving the app so far!',
    'When does the next drop go live?',
    'Thanks team, super helpful.',
    'My reel hit 20k views this week 🎉',
    'Quick question about deliverables…',
    'Count me in for the event!',
  ]

  const MESSAGES_PER_ROOM = 300
  const msgs: Record<string, unknown>[] = []
  for (const room of rooms) {
    for (let i = 0; i < MESSAGES_PER_ROOM; i++) {
      msgs.push({
        id: `${room.id}-msg-${String(i).padStart(4, '0')}`,
        roomId: room.id,
        authorId: authors[rand(authors.length)],
        body: pick(bodies, i + rand(3)),
        // Spread over ~60 days, oldest first, so pagination has real history.
        createdAt: daysAgo(60 - (i * 60) / MESSAGES_PER_ROOM),
      })
    }
  }
  for (let i = 0; i < msgs.length; i += 500) {
    await prisma.chatMessage.createMany({ data: msgs.slice(i, i + 500) as never })
  }
  console.log(`✓ ${rooms.length} chat rooms, ${msgs.length} messages (${MESSAGES_PER_ROOM}/room)`)
}

async function seedCampaigns(sections: { id: string; slug: string; group: string }[], adminIds: string[]) {
  const oppSections = sections.filter(s => s.group === 'OPPORTUNITIES')
  const author = adminIds[0]
  const posts: Record<string, unknown>[] = []
  for (let i = 1; i <= 30; i++) {
    const published = i % 4 !== 0 // ~75% published, rest draft
    const section = pick(oppSections, i)
    posts.push({
      id: id('post', i),
      sectionId: section.id,
      authorId: author,
      title: `${pick(BRANDS, i)} ${pick(['Gifted', 'Paid', 'Ambassador'], i)} Campaign #${i}`,
      body: `Fake campaign brief #${i} for staging. Deliverables: 1 Reel + 3 Stories.`,
      brandName: pick(BRANDS, i),
      postType: 'campaign',
      campaignType: pick(['pr-gifted', 'paid', 'events'], i),
      status: published ? 'published' : 'draft',
      publishedAt: published ? daysAgo(rand(90)) : null,
      spotsRemaining: rand(20),
      applyClicks: published ? rand(200) : 0,
    })
  }
  await prisma.post.createMany({ data: posts as never })
  console.log(`✓ ${posts.length} campaigns (Post)`)
}

async function seedContent(adminIds: string[]) {
  const author = adminIds[0]
  const rows: Record<string, unknown>[] = []
  for (let i = 1; i <= 15; i++) {
    const published = i % 5 !== 0
    rows.push({
      id: id('content', i),
      title: `Staging Guide #${i}: ${pick(['Growing on TikTok', 'Rate cards', 'Brand pitches', 'Lighting basics'], i)}`,
      contentType: pick(['video', 'article', 'workbook'], i),
      body: `Fake learning content #${i} for staging.`,
      section: pick(['video-library', 'social-tips'], i),
      authorId: author,
      status: published ? 'published' : 'draft',
      publishedAt: published ? daysAgo(rand(120)) : null,
      readingTimeMinutes: 2 + rand(8),
    })
  }
  await prisma.postContent.createMany({ data: rows as never })
  console.log(`✓ ${rows.length} content items (PostContent)`)
}

async function seedDmThreads(memberIds: string[], adminIds: string[]) {
  const admin = adminIds[0]
  const threadMembers = memberIds.slice(0, 60) // 60 members have a DM thread
  const threads = threadMembers.map((cid, i) => ({ id: id('dm', i + 1), creatorId: cid, updatedAt: daysAgo(rand(20)) }))
  await prisma.dmThread.createMany({ data: threads })

  const msgs: Record<string, unknown>[] = []
  threads.forEach((t, ti) => {
    const n = 3 + rand(8)
    for (let i = 0; i < n; i++) {
      const fromMember = i % 2 === 0
      msgs.push({
        id: `${t.id}-m-${i}`,
        threadId: t.id,
        senderId: fromMember ? t.creatorId : admin,
        body: fromMember ? 'Hi team, I have a question about my application.' : 'Hi! Happy to help — what do you need?',
        // Newest member message in ~1/3 of threads left unread, to populate the inbox badge.
        isRead: !(fromMember && i === n - 1 && ti % 3 === 0),
        createdAt: daysAgo(20 - i),
      })
    }
  })
  await prisma.dmMessage.createMany({ data: msgs as never })
  console.log(`✓ ${threads.length} DM threads, ${msgs.length} messages`)
}

async function main() {
  console.log(`\nSeeding STAGING db at host: ${url.replace(/^.*@/, '').replace(/\/.*$/, '')}`)
  console.log(`Encrypted PII: ${hasCryptoKey ? 'ENABLED (FIELD_ENCRYPTION_KEY present)' : 'skipped (no key)'}\n`)

  await truncateAll()
  const sections = await seedSections()
  const adminIds = await seedAdmins()
  const memberIds = await seedMembers(1000)
  await seedChatRooms(memberIds, adminIds)
  await seedCampaigns(sections, adminIds)
  await seedContent(adminIds)
  await seedDmThreads(memberIds, adminIds)

  console.log('\n✅ Staging seed complete.\n')
  console.log('   Admin login:  owner@staging.test / StagingAdmin1!')
  console.log('   Member login: member0001@staging.test / StagingMember1!\n')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
