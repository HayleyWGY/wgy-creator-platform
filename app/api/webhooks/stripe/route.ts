import { headers } from 'next/headers'
import * as Sentry from '@sentry/nextjs'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'

export async function POST(req: Request) {
  const body      = await req.text()
  const signature = headers().get('stripe-signature')

  // A misconfiguration (missing key/secret) must be DISTINGUISHABLE from a
  // forged request. Before, a missing STRIPE_WEBHOOK_SECRET was passed to
  // constructEvent as '' and surfaced as an ordinary 400 signature failure —
  // identical to a forgery — so Stripe would retry, give up, and we'd silently
  // stop processing payments with nothing obviously broken. So: config errors
  // fail LOUD as 500 + Sentry (Stripe still retries a 500, so no event is lost
  // once the config is fixed); only genuine signature problems return 400.
  //
  // Not a module-load throw: STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET are
  // intentionally optional pre-launch (billing is dormant — see lib/env.ts and
  // lib/stripe.ts). Throwing at import would break `next build` and every cold
  // start while Stripe is unconfigured. The fail-loud lives per-request, where
  // it only fires if an event actually arrives.
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    Sentry.captureMessage(
      '[stripe-webhook] STRIPE_WEBHOOK_SECRET is not set — cannot verify events; failing loud (500) so this is not mistaken for a forged request',
      'error',
    )
    return new Response('Webhook misconfigured: missing signing secret', { status: 500 })
  }

  let stripe: Stripe
  try {
    // Throws if STRIPE_SECRET_KEY is missing (lib/stripe.ts). Same class of
    // misconfiguration as above → 500 + Sentry, never a silent 400.
    stripe = getStripe()
  } catch (err) {
    Sentry.captureException(err, { tags: { subsystem: 'stripe-webhook', reason: 'missing-secret-key' } })
    return new Response('Webhook misconfigured: Stripe not initialised', { status: 500 })
  }

  // A missing/blank signature header is a malformed or forged request, not a
  // misconfiguration on our side → 400.
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch {
    // Secret and key are both present, so this is a real verification failure:
    // a forged or tampered request. Fail closed, quietly — this is expected
    // adversarial traffic, not an incident to page on.
    return new Response('Webhook signature verification failed', { status: 400 })
  }

  switch (event.type) {

    case 'customer.subscription.created':
    case 'invoice.payment_succeeded':
      // TODO Phase 2:
      // 1. Extract customer email from event
      // 2. Check if creator account exists with this email
      // 3. If not: create new creator account with membershipStatus: active
      // 4. Send magic link email via Klaviyo so creator can set their password
      // 5. Log event to stripe_events table
      // TODO: Map price IDs to regions when webhook is connected, reading the
      // price id from env (STRIPE_UK_PRICE_ID / STRIPE_INT_PRICE_ID — add them
      // to .env.example and OPTIONAL_ENV at that point):
      //   UK price id  -> region: 'uk'
      //   INT price id -> region: 'international'
      // (This is the ONLY reliable source of a creator's region — see the
      //  region note in the failed-payments reporting, which currently has no
      //  region column because nothing populates it until this lands.)
      break

    case 'invoice.payment_failed':
      // TODO Phase 2:
      // 1. Find creator by customer email
      // 2. Set membershipStatus: payment_failed
      // 3. Trigger Klaviyo payment failed email
      break

    case 'customer.subscription.deleted':
      // TODO Phase 2:
      // 1. Find creator by customer email
      // 2. Set membershipStatus: cancelled
      // 3. Trigger Klaviyo cancellation email
      break

  }

  return new Response(JSON.stringify({ received: true }), { status: 200 })
}
