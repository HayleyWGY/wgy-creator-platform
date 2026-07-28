import { describe, it, expect, beforeAll } from 'vitest'
import {
  mintHandoffToken,
  verifyHandoffToken,
  mintApplicationReceipt,
  verifyApplicationReceipt,
  isSameOrigin,
} from '@/lib/apply-handoff'

beforeAll(() => {
  process.env.APPLY_HANDOFF_SECRET = 'test-secret-for-handoff-tokens'
})

describe('apply-handoff tokens (secure app→portal prefill)', () => {
  it('mints and verifies a valid handoff token for the creator', () => {
    const token = mintHandoffToken('creator-123')
    expect(token).not.toBeNull()
    expect(verifyHandoffToken(token)).toBe('creator-123')
  })

  it('rejects a tampered signature', () => {
    const token = mintHandoffToken('creator-123')!
    const [payload] = token.split('.')
    expect(verifyHandoffToken(`${payload}.AAAA`)).toBeNull()
  })

  it('rejects a forged token signed with a different secret', () => {
    const token = mintHandoffToken('creator-123')!
    process.env.APPLY_HANDOFF_SECRET = 'a-different-secret'
    expect(verifyHandoffToken(token)).toBeNull()
    process.env.APPLY_HANDOFF_SECRET = 'test-secret-for-handoff-tokens'
  })

  it('rejects garbage and empty input', () => {
    expect(verifyHandoffToken('not-a-token')).toBeNull()
    expect(verifyHandoffToken('')).toBeNull()
    expect(verifyHandoffToken(null)).toBeNull()
  })

  it('is disabled (returns null) when no secret is configured', () => {
    delete process.env.APPLY_HANDOFF_SECRET
    expect(mintHandoffToken('creator-123')).toBeNull()
    expect(verifyHandoffToken('anything')).toBeNull()
    process.env.APPLY_HANDOFF_SECRET = 'test-secret-for-handoff-tokens'
  })

  it('does not accept a handoff token as an application receipt (type separation)', () => {
    const handoff = mintHandoffToken('creator-123')!
    // A handoff token has no typ:'rcpt', so the receipt verifier must reject it
    expect(verifyApplicationReceipt(handoff)).toBeNull()
  })

  it('mints and verifies an application receipt (returns creator id + jti)', () => {
    const receipt = mintApplicationReceipt('creator-123')
    expect(receipt).not.toBeNull()
    const claims = verifyApplicationReceipt(receipt)
    expect(claims?.creatorId).toBe('creator-123')
    expect(claims?.jti).toBeTruthy()
  })

  it('mints a distinct jti per receipt (single-use keys never collide)', () => {
    const a = verifyApplicationReceipt(mintApplicationReceipt('creator-123'))
    const b = verifyApplicationReceipt(mintApplicationReceipt('creator-123'))
    expect(a?.jti).not.toBe(b?.jti)
  })

  it('does not accept a receipt as a handoff token (BOTH directions guarded)', () => {
    // THE REAL GUARD. This is what the previous test only CLAIMED to check —
    // its assertion actually called verifyApplicationReceipt again. Against the
    // pre-fix code (verifyHandoffToken had no typ check) this line returns
    // 'creator-123' and the test fails, which is the point.
    const receipt = mintApplicationReceipt('creator-123')!
    expect(verifyHandoffToken(receipt)).toBeNull()

    // And the reverse, so neither verifier relies on the absence of a field.
    const handoff = mintHandoffToken('creator-123')!
    expect(verifyApplicationReceipt(handoff)).toBeNull()
  })
})

describe('isSameOrigin — handoff origin check (no string prefixes)', () => {
  const PORTAL = 'https://portal.wegotyouagency.com'

  it('accepts the exact portal origin, any path/query', () => {
    expect(isSameOrigin(PORTAL, PORTAL)).toBe(true)
    // path-only difference: same origin, different path → allowed (the portal
    // has many apply paths; origin is what matters, not the full string).
    expect(isSameOrigin(`${PORTAL}/apply/summer-drop?ref=x`, PORTAL)).toBe(true)
  })

  it('REJECTS a lookalike domain that only shares a prefix', () => {
    // The exploit: passes startsWith(PORTAL), different origin.
    expect(isSameOrigin('https://portal.wegotyouagency.com.attacker.example/apply', PORTAL)).toBe(false)
  })

  it('REJECTS a different subdomain of our own domain', () => {
    expect(isSameOrigin('https://evil.wegotyouagency.com/apply', PORTAL)).toBe(false)
    expect(isSameOrigin('https://portal.evil.wegotyouagency.com/apply', PORTAL)).toBe(false)
  })

  it('REJECTS a scheme or port mismatch on the right host', () => {
    expect(isSameOrigin('http://portal.wegotyouagency.com/apply', PORTAL)).toBe(false)
    expect(isSameOrigin('https://portal.wegotyouagency.com:8443/apply', PORTAL)).toBe(false)
  })

  it('REJECTS a malformed URL without throwing', () => {
    for (const bad of ['not a url', 'javascript:alert(1)//portal.wegotyouagency.com', '', 'portal.wegotyouagency.com/apply']) {
      expect(isSameOrigin(bad, PORTAL)).toBe(false)
    }
  })

  it('treats a malformed BASE as non-matching too (no throw)', () => {
    expect(isSameOrigin(PORTAL, 'not-a-portal-url')).toBe(false)
  })
})
