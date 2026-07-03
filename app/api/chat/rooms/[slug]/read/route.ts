import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveSession } from '@/lib/session'

// POST — mark a room as read up to now for the current creator
export async function POST(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const session = await getActiveSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const room = await prisma.chatRoom.findUnique({
    where: { slug: params.slug },
    select: { id: true },
  })
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  await prisma.chatRoomRead.upsert({
    where: { creatorId_roomId: { creatorId: session.user.id, roomId: room.id } },
    update: { lastReadAt: new Date() },
    create: { creatorId: session.user.id, roomId: room.id },
  })

  return NextResponse.json({ success: true })
}
