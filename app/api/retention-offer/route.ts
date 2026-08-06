import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveSession } from '@/lib/session'
import { rateLimit } from '@/lib/rate-limit'
import { getStripe, isStripeConfigured } from '@/lib/stripe'
import { logAudit } from '@/lib/audit'
import {
  retentionEligibility,
  claimWhere,
  RETENTION_COUPON_ID,
  RETENTION_COUPON_PERCENT,
} from '@/lib/retention-offer'

// GET — is the signed-in member eligible for the cancel-flow retention offer?
// Drives whether the membership page intercepts the Cancel tap with the popup.
// Returns only a boolean: the reason stays server-side so the client can't
// enumerate who has claimed what.
export async function GET() {
  const session = await getActiveSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const me = await prisma.creator.findUnique({
    where: { id: session.user.id },
    select: { membershipStatus: true, joinedAt: true, retentionOfferRedeemedAt: true },
  })
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json({ eligible: retentionEligibility(me).eligible })
}

// POST — claim the offer. Re-checks eligibility server-side, burns the
// once-a-year allowance ATOMICALLY (guarded updateMany — two racing claims
// cannot both pass), then applies the coupon to the member's Stripe
// subscription. If Stripe can't be reached (or the member has no subscription
// id on file), the claim still stands and every admin is notified to apply it
// by hand — the member must never be told "claimed" and then silently get
// nothing.
export async function POST() {
  const session = await getActiveSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await rateLimit(`retention-claim:${session.user.id}`, 5, 60_000))) {
    return NextResponse.json({ error: 'Too many requests — please slow down' }, { status: 429 })
  }

  const me = await prisma.creator.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      membershipStatus: true,
      joinedAt: true,
      retentionOfferRedeemedAt: true,
      stripeSubId: true,
    },
  })
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const check = retentionEligibility(me)
  if (!check.eligible) {
    return NextResponse.json({ error: 'Not eligible for this offer' }, { status: 403 })
  }

  const now = new Date()
  // Atomic once-a-year burn: only one concurrent claim can match this WHERE.
  const burned = await prisma.creator.updateMany({
    where: claimWhere(me.id, now),
    data: { retentionOfferRedeemedAt: now },
  })
  if (burned.count === 0) {
    return NextResponse.json({ error: 'Not eligible for this offer' }, { status: 403 })
  }

  // Apply the coupon to their live subscription.
  let applied = false
  if (isStripeConfigured() && me.stripeSubId) {
    try {
      const stripe = getStripe()
      // Ensure the coupon exists (idempotent: create once, reuse forever).
      try {
        await stripe.coupons.retrieve(RETENTION_COUPON_ID)
      } catch {
        await stripe.coupons.create({
          id: RETENTION_COUPON_ID,
          percent_off: RETENTION_COUPON_PERCENT,
          duration: 'once', // one billing cycle, then back to normal price
          name: `${RETENTION_COUPON_PERCENT}% off next month (retention)`,
        })
      }
      await stripe.subscriptions.update(me.stripeSubId, {
        discounts: [{ coupon: RETENTION_COUPON_ID }],
      })
      applied = true
    } catch (err) {
      console.error('[POST /api/retention-offer] Stripe apply failed:', err)
    }
  }

  if (!applied) {
    // Fallback: the allowance is burned and the member was promised the
    // discount — make sure a human applies it. Notify every admin in-app.
    const admins = await prisma.creator.findMany({ where: { isAdmin: true }, select: { id: true } })
    await prisma.notification
      .createMany({
        data: admins.map(a => ({
          creatorId: a.id,
          type: 'retention_claim',
          title: 'Retention discount needs manual apply',
          description: `${me.firstName} ${me.lastName} (${me.email}) claimed ${RETENTION_COUPON_ID} but Stripe auto-apply failed — apply 20% off next month in Stripe.`,
          referenceId: me.id,
        })),
      })
      .catch(err => console.error('[retention-offer notify admins]', err))
  }

  await logAudit({
    actorId: me.id,
    action: 'Claimed retention discount',
    detail: `${RETENTION_COUPON_ID} (20% off next month) — ${applied ? 'auto-applied in Stripe' : 'STRIPE APPLY FAILED, admins notified for manual apply'}`,
    targetType: 'creator',
    targetId: me.id,
  })

  return NextResponse.json({ ok: true, applied })
}
