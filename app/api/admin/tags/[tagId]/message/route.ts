import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveSession } from '@/lib/session'
import { rateLimit } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'
import { sendDmToCreators } from '@/lib/broadcast'

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

  const sent = await sendDmToCreators(session.user.id, creatorIds, message)

  await logAudit({
    actorId: session.user.id,
    action: 'Sent tag broadcast DM',
    detail: `"${tag.name}" → ${sent} creators`,
    targetType: 'tag',
    targetId: tag.id,
  })

  return NextResponse.json({ sent })
}
