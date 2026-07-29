import { describe, it, expect } from 'vitest'
import {
  crossReference,
  summarise,
  type StripeFailure,
  type CreatorLite,
} from '@/lib/failed-payments'

const creator = (over: Partial<CreatorLite>): CreatorLite => ({
  id: 'c1', firstName: 'Sam', lastName: 'Lee', email: 'sam@example.com',
  instagramHandle: null, stripeCustomerId: null, joinedAt: new Date('2026-01-01'),
  membershipStatus: 'active', ...over,
})

const failure = (over: Partial<StripeFailure>): StripeFailure => ({
  stripeCustomerId: 'cus_1', email: 'sam@example.com', amount: 25, currency: 'GBP',
  failedAt: 1_700_000_000, status: 'retrying', attemptCount: 2,
  subscriptionId: 'sub_1', invoiceId: 'in_1', ...over,
})

describe('crossReference — matching rules', () => {
  it('matches by stripeCustomerId first (authoritative)', () => {
    const creators = [creator({ id: 'byId', stripeCustomerId: 'cus_1', email: 'other@example.com' })]
    const { matched, unmatched, backfill } = crossReference([failure({ email: 'nomatch@example.com' })], creators)
    expect(matched).toHaveLength(1)
    expect(matched[0].creatorId).toBe('byId')
    expect(unmatched).toHaveLength(0)
    expect(backfill).toHaveLength(0) // already had the id
  })

  it('falls back to email (case-insensitive) and records a backfill', () => {
    const creators = [creator({ id: 'byEmail', email: 'SAM@example.com', stripeCustomerId: null })]
    const { matched, backfill } = crossReference([failure({ stripeCustomerId: 'cus_new', email: 'sam@EXAMPLE.com' })], creators)
    expect(matched[0].creatorId).toBe('byEmail')
    expect(backfill).toEqual([{ creatorId: 'byEmail', stripeCustomerId: 'cus_new' }])
  })

  it('does not backfill when the creator already has a stripeCustomerId', () => {
    const creators = [creator({ id: 'x', email: 'sam@example.com', stripeCustomerId: 'cus_existing' })]
    const { backfill } = crossReference([failure({ stripeCustomerId: 'cus_existing' })], creators)
    expect(backfill).toHaveLength(0)
  })

  it('lists a failure with no id and no email match as unmatched', () => {
    const { matched, unmatched } = crossReference(
      [failure({ stripeCustomerId: 'cus_unknown', email: 'ghost@example.com' })],
      [creator({ email: 'someone@example.com' })],
    )
    expect(matched).toHaveLength(0)
    expect(unmatched).toHaveLength(1)
    expect(unmatched[0].stripeCustomerId).toBe('cus_unknown')
  })

  it('never leaks creator fields into an unmatched row', () => {
    const { unmatched } = crossReference([failure({ stripeCustomerId: 'cus_x', email: null })], [])
    expect(unmatched[0]).not.toHaveProperty('creatorId')
    expect(unmatched[0].matched).toBe(false)
  })
})

describe('summarise', () => {
  it('counts active vs resolved and sums only outstanding amounts', () => {
    const creators = [
      creator({ id: 'a', stripeCustomerId: 'cus_a', email: 'a@x.com' }),
      creator({ id: 'b', stripeCustomerId: 'cus_b', email: 'b@x.com' }),
      creator({ id: 'c', stripeCustomerId: 'cus_c', email: 'c@x.com' }),
    ]
    const { matched, unmatched } = crossReference([
      failure({ stripeCustomerId: 'cus_a', amount: 25, status: 'retrying' }),
      failure({ stripeCustomerId: 'cus_b', amount: 30, status: 'failed' }),
      failure({ stripeCustomerId: 'cus_c', amount: 99, status: 'resolved' }),
      failure({ stripeCustomerId: 'cus_ghost', email: 'ghost@x.com', amount: 12 }),
    ], creators)

    const s = summarise(matched, unmatched)
    expect(s.total).toBe(4)
    expect(s.matchedCount).toBe(3)
    expect(s.unmatchedCount).toBe(1)
    expect(s.resolved).toBe(1)
    expect(s.activeFailures).toBe(2) // retrying + failed, not resolved
    expect(s.totalOutstanding).toBe(55) // 25 + 30, resolved 99 excluded
  })
})
