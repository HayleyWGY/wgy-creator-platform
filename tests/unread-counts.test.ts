import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

/**
 * The unread endpoint did one COUNT per room (N+1). It now does one grouped
 * query with an OR of per-room lastReadAt cutoffs. This proves the grouped
 * result is IDENTICAL to the old per-room counts across the scenarios that
 * matter: never read, partially read, fully read, and own-messages-only.
 *
 * Runs against the real DB (skips without DIRECT_URL). Everything created is
 * namespaced and removed in afterAll.
 */

const hasDb = Boolean(process.env.DIRECT_URL || process.env.DATABASE_URL)
const prisma = hasDb
  ? new PrismaClient({
      adapter: new PrismaPg({ connectionString: (process.env.DIRECT_URL || process.env.DATABASE_URL)!, max: 1 }),
    })
  : (null as unknown as PrismaClient)

const tag = `vitest-unread-${Date.now()}-${Math.random().toString(36).slice(2)}`
const ids: { creators: string[]; rooms: string[] } = { creators: [], rooms: [] }
let me = ''
let other = ''

// The OLD implementation, kept verbatim as the oracle to diff against.
async function oldPerRoomCounts(creatorId: string, rooms: { id: string; slug: string }[]) {
  const reads = await prisma.chatRoomRead.findMany({ where: { creatorId }, select: { roomId: true, lastReadAt: true } })
  const lastReadByRoom = new Map(reads.map(r => [r.roomId, r.lastReadAt]))
  const entries = await Promise.all(
    rooms.map(async room => {
      const lastReadAt = lastReadByRoom.get(room.id)
      const count = await prisma.chatMessage.count({
        where: {
          roomId: room.id,
          isDeleted: false,
          authorId: { not: creatorId },
          ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
        },
      })
      return [room.slug, count] as const
    }),
  )
  return Object.fromEntries(entries)
}

// The NEW implementation's core (mirrors the route).
async function newGroupedCounts(creatorId: string, rooms: { id: string; slug: string }[]) {
  const reads = await prisma.chatRoomRead.findMany({ where: { creatorId }, select: { roomId: true, lastReadAt: true } })
  const lastReadByRoom = new Map(reads.map(r => [r.roomId, r.lastReadAt]))
  const perRoom = rooms.map(room => {
    const lastReadAt = lastReadByRoom.get(room.id)
    return lastReadAt ? { roomId: room.id, createdAt: { gt: lastReadAt } } : { roomId: room.id }
  })
  const grouped = await prisma.chatMessage.groupBy({
    by: ['roomId'],
    where: { isDeleted: false, authorId: { not: creatorId }, OR: perRoom },
    _count: { _all: true },
  })
  const countByRoom = new Map(grouped.map(g => [g.roomId, g._count._all]))
  return Object.fromEntries(rooms.map(r => [r.slug, countByRoom.get(r.id) ?? 0]))
}

describe.skipIf(!hasDb)('unread counts: grouped query matches per-room counts', () => {
  let rooms: { id: string; slug: string }[] = []

  beforeAll(async () => {
    const mk = async (suffix: string) =>
      (await prisma.creator.create({
        data: { email: `${tag}-${suffix}@example.invalid`, firstName: 'U', lastName: suffix, passwordHash: 'x' },
        select: { id: true },
      })).id
    me = await mk('me')
    other = await mk('other')
    ids.creators.push(me, other)

    const t0 = new Date(Date.now() - 60 * 60 * 1000) // an hour ago, before any lastReadAt we set

    // Four rooms, one per scenario.
    for (const slug of ['never', 'partial', 'fully', 'ownonly']) {
      const room = await prisma.chatRoom.create({
        data: { slug: `${tag}-${slug}`, name: slug, emoji: '💬', description: '', isActive: true },
        select: { id: true, slug: true },
      })
      ids.rooms.push(room.id)
      rooms.push(room)
    }
    const [never, partial, fully, ownonly] = rooms

    const msg = async (roomId: string, authorId: string, at: Date) =>
      prisma.chatMessage.create({ data: { roomId, authorId, body: 'hi', createdAt: at } })

    // never-read: 3 messages from `other`, no read record → all 3 unread.
    await msg(never.id, other, t0); await msg(never.id, other, t0); await msg(never.id, other, t0)
    // deleted + own message here must NOT count.
    await prisma.chatMessage.create({ data: { roomId: never.id, authorId: other, body: 'x', isDeleted: true, createdAt: t0 } })
    await msg(never.id, me, t0)

    // partially-read: read record at t0; 2 before (read), 2 after (unread).
    await msg(partial.id, other, new Date(t0.getTime() - 10_000))
    await msg(partial.id, other, new Date(t0.getTime() - 10_000))
    await prisma.chatRoomRead.create({ data: { creatorId: me, roomId: partial.id, lastReadAt: t0 } })
    await msg(partial.id, other, new Date(t0.getTime() + 10_000))
    await msg(partial.id, other, new Date(t0.getTime() + 10_000))

    // fully-read: read record AFTER all messages → 0 unread.
    await msg(fully.id, other, t0); await msg(fully.id, other, t0)
    await prisma.chatRoomRead.create({ data: { creatorId: me, roomId: fully.id, lastReadAt: new Date(t0.getTime() + 60_000) } })

    // own-only: only my own messages, never read → 0 unread (own excluded).
    await msg(ownonly.id, me, t0); await msg(ownonly.id, me, t0)
  })

  afterAll(async () => {
    await prisma.chatMessage.deleteMany({ where: { roomId: { in: ids.rooms } } })
    await prisma.chatRoomRead.deleteMany({ where: { creatorId: { in: ids.creators } } })
    await prisma.chatRoom.deleteMany({ where: { id: { in: ids.rooms } } })
    await prisma.creator.deleteMany({ where: { id: { in: ids.creators } } })
    await prisma.$disconnect()
  })

  it('produces the exact expected counts per scenario', async () => {
    const got = await newGroupedCounts(me, rooms)
    expect(got[`${tag}-never`]).toBe(3)
    expect(got[`${tag}-partial`]).toBe(2)
    expect(got[`${tag}-fully`]).toBe(0)
    expect(got[`${tag}-ownonly`]).toBe(0)
  })

  it('is identical to the old per-room implementation', async () => {
    const [oldCounts, newCounts] = await Promise.all([
      oldPerRoomCounts(me, rooms),
      newGroupedCounts(me, rooms),
    ])
    expect(newCounts).toEqual(oldCounts)
  })
})
