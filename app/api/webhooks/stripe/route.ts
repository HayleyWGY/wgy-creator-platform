import { headers } from 'next/headers'
import Stripe from 'stripe'

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY || ''
)

export async function POST(req: Request) {
  const body = await req.text()
  const signature = headers().get('stripe-signature')

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature || '',
      process.env.STRIPE_WEBHOOK_SECRET || ''
    )
  } catch {
    return new Response('Webhook signature verification failed', { status: 400 })
  }

  switch (event.type) {

    case 'customer.subscription.created':
    case 'invoice.payment_succeeded':
      // TODO Phase 2:
      // 1. Extract customer email from event
      // 2. Check if creator account exists with this email
      // 3. If not: create new creator account with membership_status: active
      // 4. Send magic link email via Klaviyo API so creator can set their password
      // 5. Log event to stripe_events table
      console.log('New subscription:', event.data.object)
      break

    case 'invoice.payment_failed':
      // TODO Phase 2:
      // 1. Find creator by customer email
      // 2. Set membership_status: payment_failed
      // 3. Trigger Klaviyo payment failed email
      console.log('Payment failed:', event.data.object)
      break

    case 'customer.subscription.deleted':
      // TODO Phase 2:
      // 1. Find creator by customer email
      // 2. Set membership_status: cancelled
      // 3. Trigger Klaviyo cancellation email
      console.log('Subscription cancelled:', event.data.object)
      break

  }

  return new Response(JSON.stringify({ received: true }), { status: 200 })
}
