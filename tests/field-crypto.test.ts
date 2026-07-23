import { describe, it, expect, beforeAll } from 'vitest'
import crypto from 'crypto'
import { encryptField, decryptField } from '@/lib/field-crypto'

// Set a real 32-byte key before importing behaviour (read at call time)
beforeAll(() => {
  process.env.FIELD_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
})

describe('field-crypto (sensitive PII at rest)', () => {
  it('round-trips a value: decrypt(encrypt(x)) === x', () => {
    const plain = '12 Example Street, Leeds, LS1 1AB'
    const enc = encryptField(plain)
    expect(enc).not.toBeNull()
    expect(enc).not.toContain('Example') // ciphertext must not leak plaintext
    expect(enc!.startsWith('enc:v1:')).toBe(true)
    expect(decryptField(enc)).toBe(plain)
  })

  it('produces different ciphertext each time (random IV) but same plaintext', () => {
    const a = encryptField('same value')
    const b = encryptField('same value')
    expect(a).not.toBe(b)
    expect(decryptField(a)).toBe('same value')
    expect(decryptField(b)).toBe('same value')
  })

  it('treats null / undefined / empty as null (no ciphertext)', () => {
    expect(encryptField(null)).toBeNull()
    expect(encryptField(undefined)).toBeNull()
    expect(encryptField('')).toBeNull()
    expect(decryptField(null)).toBeNull()
    expect(decryptField('')).toBeNull()
  })

  it('passes through legacy plaintext unchanged (migration safety)', () => {
    // A value not carrying the enc:v1: prefix is pre-encryption data
    expect(decryptField('plain legacy value')).toBe('plain legacy value')
  })

  it('does not double-encrypt an already-encrypted value', () => {
    const enc = encryptField('once')!
    expect(encryptField(enc)).toBe(enc)
  })

  it('fails loudly on tampered ciphertext (authenticated encryption)', () => {
    const enc = encryptField('secret')!
    // Flip a character in the ciphertext portion
    const tampered = enc.slice(0, -3) + (enc.slice(-3) === 'AAA' ? 'BBB' : 'AAA')
    expect(() => decryptField(tampered)).toThrow()
  })
})
