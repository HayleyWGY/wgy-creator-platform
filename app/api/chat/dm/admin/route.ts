import { NextResponse } from 'next/server'
import { getActiveSession } from "@/lib/session"
import { rateLimit } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'
import { pingRealtime } from '@/lib/realtime-server'

// GET — list all DM threads (admin only)
export async function GET() {
  const session = await getActiveSession()
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const threads = await prisma.dmThread.findMany({
    include: {
      creator: { select: { id: true, firstName: true, lastName: true, profileImageUrl: true, email: true } },
      messages: {
        where: { isDeleted: false },
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          sender: { select: { id: true, firstName: true, isAdmin: true } },
        },
      },
      _count: {
        select: { messages: { where: { isRead: false, senderId: { not: session.user.id } } } },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  // Pinned threads first, then unread, then most recent activity
  threads.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
    const aUnread = a._count.messages > 0
    const bUnread = b._count.messages > 0
    if (aUnread !== bUnread) return aUnread ? -1 : 1
    return b.updatedAt.getTime() - a.updatedAt.getTime()
  })

  return NextResponse.json({ threads })
}

// PATCH — pin/unpin a thread, or mark it unread (admin only)
export async function PATCH(req: Request) {
  const session = await getActiveSession()
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { threadId, action } = await req.json()
  if (!threadId || !['pin', 'unpin', 'unread'].includes(action)) {
    return NextResponse.json({ error: 'threadId and a valid action are required' }, { status: 400 })
  }

  const thread = await prisma.dmThread.findUnique({ where: { id: threadId }, select: { id: true } })
  if (!thread) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (action === 'pin' || action === 'unpin') {
    await prisma.dmThread.update({
      where: { id: threadId },
      data: { isPinned: action === 'pin' },
    })
    return NextResponse.json({ ok: true })
  }

  // action === 'unread' — flag the creator's latest message as unread so the
  // thread jumps back into the unread group
  const latest = await prisma.dmMessage.findFirst({
    where: { threadId, isDeleted: false, senderId: { not: session.user.id } },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })
  if (latest) {
    await prisma.dmMessage.update({ where: { id: latest.id }, data: { isRead: false } })
  }
  return NextResponse.json({ ok: true })
}

// POST — admin sends a message to a creator's thread
export async function POST(req: Request) {
  const session = await getActiveSession()
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await rateLimit(`admin-dm-send:${session.user.id}`, 30, 60_000))) {
    return NextResponse.json({ error: 'Too many requests — please slow down' }, { status: 429 })
  }


  const { creatorId, body, imageUrl } = await req.json()
  if (!creatorId) return NextResponse.json({ error: 'creatorId required' }, { status: 400 })
  if (!body?.trim() && !imageUrl) return NextResponse.json({ error: 'Message body required' }, { status: 400 })

  let thread = await prisma.dmThread.findUnique({ where: { creatorId } })
  if (!thread) {
    thread = await prisma.dmThread.create({ data: { creatorId } })
  }

  const message = await prisma.dmMessage.create({
    data: {
      threadId: thread.id,
      senderId: session.user.id,
      body: body?.trim() || '',
      imageUrl: imageUrl || null,
    },
    include: {
      sender: { select: { id: true, firstName: true, lastName: true, profileImageUrl: true, isAdmin: true } },
    },
  })

  await prisma.dmThread.update({ where: { id: thread.id }, data: { updatedAt: new Date() } })

  // Wake the creator's open chat view and the admin inbox list
  pingRealtime([`dm:${thread.id}`, 'admin-inbox']).catch(() => {})

  return NextResponse.json({ message }, { status: 201 })
}
