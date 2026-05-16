import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET — fetch messages for a specific thread (admin only)
export async function GET(
  _req: Request,
  { params }: { params: { threadId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const thread = await prisma.dmThread.findUnique({
    where: { id: params.threadId },
    include: {
      creator: { select: { id: true, firstName: true, lastName: true, profileImageUrl: true, email: true } },
      messages: {
        where: { isDeleted: false },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, profileImageUrl: true, isAdmin: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 100,
      },
    },
  })

  if (!thread) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Mark creator messages as read
  await prisma.dmMessage.updateMany({
    where: { threadId: params.threadId, senderId: { not: session.user.id }, isRead: false },
    data: { isRead: true },
  })

  return NextResponse.json({ thread })
}

// DELETE — soft-delete a DM message (admin only)
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { messageId } = await req.json()
  if (!messageId) return NextResponse.json({ error: 'messageId required' }, { status: 400 })

  await prisma.dmMessage.update({
    where: { id: messageId },
    data: { isDeleted: true, deletedAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
