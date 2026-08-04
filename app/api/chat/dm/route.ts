import { NextResponse } from 'next/server'
import { getPayingSession } from "@/lib/session"
import { rateLimit } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'
import { pingRealtime } from '@/lib/realtime-server'
import { parseJson, chatMessageSchema } from '@/lib/validation'
import {
  parseMessagePageParams,
  messagePageQuery,
  toChronologicalPage,
} from '@/lib/chat-pagination'

// GET — return the current creator's DM thread (create if missing)
export async function GET(req: Request) {
  const session = await getPayingSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Find-or-create the thread WITHOUT messages, then page them separately.
  // The messages query was previously duplicated across both branches — two
  // copies of the same query is how they drift apart.
  let thread = await prisma.dmThread.findUnique({
    where: { creatorId: session.user.id },
  })

  if (!thread) {
    thread = await prisma.dmThread.create({ data: { creatorId: session.user.id } })
  } else {
    // Mark all admin messages as read — but this GET is polled, so only write
    // when there's actually something unread, instead of firing a no-op UPDATE
    // on every poll.
    const unreadWhere = { threadId: thread.id, senderId: { not: session.user.id }, isRead: false }
    const hasUnread = await prisma.dmMessage.findFirst({ where: unreadWhere, select: { id: true } })
    if (hasUnread) {
      await prisma.dmMessage.updateMany({ where: unreadWhere, data: { isRead: true } })
    }
  }

  // Newest-first + reverse (see lib/chat-pagination.ts for why).
  const { before, limit } = parseMessagePageParams(req.url)
  const rows = await prisma.dmMessage.findMany({
    where: { threadId: thread.id, isDeleted: false },
    include: {
      sender: { select: { id: true, firstName: true, lastName: true, profileImageUrl: true, isAdmin: true } },
    },
    ...messagePageQuery(limit, before),
  })
  const { messages, hasMore } = toChronologicalPage(rows, limit)

  return NextResponse.json({ thread: { ...thread, messages }, hasMore })
}

// POST — creator sends a message in their own thread
export async function POST(req: Request) {
  const session = await getPayingSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await rateLimit(`dm-send:${session.user.id}`, 20, 60_000))) {
    return NextResponse.json({ error: 'Too many requests — please slow down' }, { status: 429 })
  }

  const raw = await req.json().catch(() => null)
  const parsed = parseJson(chatMessageSchema, raw)
  if (!parsed.ok) return parsed.response
  const body = parsed.data.body ?? ''
  const imageUrl = parsed.data.imageUrl ?? null

  try {
    let thread = await prisma.dmThread.findUnique({ where: { creatorId: session.user.id } })
    if (!thread) {
      thread = await prisma.dmThread.create({ data: { creatorId: session.user.id } })
    }

    const message = await prisma.dmMessage.create({
      data: {
        threadId: thread.id,
        senderId: session.user.id,
        body: body.trim(),
        imageUrl,
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, profileImageUrl: true, isAdmin: true } },
      },
    })

    await prisma.dmThread.update({ where: { id: thread.id }, data: { updatedAt: new Date() } })

    // Wake the admin inbox and this thread's open views
    pingRealtime([`dm:${thread.id}`, 'admin-inbox']).catch(() => {})

    return NextResponse.json({ message }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/chat/dm]', err)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
