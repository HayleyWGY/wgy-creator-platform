import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
  retentionEligibility,
  claimWhere,
  MIN_TENURE_MS,
  REDEMPTION_COOLDOWN_MS,
} from '@/lib/retention-offer'

const NOW = new Date('2026-08-05T12:00:00Z')
const monthsAgo = (m: number) => new Date(NOW.getTime() - m * 30.5 * 24 * 60 * 60 * 1000)

const base = {
  membershipStatus: 'active',
  joinedAt: monthsAgo(12),
  retentionOfferRedeemedAt: null as Date | null,
}

describe('retentionEligibility', () => {
  it('a 12-month active member who never claimed is eligible', () => {
    expect(retentionEligibility(base, NOW)).toEqual({ eligible: true })
  })

  it('requires ACTIVE status — payment_failed/cancelled/paused are all refused', () => {
    for (const status of ['payment_failed', 'cancelled', 'paused']) {
      expect(retentionEligibility({ ...base, membershipStatus: status }, NOW)).toEqual({
        eligible: false,
        reason: 'status',
      })
    }
  })

  it('requires 6 months tenure — a 3-month member is refused, exactly-at-threshold passes', () => {
    expect(retentionEligibility({ ...base, joinedAt: monthsAgo(3) }, NOW)).toEqual({
      eligible: false,
      reason: 'tenure',
    })
    const exactly = new Date(NOW.getTime() - MIN_TENURE_MS)
    expect(retentionEligibility({ ...base, joinedAt: exactly }, NOW).eligible).toBe(true)
    const oneMsShort = new Date(NOW.getTime() - MIN_TENURE_MS + 1)
    expect(retentionEligibility({ ...base, joinedAt: oneMsShort }, NOW).eligible).toBe(false)
  })

  it('ONCE A YEAR: a claim 6 months ago blocks; a claim 13 months ago allows again', () => {
    expect(
      retentionEligibility({ ...base, retentionOfferRedeemedAt: monthsAgo(6) }, NOW),
    ).toEqual({ eligible: false, reason: 'already_claimed' })
    expect(
      retentionEligibility({ ...base, retentionOfferRedeemedAt: monthsAgo(13) }, NOW).eligible,
    ).toBe(true)
    // Boundary: exactly 365 days ago is allowed again.
    const exactly = new Date(NOW.getTime() - REDEMPTION_COOLDOWN_MS)
    expect(
      retentionEligibility({ ...base, retentionOfferRedeemedAt: exactly }, NOW).eligible,
    ).toBe(true)
  })
})

describe('claimWhere — the atomic once-a-year burn', () => {
  it('matches only active members whose stamp is null or expired', () => {
    const where = claimWhere('creator-1', NOW)
    expect(where.id).toBe('creator-1')
    expect(where.membershipStatus).toBe('active')
    // Null stamp (never claimed) must be one arm of the OR…
    expect(where.OR).toContainEqual({ retentionOfferRedeemedAt: null })
    // …and the other arm only matches stamps OLDER than the cooldown, so a
    // fresh stamp (set by a racing claim a moment ago) can never match.
    const cutoffArm = where.OR.find(o => o.retentionOfferRedeemedAt !== null) as {
      retentionOfferRedeemedAt: { lt: Date }
    }
    expect(cutoffArm.retentionOfferRedeemedAt.lt.getTime()).toBe(
      NOW.getTime() - REDEMPTION_COOLDOWN_MS,
    )
  })
})

describe('retention-offer route applies the controls', () => {
  const src = fs
    .readFileSync(path.join(__dirname, '..', 'app/api/retention-offer/route.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

  it('rate-limits the claim by creator id', () => {
    expect(src).toMatch(/retention-claim:\$\{session\.user\.id\}/)
  })

  it('burns the allowance atomically and 403s when the guard matches nothing', () => {
    expect(src).toMatch(/updateMany\(\{\s*where:\s*claimWhere\(/)
    expect(src).toMatch(/count === 0/)
    expect(src).toMatch(/status:\s*403/)
  })

  it('re-checks eligibility server-side before burning', () => {
    const eligibilityAt = src.indexOf('retentionEligibility(me)')
    const burnAt = src.indexOf('updateMany')
    expect(eligibilityAt).toBeGreaterThan(-1)
    expect(burnAt).toBeGreaterThan(eligibilityAt)
  })

  it('falls back to notifying every admin when Stripe cannot auto-apply', () => {
    expect(src).toMatch(/isAdmin:\s*true/)
    expect(src).toMatch(/retention_claim/)
    expect(src).toMatch(/logAudit/)
  })
})
