import { NextResponse } from 'next/server'
import { getStripe, isStripeConfigured } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { getActiveSession } from '@/lib/session'
import { logAudit } from '@/lib/audit'

// POST — manually link a Stripe customer id to an app creator when automatic
// email matching failed. Admin-only.
export async function POST(req: Request) {
  const session = await getActiveSession()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { creatorId, stripeCustomerId } = await req.json().catch(() => ({}))
  if (typeof creatorId !== 'string' || typeof stripeCustomerId !== 'string' || !creatorId || !stripeCustomerId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 400 })
  }

  // The Stripe customer must actually exist before we store the reference.
  try {
    const customer = await getStripe().customers.retrieve(stripeCustomerId)
    if ('deleted' in customer) {
      return NextResponse.json({ error: 'Stripe customer not found' }, { status: 404 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid Stripe customer ID' }, { status: 400 })
  }

  // Not already linked to a different creator (the column is @unique, but a
  // clear 409 beats a raw constraint error).
  const existing = await prisma.creator.findUnique({ where: { stripeCustomerId }, select: { id: true } })
  if (existing && existing.id !== creatorId) {
    return NextResponse.json({ error: 'That Stripe ID is already linked to another creator' }, { status: 409 })
  }

  try {
    await prisma.creator.update({ where: { id: creatorId }, data: { stripeCustomerId } })
  } catch {
    return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
  }

  await logAudit({
    actorId: session.user.id,
    action: 'Linked Stripe customer to creator',
    detail: `stripeCustomerId ${stripeCustomerId}`,
    targetType: 'creator',
    targetId: creatorId,
  })

  return NextResponse.json({ success: true })
}
