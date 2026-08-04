import { NextResponse } from 'next/server'
import { getActiveSession } from "@/lib/session"
import { rateLimit } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'
import { pingRealtime } from '@/lib/realtime-server'
import { parseJson, chatMessageSchema } from '@/lib/validation'

// How many non-pinned threads to load per page. Every message send bumps the
// thread's updatedAt, so any UNREAD thread is by definition recently-updated
// and lands inside this window — unread-first ordering is preserved without
// scanning every thread. Pinned threads are always included separately.
const THREAD_PAGE_SIZE = 100

const threadInclude = (adminId: string) => ({
  creator: { select: { id: true, firstName: true, lastName: true, profileImageUrl: true, email: true } },
  messages: {
    where: { isDeleted: false },
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    include: {
      sender: { select: { id: true, firstName: true, isAdmin: true } },
    },
  },
  _count: {
    select: { messages: { where: { isRead: false, senderId: { not: adminId } } } },
  },
})

// GET — list DM threads (admin only). Paginated: pinned threads (always shown)
// plus a capped, cursor-paged window of the most recently active threads.
export async function GET(req: Request) {
  const session = await getActiveSession()
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  // Cursor = the updatedAt of the last thread on the previous page (ISO string).
  const cursorParam = url.searchParams.get('cursor')
  const cursor = cursorParam ? new Date(cursorParam) : null
  const hasCursor = cursor !== null && !Number.isNaN(cursor.getTime())

  const include = threadInclude(session.user.id)

  // Pinned threads are fetched once, on the first page only, so a pinned but
  // quiet thread (old updatedAt) never falls outside the activity window.
  const pinnedPromise = hasCursor
    ? Promise.resolve([])
    : prisma.dmThread.findMany({
        where: { isPinned: true },
        include,
        orderBy: { updatedAt: 'desc' },
      })

  // One extra row tells us whether another page exists without a count query.
  const windowPromise = prisma.dmThread.findMany({
    where: {
      isPinned: false,
      ...(hasCursor ? { updatedAt: { lt: cursor } } : {}),
    },
    include,
    orderBy: { updatedAt: 'desc' },
    take: THREAD_PAGE_SIZE + 1,
  })

  const [pinned, windowRows] = await Promise.all([pinnedPromise, windowPromise])

  const hasMore = windowRows.length > THREAD_PAGE_SIZE
  const pageRows = hasMore ? windowRows.slice(0, THREAD_PAGE_SIZE) : windowRows
  const nextCursor = hasMore ? pageRows[pageRows.length - 1].updatedAt.toISOString() : null

  // Order within what we loaded: pinned first, then unread, then most recent.
  const threads = [...pinned, ...pageRows].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
    const aUnread = a._count.messages > 0
    const bUnread = b._count.messages > 0
    if (aUnread !== bUnread) return aUnread ? -1 : 1
    return b.updatedAt.getTime() - a.updatedAt.getTime()
  })

  return NextResponse.json({ threads, nextCursor, hasMore })
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


  const raw = await req.json().catch(() => null)
  const creatorId = raw && typeof raw.creatorId === 'string' ? raw.creatorId : ''
  if (!creatorId) return NextResponse.json({ error: 'creatorId required' }, { status: 400 })
  const parsed = parseJson(chatMessageSchema, raw)
  if (!parsed.ok) return parsed.response
  const body = parsed.data.body ?? ''
  const imageUrl = parsed.data.imageUrl ?? null

  try {
    let thread = await prisma.dmThread.findUnique({ where: { creatorId } })
    if (!thread) {
      thread = await prisma.dmThread.create({ data: { creatorId } })
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

    // Wake the creator's open chat view and the admin inbox list
    pingRealtime([`dm:${thread.id}`, 'admin-inbox']).catch(() => {})

    return NextResponse.json({ message }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/chat/dm/admin]', err)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
