import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { messagePageQuery, toChronologicalPage } from '@/lib/chat-pagination'

/**
 * Seeds a room with 101 messages and asserts the API's query returns the
 * NEWEST ones — the exact scenario the bug broke.
 *
 * Before the fix the routes used `orderBy: createdAt asc, take: 100`, which
 * returns the OLDEST 100. Message 101 (and every message after it) was written
 * to the database and never returned to anyone. The final assertion in the
 * first test reproduces that old query against the same data to prove this
 * suite would have caught it.
 *
 * Integration test against the real database; skipped without credentials.
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

const SEED_COUNT = 101
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`
const roomSlug = `test-room-${suffix}`
let roomId = ''
let authorId = ''

describe.skipIf(!hasDb)('chat messages pagination (database)', () => {
  beforeAll(async () => {
    const author = await prisma.creator.findFirst({ select: { id: true } })
    if (!author) throw new Error('No creator in the database to author test messages')
    authorId = author.id

    const room = await prisma.chatRoom.create({
      data: {
        slug: roomSlug,
        name: `Test Room ${suffix}`,
        emoji: '🧪',
        description: 'Temporary room for pagination tests',
      },
    })
    roomId = room.id

    // 101 messages, one second apart so ordering is unambiguous.
    const base = Date.now() - SEED_COUNT * 1000
    await prisma.chatMessage.createMany({
      data: Array.from({ length: SEED_COUNT }, (_, i) => ({
        roomId,
        authorId,
        body: `message ${i + 1}`,
        createdAt: new Date(base + i * 1000),
      })),
    })
  })

  afterAll(async () => {
    if (roomId) {
      await prisma.chatMessage.deleteMany({ where: { roomId } })
      await prisma.chatRoom.delete({ where: { id: roomId } }).catch(() => {})
    }
    await prisma.$disconnect()
  })

  it('returns the NEWEST messages, in chronological order', async () => {
    const limit = 50
    const rows = await prisma.chatMessage.findMany({
      where: { roomId, isDeleted: false },
      ...messagePageQuery(limit),
    })
    const { messages, hasMore } = toChronologicalPage(rows, limit)

    expect(messages).toHaveLength(limit)
    expect(hasMore).toBe(true)

    // The newest message must be present and last (chronological display).
    expect(messages[messages.length - 1].body).toBe(`message ${SEED_COUNT}`)
    // The page covers messages 52..101
    expect(messages[0].body).toBe(`message ${SEED_COUNT - limit + 1}`)
    // Message 1 is old history and must NOT be on the first page
    expect(messages.some(m => m.body === 'message 1')).toBe(false)

    // Ascending order within the page
    const times = messages.map(m => m.createdAt.getTime())
    expect([...times].sort((a, b) => a - b)).toEqual(times)

    // --- Proof this test catches the original bug -------------------------
    // The pre-fix query on the very same data: oldest-first + take.
    const oldQuery = await prisma.chatMessage.findMany({
      where: { roomId, isDeleted: false },
      orderBy: { createdAt: 'asc' },
      take: 100,
    })
    // It silently omits the newest message — that was the defect.
    expect(oldQuery.some(m => m.body === `message ${SEED_COUNT}`)).toBe(false)
    expect(oldQuery[0].body).toBe('message 1')
  })

  it('pages back through history with the cursor without repeating rows', async () => {
    const limit = 50

    const firstRows = await prisma.chatMessage.findMany({
      where: { roomId, isDeleted: false },
      ...messagePageQuery(limit),
    })
    const first = toChronologicalPage(firstRows, limit)

    // Page back from the oldest message currently shown.
    const cursor = first.messages[0].id
    const olderRows = await prisma.chatMessage.findMany({
      where: { roomId, isDeleted: false },
      ...messagePageQuery(limit, cursor),
    })
    const older = toChronologicalPage(olderRows, limit)

    expect(older.messages).toHaveLength(limit)
    // Messages 2..51 — strictly older, and the cursor row is not repeated
    expect(older.messages[older.messages.length - 1].body).toBe(`message ${SEED_COUNT - limit}`)
    const firstIds = new Set(first.messages.map(m => m.id))
    expect(older.messages.some(m => firstIds.has(m.id))).toBe(false)

    // One message (the oldest) remains beyond this page
    expect(older.hasMore).toBe(true)
  })
})
