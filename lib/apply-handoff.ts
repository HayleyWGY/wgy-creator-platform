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

  const payload = b64url(Buffer.from(JSON.stringify({ cid: creatorId, exp: Math.floor(Date.now() / 1000) + TTL_SECONDS })))
  return `${payload}.${sign(payload, secret)}`
}

/**
 * Verify a token and return the creator id, or null if invalid/expired/off.
 */
export function verifyHandoffToken(token: string | null | undefined): string | null {
  const secret = process.env.APPLY_HANDOFF_SECRET
  if (!secret || !token) return null

  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null

  const expected = sign(payload, secret)
  // Constant-time compare to avoid timing attacks
  const a = fromB64url(sig)
  const b = fromB64url(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null

  let data: { cid?: string; exp?: number }
  try {
    data = JSON.parse(fromB64url(payload).toString('utf8'))
  } catch {
    return null
  }
  if (!data.cid || !data.exp || data.exp < Math.floor(Date.now() / 1000)) return null
  return data.cid
}

// ── Application receipt token ─────────────────────────────────────────────
// Returned in the prefill response and carried invisibly through the portal
// form. On submit, the portal sends it to /api/record-application so the app
// can log which campaign the creator applied to. Longer-lived (3h) than the
// handoff token because filling in a form takes time, and marked with a
// distinct type so it can't be swapped for a handoff token.
const RECEIPT_TTL_SECONDS = 3 * 60 * 60

export function mintApplicationReceipt(creatorId: string): string | null {
  const secret = process.env.APPLY_HANDOFF_SECRET
  if (!secret) return null
  const payload = b64url(Buffer.from(JSON.stringify({ cid: creatorId, typ: 'rcpt', exp: Math.floor(Date.now() / 1000) + RECEIPT_TTL_SECONDS })))
  return `${payload}.${sign(payload, secret)}`
}

export function verifyApplicationReceipt(token: string | null | undefined): string | null {
  const secret = process.env.APPLY_HANDOFF_SECRET
  if (!secret || !token) return null

  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null

  const a = fromB64url(sig)
  const b = fromB64url(sign(payload, secret))
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null

  let data: { cid?: string; typ?: string; exp?: number }
  try {
    data = JSON.parse(fromB64url(payload).toString('utf8'))
  } catch {
    return null
  }
  if (data.typ !== 'rcpt' || !data.cid || !data.exp || data.exp < Math.floor(Date.now() / 1000)) return null
  return data.cid
}
