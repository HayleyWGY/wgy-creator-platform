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

// POST — the single Stripe Customer Portal endpoint. Mints a fresh, short-lived
// portal URL for the signed-in creator so they can update their payment method
// on Stripe's hosted page. Our app never sees card data; the URL is generated
// per request (Stripe expires these in minutes) and is never cached or stored.
//
// Consolidated from the former /api/billing/portal + /api/stripe/portal pair
// (identical feature, divergent logic), keeping the safer behaviour of each:
// error-message-only logging (never log payment data), the robust return-URL
// origin (env or request origin, trailing slash stripped), and a `message` on
// every error path. Callers: membership page + payment-failed page.
//
// getActiveSession (not getPayingSession): a payment_failed member is exactly
// who needs this, so they must NOT be blocked from the flow that lets them
// recover. Only fully cancelled members are refused, which getActiveSession
// already enforces.
export async function POST(req: Request) {
  const session = await getActiveSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // Billing is deferred pre-launch: no key means the portal simply isn't
  // available yet. Distinct code so the UI can show a sensible message.
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: 'billing_unavailable', message: 'Payment management isn’t available yet. Please contact support.' },
      { status: 503 },
    )
  }

  // Look up the creator by their OWN session id — never a client-supplied id —
  // so this can't be used to open someone else's portal (IDOR-safe).
  const creator = await prisma.creator.findUnique({
    where: { id: session.user.id },
    select: { stripeCustomerId: true },
  })

  if (!creator?.stripeCustomerId) {
    // No linked Stripe customer — the member has no self-serve portal. The
    // membership page branches on this exact code to show "contact support".
    return NextResponse.json(
      { error: 'no_stripe_id', message: 'We couldn’t find your billing account. Please contact support.' },
      { status: 404 },
    )
  }

  // Absolute return URL: prefer a configured origin, fall back to the request's;
  // strip any trailing slash so we never build "…//payment-updated".
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL
  const origin = configured?.replace(/\/$/, '') || new URL(req.url).origin

  try {
    const portal = await getStripe().billingPortal.sessions.create({
      customer: creator.stripeCustomerId,
      // Canonical for BOTH entry points: the "payment updated" confirmation,
      // which is exempt from the payment_failed → /payment-failed redirect (so a
      // still-gated member returning from Stripe actually sees the confirmation).
      return_url: `${origin}/payment-updated`,
    })
    return NextResponse.json({ url: portal.url })
  } catch (error) {
    // Never log payment data — only the error shape.
    console.error('[stripe/portal] error:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json(
      { error: 'portal_failed', message: 'Could not open the billing portal. Please try again or contact support.' },
      { status: 502 },
    )
  }
}
