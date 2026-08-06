/**
 * Cancel-flow retention offer ("PLSSTAY20").
 *
 * When an ELIGIBLE member taps Cancel Membership, the app offers 20% off their
 * next month before the cancellation email opens. Claiming applies a Stripe
 * coupon to their live subscription automatically — the code string is
 * marketing copy on the popup; nobody ever types it.
 *
 * Eligibility (all required):
 *   - membershipStatus === 'active'  (payment_failed members need a working
 *     card, not a discount; cancelled members have no subscription to discount)
 *   - a member for at least 6 months (joinedAt — real WGY join date, confirmed
 *     carried through the migration import)
 *   - has not CLAIMED the offer in the last 365 days. Seeing the popup and
 *     declining never burns the allowance — redemption is what costs money, so
 *     redemption is what's rationed.
 *
 * The once-a-year stamp lives on Creator.retentionOfferRedeemedAt and is set
 * with a guarded updateMany (WHERE stamp is null/expired), so two concurrent
 * claims can never both pass.
 */

export const RETENTION_COUPON_ID = 'PLSSTAY20'
export const RETENTION_COUPON_PERCENT = 20
export const MIN_TENURE_MS = 183 * 24 * 60 * 60 * 1000 // ~6 months
export const REDEMPTION_COOLDOWN_MS = 365 * 24 * 60 * 60 * 1000

export interface RetentionEligibilityInput {
  membershipStatus: string
  joinedAt: Date
  retentionOfferRedeemedAt: Date | null
}

export type RetentionEligibility =
  | { eligible: true }
  | { eligible: false; reason: 'status' | 'tenure' | 'already_claimed' }

export function retentionEligibility(
  c: RetentionEligibilityInput,
  now: Date = new Date(),
): RetentionEligibility {
  if (c.membershipStatus !== 'active') return { eligible: false, reason: 'status' }
  if (now.getTime() - c.joinedAt.getTime() < MIN_TENURE_MS) {
    return { eligible: false, reason: 'tenure' }
  }
  if (
    c.retentionOfferRedeemedAt &&
    now.getTime() - c.retentionOfferRedeemedAt.getTime() < REDEMPTION_COOLDOWN_MS
  ) {
    return { eligible: false, reason: 'already_claimed' }
  }
  return { eligible: true }
}

/**
 * The WHERE clause that atomically claims the once-a-year allowance: matches
 * only while the stamp is still null or expired, so of two racing claims
 * exactly one updates a row (count 1) and the other matches nothing (count 0).
 */
export function claimWhere(creatorId: string, now: Date = new Date()) {
  return {
    id: creatorId,
    membershipStatus: 'active',
    OR: [
      { retentionOfferRedeemedAt: null },
      { retentionOfferRedeemedAt: { lt: new Date(now.getTime() - REDEMPTION_COOLDOWN_MS) } },
    ],
  }
}
