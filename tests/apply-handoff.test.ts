import { describe, it, expect, beforeAll } from 'vitest'
import {
  mintHandoffToken,
  verifyHandoffToken,
  mintApplicationReceipt,
  verifyApplicationReceipt,
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
