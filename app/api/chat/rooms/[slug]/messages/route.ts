import { NextResponse } from 'next/server'
import { getActiveSession } from "@/lib/session"
import { rateLimit } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'
import { pingRealtime } from '@/lib/realtime-server'
import {
  parseMessagePageParams,
  messagePageQuery,
  toChronologicalPage,
} from '@/lib/chat-pagination'

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  const session = await getActiveSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Deliberately high: this is an abuse backstop, NOT a throttle.
  // Realtime triggers a refetch per new message, so a busy room can
  // legitimately produce ~100+ reads/min per viewer. See notes on
  // coalescing refetches client-side.
  if (!(await rateLimit(`room-read:${session.user.id}`, 300, 60_000))) {
    return NextResponse.json({ error: 'Too many requests — please slow down' }, { status: 429 })
  }

  const room = await prisma.chatRoom.findUnique({
    where: { slug: params.slug },
    include: {
      pinnedMessage: {
        include: {
          author: { select: { firstName: true, lastName: true, isAdmin: true } },
        },
      },
    },
  })
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  // Newest-first + reverse. Ordering ascending with `take` returned the
  // OLDEST N rows, so once a room passed the cap new messages were never
  // returned. `before` pages further back through history.
  const { before, limit } = parseMessagePageParams(req.url)
  const rows = await prisma.chatMessage.findMany({
    where: { roomId: room.id, isDeleted: false },
    include: {
      author: { select: { id: true, firstName: true, lastName: true, profileImageUrl: true, isAdmin: true } },
    },
    ...messagePageQuery(limit, before),
  })
  const { messages, hasMore } = toChronologicalPage(rows, limit)

  return NextResponse.json({
    messages,
    hasMore,
    roomId: room.id,
    pinnedMessage: room.pinnedMessage || null,
  })
}

export async function POST(
  req: Request,
  { params }: { params: { slug: string } }
) {
  const session = await getActiveSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await rateLimit(`room-send:${session.user.id}`, 20, 60_000))) {
    return NextResponse.json({ error: 'Too many requests — please slow down' }, { status: 429 })
  }

  const { body, imageUrl } = await req.json()
  if (!body?.trim() && !imageUrl) {
    return NextResponse.json({ error: 'Message body required' }, { status: 400 })
  }

  const room = await prisma.chatRoom.findUnique({ where: { slug: params.slug } })
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  // Block @everyone/@all for non-admins
  if (!session.user.isAdmin) {
    const lower = (body || '').toLowerCase()
    if (lower.includes('@everyone') || lower.includes('@all') || lower.includes('@channel')) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
    }
  }

  const message = await prisma.chatMessage.create({
    data: {
      roomId: room.id,
      authorId: session.user.id,
      body: body?.trim() || '',
      imageUrl: imageUrl || null,
    },
    include: {
      author: { select: { id: true, firstName: true, lastName: true, profileImageUrl: true, isAdmin: true } },
    },
  })

  // Nudge everyone in the room to refetch — content stays behind this API
  pingRealtime(`room:${params.slug}`).catch(() => {})

  return NextResponse.json({ message }, { status: 201 })
}
