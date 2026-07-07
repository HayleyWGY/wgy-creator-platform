import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveSession } from '@/lib/session'
import { rateLimit } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'

// POST — send a direct message to every (non-cancelled, non-admin) creator
// carrying this tag. Each creator receives it in their WGY DM thread.
export async function POST(
  req: Request,
  { params }: { params: { tagId: string } }
) {
  const session = await getActiveSession()
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Tight limit — this fans out to many creators
  if (!rateLimit(`tag-broadcast:${session.user.id}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too many requests — please slow down' }, { status: 429 })
  }

  const tag = await prisma.tag.findUnique({ where: { id: params.tagId }, select: { id: true, name: true } })
  if (!tag) return NextResponse.json({ error: 'Tag not found' }, { status: 404 })

  const { body } = await req.json()
  const message = typeof body === 'string' ? body.trim() : ''
  if (!message) return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })
  if (message.length > 2000) return NextResponse.json({ error: 'Message is too long' }, { status: 400 })

  // Recipients: everyone with the tag who is an active creator
  const tagged = await prisma.creatorTag.findMany({
    where: {
      tagId: tag.id,
      creator: { isAdmin: false, membershipStatus: { not: 'cancelled' } },
    },
    select: { creatorId: true },
  })
  const creatorIds = tagged.map(t => t.creatorId)
  if (creatorIds.length === 0) {
    return NextResponse.json({ error: 'No active creators carry this tag' }, { status: 400 })
  }

  // Ensure a DM thread exists for each recipient
  const existingThreads = await prisma.dmThread.findMany({
    where: { creatorId: { in: creatorIds } },
    select: { id: true, creatorId: true },
  })
  const haveThread = new Set(existingThreads.map(t => t.creatorId))
  const missing = creatorIds.filter(id => !haveThread.has(id))
  if (missing.length > 0) {
    await prisma.dmThread.createMany({
      data: missing.map(creatorId => ({ creatorId })),
      skipDuplicates: true,
    })
  }

  const threads = await prisma.dmThread.findMany({
    where: { creatorId: { in: creatorIds } },
    select: { id: true },
  })
  const threadIds = threads.map(t => t.id)

  const now = new Date()
  await prisma.$transaction([
    prisma.dmMessage.createMany({
      data: threadIds.map(threadId => ({
        threadId,
        senderId: session.user.id,
        body: message,
      })),
    }),
    // Bump threads so they surface at the top of the admin inbox
    prisma.dmThread.updateMany({
      where: { id: { in: threadIds } },
      data: { updatedAt: now },
    }),
  ])

  await logAudit({
    actorId: session.user.id,
    action: 'Sent tag broadcast DM',
    detail: `"${tag.name}" → ${threadIds.length} creators`,
    targetType: 'tag',
    targetId: tag.id,
  })

  return NextResponse.json({ sent: threadIds.length })
}
