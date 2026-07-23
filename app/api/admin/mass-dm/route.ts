import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getActiveSession } from '@/lib/session'
import { rateLimit } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'
import { sendDmToCreators } from '@/lib/broadcast'

export const dynamic = 'force-dynamic'

// Audience segments for a mass DM. Each maps to a Prisma where-clause over
// active (non-cancelled, non-admin) creators.
const SEGMENTS = {
  all_active:  { label: 'All active members' },
  active_30:   { label: 'Active in the last 30 days' },
  active_60:   { label: 'Active in the last 60 days' },
  active_90:   { label: 'Active in the last 90 days' },
  inactive_90: { label: 'Inactive 90+ days (win-back)' },
  new_7:       { label: 'Joined in the last 7 days' },
  not_applied: { label: "Haven't applied to an opportunity yet" },
} as const

type SegmentKey = keyof typeof SEGMENTS

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000)
}

function whereFor(segment: SegmentKey): Prisma.CreatorWhereInput {
  const base: Prisma.CreatorWhereInput = { isAdmin: false, membershipStatus: { not: 'cancelled' } }
  switch (segment) {
    case 'active_30':   return { ...base, lastSeenAt: { gte: daysAgo(30) } }
    case 'active_60':   return { ...base, lastSeenAt: { gte: daysAgo(60) } }
    case 'active_90':   return { ...base, lastSeenAt: { gte: daysAgo(90) } }
    case 'inactive_90': return { ...base, lastSeenAt: { lt: daysAgo(90) } }
    case 'new_7':       return { ...base, joinedAt: { gte: daysAgo(7) } }
    case 'not_applied': return { ...base, firstApplyAt: null }
    case 'all_active':
    default:            return base
  }
}

// GET — recipient counts for each segment, for the composer UI
export async function GET() {
  const session = await getActiveSession()
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const keys = Object.keys(SEGMENTS) as SegmentKey[]
  const counts = await Promise.all(keys.map(k => prisma.creator.count({ where: whereFor(k) })))

  const segments = keys.map((k, i) => ({ key: k, label: SEGMENTS[k].label, count: counts[i] }))
  return NextResponse.json({ segments })
}

// POST — send a DM from WGY to everyone in the chosen segment
export async function POST(req: Request) {
  const session = await getActiveSession()
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await rateLimit(`mass-dm:${session.user.id}`, 5, 60_000, { failClosed: true }))) {
    return NextResponse.json({ error: 'Too many requests — please slow down' }, { status: 429 })
  }

  const { segment, body } = await req.json()
  if (!segment || !(segment in SEGMENTS)) {
    return NextResponse.json({ error: 'Choose a valid audience' }, { status: 400 })
  }
  const message = typeof body === 'string' ? body.trim() : ''
  if (!message) return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })
  if (message.length > 2000) return NextResponse.json({ error: 'Message is too long' }, { status: 400 })

  const recipients = await prisma.creator.findMany({
    where: whereFor(segment as SegmentKey),
    select: { id: true },
  })
  const ids = recipients.map(r => r.id)
  if (ids.length === 0) {
    return NextResponse.json({ error: 'No creators match that audience right now' }, { status: 400 })
  }

  const sent = await sendDmToCreators(session.user.id, ids, message)

  await logAudit({
    actorId: session.user.id,
    action: 'Sent mass DM',
    detail: `${SEGMENTS[segment as SegmentKey].label} → ${sent} creators`,
    targetType: 'mass-dm',
  })

  return NextResponse.json({ sent })
}
