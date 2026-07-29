import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveSession } from '@/lib/session'

// GET — unread message counts per community room for the current creator.
// A message is unread if it arrived after the creator's lastReadAt for that
// room (or ever, if they've never opened it), excluding their own messages.
export async function GET() {
  const session = await getActiveSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const [rooms, reads] = await Promise.all([
    prisma.chatRoom.findMany({
      where: { isActive: true },
      select: { id: true, slug: true },
    }),
    prisma.chatRoomRead.findMany({
      where: { creatorId: session.user.id },
      select: { roomId: true, lastReadAt: true },
    }),
  ])

  if (rooms.length === 0) return NextResponse.json({ unread: {} })

  const lastReadByRoom = new Map(reads.map(r => [r.roomId, r.lastReadAt]))

  // ONE grouped query instead of one COUNT per room (this endpoint is polled
  // by the community page). groupBy can't apply a different createdAt cutoff
  // per group in its own right, but its `where` can: an OR of per-room
  // conditions carries each room's own lastReadAt (or no cutoff at all when
  // the room was never opened → everything counts). Semantics are identical to
  // the previous per-room counts: unread = arrived after this member's
  // lastReadAt for that room, or ever if never opened, excluding own messages.
  const perRoom = rooms.map(room => {
    const lastReadAt = lastReadByRoom.get(room.id)
    return lastReadAt
      ? { roomId: room.id, createdAt: { gt: lastReadAt } }
      : { roomId: room.id }
  })

  const grouped = await prisma.chatMessage.groupBy({
    by: ['roomId'],
    where: {
      isDeleted: false,
      authorId: { not: session.user.id },
      OR: perRoom,
    },
    _count: { _all: true },
  })

  // groupBy omits rooms with zero matches, so default every room to 0.
  const countByRoom = new Map(grouped.map(g => [g.roomId, g._count._all]))
  const unread = Object.fromEntries(rooms.map(r => [r.slug, countByRoom.get(r.id) ?? 0]))

  return NextResponse.json({ unread })
}
