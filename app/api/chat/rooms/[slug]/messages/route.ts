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

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  const session = await getPayingSession()
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
      replyTo: {
        select: { id: true, body: true, isDeleted: true, author: { select: { firstName: true, lastName: true } } },
      },
      mentions: { select: { creator: { select: { id: true, firstName: true, lastName: true } } } },
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
  const session = await getPayingSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await rateLimit(`room-send:${session.user.id}`, 20, 60_000))) {
    return NextResponse.json({ error: 'Too many requests — please slow down' }, { status: 429 })
  }

  const raw = await req.json().catch(() => null)
  const parsed = parseJson(chatMessageSchema, raw)
  if (!parsed.ok) return parsed.response
  const body = parsed.data.body ?? ''
  const imageUrl = parsed.data.imageUrl ?? null
  const replyToId = parsed.data.replyToId ?? null
  const mentionIds = parsed.data.mentions ?? []

  try {
    const room = await prisma.chatRoom.findUnique({ where: { slug: params.slug } })
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

    // The reply target must be a real message in THIS room (silently dropped if
    // not — a stale/foreign id shouldn't fail an otherwise valid message). We
    // only notify the replied-to author if the parent isn't deleted.
    let validReplyToId: string | null = null
    let replyToAuthorId: string | null = null
    if (replyToId) {
      const parent = await prisma.chatMessage.findUnique({
        where: { id: replyToId },
        select: { id: true, roomId: true, authorId: true, isDeleted: true },
      })
      if (parent && parent.roomId === room.id) {
        validReplyToId = parent.id
        if (!parent.isDeleted) replyToAuthorId = parent.authorId
      }
    }

    // Re-validate every mentioned id server-side: real, active, not the author.
    // Never trust the client's list — this is what actually gates who gets pinged.
    const uniqueMentionIds = Array.from(new Set(mentionIds)).filter(id => id !== session.user.id)
    const validMentions = uniqueMentionIds.length
      ? await prisma.creator.findMany({
          where: { id: { in: uniqueMentionIds }, membershipStatus: { not: 'cancelled' } },
          select: { id: true },
        })
      : []
    const mentionCreatorIds = validMentions.map(m => m.id)

    const message = await prisma.chatMessage.create({
      data: {
        roomId: room.id,
        authorId: session.user.id,
        body: body.trim(),
        imageUrl,
        replyToId: validReplyToId,
        mentions: mentionCreatorIds.length
          ? { createMany: { data: mentionCreatorIds.map(creatorId => ({ creatorId })) } }
          : undefined,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, profileImageUrl: true, isAdmin: true } },
        replyTo: {
          select: { id: true, body: true, isDeleted: true, author: { select: { firstName: true, lastName: true } } },
        },
        mentions: { select: { creator: { select: { id: true, firstName: true, lastName: true } } } },
      },
    })

    // In-app notifications for mention recipients + the replied-to author,
    // deduped (a reply that also @mentions the same person notifies once) and
    // never to yourself. AWAITED so a freezing lambda can't drop the write, but
    // a failure must not fail the send.
    const authorName = `${message.author.firstName} ${message.author.lastName}`
    const recipients = new Map<string, { type: string; title: string }>()
    for (const cid of mentionCreatorIds) {
      recipients.set(cid, { type: 'chat_mention', title: `${authorName} mentioned you` })
    }
    if (replyToAuthorId && replyToAuthorId !== session.user.id && !recipients.has(replyToAuthorId)) {
      recipients.set(replyToAuthorId, { type: 'chat_reply', title: `${authorName} replied to you` })
    }
    if (recipients.size > 0) {
      const preview = body.trim().slice(0, 80)
      await prisma.notification
        .createMany({
          data: Array.from(recipients).map(([creatorId, n]) => ({
            creatorId,
            type: n.type,
            title: n.title,
            description: `${room.name}${preview ? ` — ${preview}` : ''}`,
            referenceId: room.slug,
          })),
        })
        .catch(err => console.error('[notify chat mention/reply]', err))
    }

    // Nudge everyone in the room to refetch — content stays behind this API
    pingRealtime(`room:${params.slug}`).catch(() => {})

    return NextResponse.json({ message }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/chat/rooms/[slug]/messages]', err)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
