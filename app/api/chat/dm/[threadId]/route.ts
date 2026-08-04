import { NextResponse } from 'next/server'
import { getPayingSession } from "@/lib/session"
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
  const session = await getPayingSession()
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

  // Mark creator messages as read. This GET is polled, so only issue the write
  // when something is actually unread — otherwise every poll fires a no-op
  // UPDATE, one of the hottest statements in the app.
  const unreadWhere = { threadId: params.threadId, senderId: { not: session.user.id }, isRead: false }
  const hasUnread = await prisma.dmMessage.findFirst({ where: unreadWhere, select: { id: true } })
  if (hasUnread) {
    await prisma.dmMessage.updateMany({ where: unreadWhere, data: { isRead: true } })
  }

  return NextResponse.json({ thread: { ...thread, messages }, hasMore })
}

// DELETE — soft-delete a DM message (admin only)
export async function DELETE(
  req: Request,
  { params }: { params: { threadId: string } }
) {
  const session = await getPayingSession()
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { messageId } = await req.json()
  if (!messageId) return NextResponse.json({ error: 'messageId required' }, { status: 400 })

  // Scope to the thread in the URL — a messageId from another thread is a 404,
  // so threadId is enforced rather than ignored.
  const result = await prisma.dmMessage.updateMany({
    where: { id: messageId, threadId: params.threadId },
    data: { isDeleted: true, deletedAt: new Date() },
  })
  if (result.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ ok: true })
}
