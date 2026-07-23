import { NextResponse } from 'next/server'
import { getActiveSession } from "@/lib/session"
import { prisma } from '@/lib/prisma'
import {
  parseMessagePageParams,
  messagePageQuery,
  toChronologicalPage,
} from '@/lib/chat-pagination'

// GET — fetch messages for a specific thread (admin only)
export async function GET(
  req: Request,
  { params }: { params: { threadId: string } }
) {
  const session = await getActiveSession()
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const thread = await prisma.dmThread.findUnique({
    where: { id: params.threadId },
    include: {
      creator: { select: { id: true, firstName: true, lastName: true, profileImageUrl: true, email: true } },
    },
  })

  if (!thread) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Newest-first + reverse (see lib/chat-pagination.ts). Previously this
  // returned the oldest 100, so admins stopped seeing new member messages
  // once a thread passed the cap.
  const { before, limit } = parseMessagePageParams(req.url)
  const rows = await prisma.dmMessage.findMany({
    where: { threadId: params.threadId, isDeleted: false },
    include: {
      sender: { select: { id: true, firstName: true, lastName: true, profileImageUrl: true, isAdmin: true } },
    },
    ...messagePageQuery(limit, before),
  })
  const { messages, hasMore } = toChronologicalPage(rows, limit)

  // Mark creator messages as read
  await prisma.dmMessage.updateMany({
    where: { threadId: params.threadId, senderId: { not: session.user.id }, isRead: false },
    data: { isRead: true },
  })

  return NextResponse.json({ thread: { ...thread, messages }, hasMore })
}

// DELETE — soft-delete a DM message (admin only)
export async function DELETE(req: Request) {
  const session = await getActiveSession()
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
