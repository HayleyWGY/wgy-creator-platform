import crypto from 'crypto'

/**
 * Secure prefill handoff between the creator app and the campaign portal.
 *
 * When a logged-in creator taps Apply, the app mints a short-lived,
 * HMAC-signed token identifying them and sends them to the portal's
 * application form. The portal calls back to /api/apply-prefill with the
 * token; the app verifies it and returns ONLY name, email, and address so
 * the form can pre-fill those (editable) fields.
 *
 * Security properties:
 *   - The token is an opaque reference (creator id + expiry) — no personal
 *     data ever travels in the URL.
 *   - HMAC-SHA256 signed with APPLY_HANDOFF_SECRET, so the portal (or anyone)
 *     cannot forge a token for an arbitrary creator.
 *   - 5-minute expiry, so a leaked link stops working almost immediately.
 *   - Bound to a single creator; /api/apply-prefill only ever returns that
 *     one creator's data.
 *
 * DORMANT UNTIL LAUNCH: if APPLY_HANDOFF_SECRET is unset the whole feature
 * is off — mintHandoffToken returns null and the Apply button falls back to
 * a normal link. Setting the secret (plus NEXT_PUBLIC_PORTAL_URL) at launch
 * is what switches it on.
 */

const TTL_SECONDS = 5 * 60

// Every token carries a positive `typ`. BOTH verifiers require their own type
// rather than relying on the ABSENCE of a field — otherwise a token of one
// kind (which merely lacks the other's marker) sails through. That was the
// bug: verifyHandoffToken had no typ check, so a receipt (3h TTL, sitting
// readable in the portal form) could be replayed as a handoff token to
// re-fetch a member's full name/email/address and mint a fresh receipt,
// indefinitely.
const TYP_HANDOFF = 'hoff'
const TYP_RECEIPT = 'rcpt'

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

function sign(payload: string, secret: string): string {
  return b64url(crypto.createHmac('sha256', secret).update(payload).digest())
}

/**
 * Mint a token for a creator, or null if the feature is disabled (no secret).
 */
export function mintHandoffToken(creatorId: string): string | null {
  const secret = process.env.APPLY_HANDOFF_SECRET
  if (!secret) return null

  const payload = b64url(Buffer.from(JSON.stringify({ cid: creatorId, typ: TYP_HANDOFF, exp: Math.floor(Date.now() / 1000) + TTL_SECONDS })))
  return `${payload}.${sign(payload, secret)}`
}

/**
 * Verify a token and return the creator id, or null if invalid/expired/off.
 */
export function verifyHandoffToken(token: string | null | undefined): string | null {
  const secret = process.env.APPLY_HANDOFF_SECRET
  if (!secret || !token) return null

  // Strict parse: a token is exactly payload.signature. Reject any extra
  // trailing segment (payload.signature.junk) rather than silently ignoring it.
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payload, sig] = parts
  if (!payload || !sig) return null

  const expected = sign(payload, secret)
  // Constant-time compare to avoid timing attacks
  const a = fromB64url(sig)
  const b = fromB64url(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null

  let data: { cid?: string; typ?: string; exp?: number }
  try {
    data = JSON.parse(fromB64url(payload).toString('utf8'))
  } catch {
    return null
  }
  // Require typ === 'hoff' POSITIVELY. A receipt (typ 'rcpt') therefore cannot
  // be swapped in here even though its signature is valid and it has a cid and
  // an unexpired exp.
  if (data.typ !== TYP_HANDOFF || !data.cid || !data.exp || data.exp < Math.floor(Date.now() / 1000)) return null
  return data.cid
}

/**
 * True only if `candidate` has the SAME ORIGIN as `base` (scheme + host +
 * port), comparing PARSED origins — never string prefixes.
 *
 * `startsWith(base)` was the bug: with base https://portal.wegotyouagency.com,
 * https://portal.wegotyouagency.com.attacker.example/apply passes a prefix
 * test, so the handoff route would append a member's token to a lookalike
 * host that then redeems it for their PII. Origin comparison rejects that, a
 * different subdomain, and a different scheme/port; a malformed URL throws and
 * is treated as not-matching. The path and query are intentionally ignored —
 * the portal has many apply paths on the one origin.
 */
export function isSameOrigin(candidate: string, base: string): boolean {
  let a: URL, b: URL
  try {
    a = new URL(candidate)
    b = new URL(base)
  } catch {
    return false
  }
  return a.origin === b.origin
}

// ── Application receipt token ─────────────────────────────────────────────
// Returned in the prefill response and carried invisibly through the portal
// form. On submit, the portal sends it to /api/record-application so the app
// can log which campaign the creator applied to.
//
// TTL is 15 minutes: the receipt only has to survive one form submission, so
// there is no reason to leave a 3-hour replay window open (it was 3h). Paired
// with single-use redemption (record-application records the jti and rejects
// re-use), the effective replay window after submit is zero.
//
// Each receipt carries a random `jti` so two receipts minted for the same
// creator in the same second are still distinct — the jti is what
// record-application stores to enforce single use.
export const RECEIPT_TTL_SECONDS = 15 * 60

export interface ReceiptClaims {
  creatorId: string
  /** Unique token id — the key record-application stores for single-use. */
  jti: string
}

export function mintApplicationReceipt(creatorId: string): string | null {
  const secret = process.env.APPLY_HANDOFF_SECRET
  if (!secret) return null
  const jti = b64url(crypto.randomBytes(16))
  const payload = b64url(Buffer.from(JSON.stringify({
    cid: creatorId,
    typ: TYP_RECEIPT,
    jti,
    exp: Math.floor(Date.now() / 1000) + RECEIPT_TTL_SECONDS,
  })))
  return `${payload}.${sign(payload, secret)}`
}

/**
 * Verify a receipt. Returns its claims (creator id + jti) or null.
 *
 * Requires typ === 'rcpt' POSITIVELY, mirroring verifyHandoffToken — a handoff
 * token can never be redeemed as a receipt, and vice versa.
 */
export function verifyApplicationReceipt(token: string | null | undefined): ReceiptClaims | null {
  const secret = process.env.APPLY_HANDOFF_SECRET
  if (!secret || !token) return null

  // Strict parse: exactly payload.signature — reject a trailing extra segment.
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payload, sig] = parts
  if (!payload || !sig) return null

  const a = fromB64url(sig)
  const b = fromB64url(sign(payload, secret))
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null

  let data: { cid?: string; typ?: string; jti?: string; exp?: number }
  try {
    data = JSON.parse(fromB64url(payload).toString('utf8'))
  } catch {
    return null
  }
  if (data.typ !== TYP_RECEIPT || !data.cid || !data.jti || !data.exp || data.exp < Math.floor(Date.now() / 1000)) {
    return null
  }
  return { creatorId: data.cid, jti: data.jti }
}
