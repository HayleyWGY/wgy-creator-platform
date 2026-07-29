import Stripe from 'stripe'

/**
 * Server-only Stripe client. NEVER import this into a client component — it
 * would bundle STRIPE_SECRET_KEY into the browser. It is only ever used from
 * API routes / server code.
 *
 * DELIBERATELY LAZY. The spec called for a module-level `throw` when the key
 * is missing, but STRIPE_SECRET_KEY is an OPTIONAL env var here (billing is
 * deferred pre-launch — it is not in the required set, see lib/env.ts). A
 * throw at import time would run during `next build` and on any cold start,
 * breaking the whole app whenever the key is unset — which is right now.
 *
 * Instead the client is built on first use and throws only when a Stripe
 * feature is actually invoked without a key configured. The failed-payments
 * route catches that and shows its "configure your Stripe key" state, so the
 * page degrades gracefully rather than the deploy failing.
 *
 * apiVersion is intentionally omitted so the installed SDK (v22) uses the
 * version it is typed against — pinning a mismatched literal is a TS error.
 */
let client: Stripe | null = null

export function getStripe(): Stripe {
  if (client) return client
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set — Stripe features are unavailable')
  }
  client = new Stripe(key, { typescript: true })
  return client
}

/** True when a Stripe key is configured, so callers can branch without throwing. */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}
