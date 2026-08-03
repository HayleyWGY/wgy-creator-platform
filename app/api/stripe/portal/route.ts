/*
MANUAL SETUP REQUIRED IN STRIPE DASHBOARD:

The Customer Portal must be enabled and configured in Stripe before creators can
use it to update payment details.

DO THIS IN BOTH TEST AND LIVE MODE:

1. Go to stripe.com and sign in
2. Go to Settings (top right gear icon)
3. Click "Billing" in the left sidebar
4. Click "Customer portal"
5. Under "Functionality" enable:
   - Update payment methods: ON
   - Cancel subscriptions: OFF  (cancellations should go through WGY)
   - Update subscriptions: OFF
   - View invoice history: ON (optional)
6. Under "Business information" add:
   - Your business name: WeGotYou
   - Privacy policy URL (if you have one)
   - Terms of service URL (if you have one)
7. Click "Save changes"

Repeat these steps in LIVE mode when ready to accept real payments.

Without this setup the portal route will return an error.
*/

import { NextResponse } from 'next/server'
import { getStripe, isStripeConfigured } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { getActiveSession } from '@/lib/session'

// POST — mint a fresh, short-lived Stripe Customer Portal URL for the signed-in
// creator so they can update their payment method on Stripe's hosted page. Our
// app never sees card data. The URL is generated per request (Stripe expires
// these in minutes) and is never cached or stored.
//
// getActiveSession (not getPayingSession): a payment_failed member is exactly
// who needs this, so they must NOT be blocked from the flow that lets them
// recover. Only fully cancelled members are refused, which getActiveSession
// already enforces.
export async function POST() {
  const session = await getActiveSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // Billing is deferred pre-launch: no key means the portal simply isn't
  // available yet. Distinct code so the UI can show a sensible message.
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: 'billing_unavailable', message: 'Payment management is not available yet.' },
      { status: 503 },
    )
  }

  const creator = await prisma.creator.findUnique({
    where: { id: session.user.id },
    select: { stripeCustomerId: true },
  })

  if (!creator?.stripeCustomerId) {
    // No linked Stripe customer — the member has no self-serve portal. The UI
    // falls back to "contact support" on this code.
    return NextResponse.json(
      { error: 'no_stripe_id', message: 'No payment account found' },
      { status: 404 },
    )
  }

  try {
    const stripe = getStripe()
    const base = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: creator.stripeCustomerId,
      return_url: `${base}/payment-updated`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error) {
    // Never log payment data — only the error shape.
    console.error('[stripe-portal] error:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 })
  }
}
