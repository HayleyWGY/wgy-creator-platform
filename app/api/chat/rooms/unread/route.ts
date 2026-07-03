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

  const lastReadByRoom = new Map(reads.map(r => [r.roomId, r.lastReadAt]))

  const counts = await Promise.all(
    rooms.map(async room => {
      const lastReadAt = lastReadByRoom.get(room.id)
      const count = await prisma.chatMessage.count({
        where: {
          roomId: room.id,
          isDeleted: false,
          authorId: { not: session.user.id },
          ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
        },
      })
      return [room.slug, count] as const
    })
  )

  return NextResponse.json({ unread: Object.fromEntries(counts) })
}
