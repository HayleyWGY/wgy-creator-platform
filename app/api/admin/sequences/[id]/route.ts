import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveSession } from '@/lib/session'
import { logAudit } from '@/lib/audit'

// PATCH — edit a step (day, subject, body, active)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getActiveSession()
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { dayOffset, subject, body, isActive } = await req.json()
  const data: Record<string, unknown> = {}

  if (dayOffset !== undefined) {
    const day = Number(dayOffset)
    if (!Number.isInteger(day) || day < 0) {
      return NextResponse.json({ error: 'Day must be 0 or more' }, { status: 400 })
    }
    data.dayOffset = day
  }
  if (typeof subject === 'string') data.subject = subject.trim() || 'Message'
  if (typeof body === 'string') {
    if (!body.trim()) return NextResponse.json({ error: 'Message body is required' }, { status: 400 })
    data.body = body.trim()
  }
  if (typeof isActive === 'boolean') data.isActive = isActive

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const step = await prisma.messageTemplate.update({ where: { id: params.id }, data })

  await logAudit({
    actorId: session.user.id,
    action: 'Edited onboarding step',
    detail: `Day ${step.dayOffset}: ${step.subject}${typeof isActive === 'boolean' ? (isActive ? ' (activated)' : ' (paused)') : ''}`,
    targetType: 'sequence',
    targetId: step.id,
  })

  return NextResponse.json({ step })
}

// DELETE — remove a step
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getActiveSession()
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Remove send-logs first (no cascade defined) so future re-adds are clean
  await prisma.onboardingMessageSent.deleteMany({ where: { templateId: params.id } })
  await prisma.messageTemplate.delete({ where: { id: params.id } })

  await logAudit({
    actorId: session.user.id,
    action: 'Deleted onboarding step',
    targetType: 'sequence',
    targetId: params.id,
  })

  return NextResponse.json({ ok: true })
}
