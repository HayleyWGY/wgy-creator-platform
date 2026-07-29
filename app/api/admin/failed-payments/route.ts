import { NextResponse } from 'next/server'
import { getStripe, isStripeConfigured } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { getActiveSession } from '@/lib/session'
import {
  crossReference,
  summarise,
  type StripeFailure,
} from '@/lib/failed-payments'

// GET — failed payments pulled LIVE from Stripe, cross-referenced against app
// creators. No card details or any PCI data is ever fetched, returned, or
// logged: only reference ids, amounts and statuses.
export async function GET(req: Request) {
  // SECURITY: admin check first, always. getActiveSession (not
  // getServerSession) is the repo convention and does a live status check, so
  // a just-revoked admin can't reach payment data on a stale cookie.
  const session = await getActiveSession()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Billing is deferred pre-launch: with no Stripe key the page shows its
  // empty state rather than erroring. stripeConfigured lets the UI say so.
  if (!isStripeConfigured()) {
    return NextResponse.json({
      matched: [],
      unmatched: [],
      stripeConfigured: false,
      summary: { total: 0, matchedCount: 0, unmatchedCount: 0, activeFailures: 0, resolved: 0, totalOutstanding: 0 },
    })
  }

  try {
    const stripe = getStripe()

    const { searchParams } = new URL(req.url)
    const days = Math.min(Math.max(parseInt(searchParams.get('range') || '30', 10) || 30, 1), 365)
    const fromDate = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000)

    // Past-due subscriptions are the meaningful "payment failed after retries"
    // signal for a subscription app. (The spec also listed a payment-intents
    // fetch, but it was never used — dropped rather than left as dead code.)
    const pastDue = await stripe.subscriptions.list({ status: 'past_due', limit: 100 })

    const failures: StripeFailure[] = []
    for (const sub of pastDue.data) {
      try {
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
        const customer = await stripe.customers.retrieve(customerId)
        if ('deleted' in customer) continue // DeletedCustomer — skip

        const invoices = await stripe.invoices.list({ subscription: sub.id, limit: 5 })
        const latest = invoices.data[0]
        if (!latest || !latest.id) continue
        if (latest.created < fromDate) continue

        const status: StripeFailure['status'] =
          latest.status === 'paid' ? 'resolved' : sub.status === 'past_due' ? 'retrying' : 'failed'

        failures.push({
          stripeCustomerId: customer.id,
          email: customer.email,
          amount: (latest.amount_due ?? 0) / 100,
          currency: (latest.currency ?? 'gbp').toUpperCase(),
          failedAt: latest.created,
          status,
          attemptCount: latest.attempt_count ?? 0,
          subscriptionId: sub.id,
          invoiceId: latest.id,
        })
      } catch {
        // One customer/invoice failing must not sink the whole response.
        continue
      }
    }

    const creators = await prisma.creator.findMany({
      select: {
        id: true, firstName: true, lastName: true, email: true,
        instagramHandle: true, stripeCustomerId: true, joinedAt: true, membershipStatus: true,
      },
    })

    const { matched, unmatched, backfill } = crossReference(failures, creators)

    // Persist the stripeCustomerId learned from an email match. AWAITED — an
    // unawaited write is routinely killed when the Vercel lambda freezes on
    // response (the same hazard the audit lib documents). updateMany-per-id
    // is fine at this volume, and skipUnique guards a rare race.
    await Promise.all(
      backfill.map(b =>
        prisma.creator
          .updateMany({ where: { id: b.creatorId, stripeCustomerId: null }, data: { stripeCustomerId: b.stripeCustomerId } })
          .catch(() => {}),
      ),
    )

    return NextResponse.json({
      matched,
      unmatched,
      stripeConfigured: true,
      summary: summarise(matched, unmatched),
    })
  } catch (error) {
    // Never log payment data. Log only the error shape.
    console.error('[failed-payments] fetch error:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: 'Failed to fetch payment data' }, { status: 500 })
  }
}
