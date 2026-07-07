import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveSession } from '@/lib/session'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

const SEQUENCE = 'onboarding'

// GET — the onboarding sequence steps, ordered by day
export async function GET() {
  const session = await getActiveSession()
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const steps = await prisma.messageTemplate.findMany({
    where: { sequenceName: SEQUENCE },
    orderBy: [{ dayOffset: 'asc' }, { sortOrder: 'asc' }],
  })
  return NextResponse.json({ steps })
}

// POST — add a step
export async function POST(req: Request) {
  const session = await getActiveSession()
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { dayOffset, subject, body } = await req.json()
  const day = Number(dayOffset)
  if (!Number.isInteger(day) || day < 0) {
    return NextResponse.json({ error: 'Day must be 0 or more' }, { status: 400 })
  }
  if (!body?.trim()) return NextResponse.json({ error: 'Message body is required' }, { status: 400 })

  const step = await prisma.messageTemplate.create({
    data: {
      sequenceName: SEQUENCE,
      dayOffset: day,
      subject: (subject || '').trim() || `Day ${day} message`,
      body: body.trim(),
      isActive: true,
    },
  })

  await logAudit({
    actorId: session.user.id,
    action: 'Added onboarding step',
    detail: `Day ${day}: ${step.subject}`,
    targetType: 'sequence',
    targetId: step.id,
  })

  return NextResponse.json({ step }, { status: 201 })
}
