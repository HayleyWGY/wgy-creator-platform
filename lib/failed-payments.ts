/**
 * Cross-references failed payments pulled from Stripe against app creators.
 * Pure and side-effect-free so the matching rules are unit-testable without a
 * live Stripe connection (see tests/failed-payments.test.ts). The route does
 * the Stripe I/O and the DB writes; this only decides who maps to whom.
 *
 * No card/PCI data is represented here — only reference ids, amounts and
 * statuses.
 */

export interface StripeFailure {
  stripeCustomerId: string
  email: string | null
  amount: number
  currency: string
  failedAt: number
  status: 'retrying' | 'failed' | 'resolved'
  attemptCount: number
  subscriptionId: string | null
  invoiceId: string | null
}

export interface CreatorLite {
  id: string
  firstName: string
  lastName: string
  email: string
  instagramHandle: string | null
  stripeCustomerId: string | null
  joinedAt: Date
  membershipStatus: string
}

export interface MatchedRow {
  creatorId: string
  creatorName: string
  email: string
  instagramHandle: string | null
  joinedAt: Date
  membershipStatus: string
  amount: number
  currency: string
  failedAt: number
  status: StripeFailure['status']
  attemptCount: number
  subscriptionId: string | null
  stripeCustomerId: string
  matched: true
}

export interface UnmatchedRow {
  email: string | null
  amount: number
  currency: string
  failedAt: number
  status: StripeFailure['status']
  attemptCount: number
  stripeCustomerId: string
  matched: false
}

export interface CrossReferenceResult {
  matched: MatchedRow[]
  unmatched: UnmatchedRow[]
  /** Creators matched by EMAIL that had no stripeCustomerId — persist these. */
  backfill: { creatorId: string; stripeCustomerId: string }[]
}

export function crossReference(
  failures: StripeFailure[],
  creators: CreatorLite[],
): CrossReferenceResult {
  const byStripeId = new Map<string, CreatorLite>()
  const byEmail = new Map<string, CreatorLite>()
  for (const c of creators) {
    if (c.stripeCustomerId) byStripeId.set(c.stripeCustomerId, c)
    byEmail.set(c.email.toLowerCase(), c)
  }

  const matched: MatchedRow[] = []
  const unmatched: UnmatchedRow[] = []
  const backfill: { creatorId: string; stripeCustomerId: string }[] = []

  for (const f of failures) {
    // stripeCustomerId first (authoritative), then fall back to email.
    let creator = byStripeId.get(f.stripeCustomerId)
    if (!creator && f.email) {
      creator = byEmail.get(f.email.toLowerCase())
      if (creator && !creator.stripeCustomerId) {
        // Learned the mapping — the route persists it so next time it's a
        // direct id match.
        backfill.push({ creatorId: creator.id, stripeCustomerId: f.stripeCustomerId })
      }
    }

    if (creator) {
      matched.push({
        creatorId: creator.id,
        creatorName: `${creator.firstName} ${creator.lastName}`.trim(),
        email: creator.email,
        instagramHandle: creator.instagramHandle,
        joinedAt: creator.joinedAt,
        membershipStatus: creator.membershipStatus,
        amount: f.amount,
        currency: f.currency,
        failedAt: f.failedAt,
        status: f.status,
        attemptCount: f.attemptCount,
        subscriptionId: f.subscriptionId,
        stripeCustomerId: f.stripeCustomerId,
        matched: true,
      })
    } else {
      unmatched.push({
        email: f.email,
        amount: f.amount,
        currency: f.currency,
        failedAt: f.failedAt,
        status: f.status,
        attemptCount: f.attemptCount,
        stripeCustomerId: f.stripeCustomerId,
        matched: false,
      })
    }
  }

  return { matched, unmatched, backfill }
}

export function summarise(matched: MatchedRow[], unmatched: UnmatchedRow[]) {
  const active = matched.filter(m => m.status !== 'resolved')
  return {
    total: matched.length + unmatched.length,
    matchedCount: matched.length,
    unmatchedCount: unmatched.length,
    activeFailures: active.length,
    resolved: matched.filter(m => m.status === 'resolved').length,
    totalOutstanding: active.reduce((sum, m) => sum + m.amount, 0),
  }
}
