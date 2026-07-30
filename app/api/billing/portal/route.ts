import { NextResponse } from 'next/server'
import { getActiveSession } from '@/lib/session'
import { getStripe, isStripeConfigured } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

/**
 * Creates a Stripe Billing Portal session so a member can update their card and
 * retry the failed invoice on Stripe's hosted page — we never handle card data.
 *
 * Uses getActiveSession (NOT getPayingSession) on purpose: a payment_failed
 * member must be able to reach this, or they'd be locked out of the one flow
 * that recovers their account.
 *
 * Closing the loop (flipping membershipStatus back to 'active' after they pay)
 * is the Stripe webhook's job — see app/api/webhooks/stripe/route.ts. Until that
 * is implemented, a member can update their card here but will not be un-gated.
 */
export async function POST(req: Request) {
  const session = await getActiveSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: 'billing_unavailable', message: 'Billing isn’t available yet. Please contact support.' },
      { status: 503 },
    )
  }

  const creator = await prisma.creator.findUnique({
    where: { id: session.user.id },
    select: { stripeCustomerId: true },
  })

  if (!creator?.stripeCustomerId) {
    return NextResponse.json(
      { error: 'no_customer', message: 'We couldn’t find your billing account. Please contact support.' },
      { status: 409 },
    )
  }

  // Absolute return URL: prefer configured origin, fall back to the request's.
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL
  const origin = configured?.replace(/\/$/, '') || new URL(req.url).origin

  try {
    const portal = await getStripe().billingPortal.sessions.create({
      customer: creator.stripeCustomerId,
      return_url: `${origin}/home`,
    })
    return NextResponse.json({ url: portal.url })
  } catch (err) {
    console.error('[billing/portal] Stripe error:', err)
    return NextResponse.json(
      { error: 'portal_failed', message: 'Could not open the billing portal. Please try again or contact support.' },
      { status: 502 },
    )
  }
}
