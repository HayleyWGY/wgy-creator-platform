import crypto from 'crypto'
import { prisma } from './prisma'

/**
 * Single-use, expiring tokens for account actions that must work when the
 * account has no usable password: admin invite setup, and later password
 * reset.
 *
 * Design notes, because the details are what make this safe:
 *
 *  - The raw token is 32 random bytes (base64url). That is far beyond
 *    guessable, so the lookup does not need to be rate-limited to stay
 *    secure (it is anyway, on the routes).
 *  - Only SHA-256(token) is stored. A database leak therefore yields no
 *    usable links. SHA-256 is correct here rather than bcrypt: the input is
 *    already high-entropy, so slow hashing buys nothing and would cost a
 *    lookup index.
 *  - Because we store the hash and look up BY that hash, verification is a
 *    single indexed query with no timing-sensitive comparison.
 *  - Rows are marked used rather than deleted, so redemption stays visible.
 */

// 'admin_setup'   — invited admin choosing their first password
// 'account_setup' — reinstated member choosing a new password after their
//                   old one was scrubbed by account deletion
// 'password_reset' — reserved for the forgot-password flow (task #21)
export type TokenPurpose = 'admin_setup' | 'account_setup' | 'password_reset'

// Both setup purposes mean the same thing to the redemption page: "choose
// your initial password". Kept as distinct purposes so the audit trail and
// the invited-admin check can tell an admin invite from a member reinstate.
export const SETUP_PURPOSES: TokenPurpose[] = ['admin_setup', 'account_setup']

export const ADMIN_SETUP_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

const hash = (raw: string) => crypto.createHash('sha256').update(raw).digest('hex')

/**
 * Issue a token and return the RAW value — the only moment it exists in
 * readable form. Any previously-unused token for the same creator+purpose is
 * invalidated, so re-issuing a link cannot leave two live links.
 */
export async function createAccountToken(
  creatorId: string,
  purpose: TokenPurpose,
  ttlMs: number = ADMIN_SETUP_TTL_MS,
): Promise<string> {
  const raw = crypto.randomBytes(32).toString('base64url')

  await prisma.accountToken.updateMany({
    where: { creatorId, purpose, usedAt: null },
    data: { usedAt: new Date() },
  })

  await prisma.accountToken.create({
    data: {
      tokenHash: hash(raw),
      purpose,
      creatorId,
      expiresAt: new Date(Date.now() + ttlMs),
    },
  })

  return raw
}

/**
 * Look up a token without consuming it. Returns the creator id, or null if
 * the token is unknown, already used, expired, or for a different purpose.
 * Used to decide whether to render the set-password form.
 */
export async function peekAccountToken(
  raw: unknown,
  purpose: TokenPurpose | TokenPurpose[],
): Promise<string | null> {
  if (typeof raw !== 'string' || !raw) return null

  const allowed = Array.isArray(purpose) ? purpose : [purpose]
  const row = await prisma.accountToken.findUnique({
    where: { tokenHash: hash(raw) },
    select: { creatorId: true, purpose: true, usedAt: true, expiresAt: true },
  })
  if (!row) return null
  if (!allowed.includes(row.purpose as TokenPurpose)) return null
  if (row.usedAt) return null
  if (row.expiresAt <= new Date()) return null

  return row.creatorId
}

/**
 * Atomically consume a token. Returns the creator id, or null if it was not
 * redeemable.
 *
 * The updateMany carries the whole validity check in its WHERE clause, so two
 * concurrent redemptions cannot both succeed: the database decides the winner
 * and the loser matches zero rows. A read-then-write would race.
 */
export async function consumeAccountToken(
  raw: unknown,
  purpose: TokenPurpose | TokenPurpose[],
): Promise<string | null> {
  if (typeof raw !== 'string' || !raw) return null

  const allowed = Array.isArray(purpose) ? purpose : [purpose]
  const tokenHash = hash(raw)
  const { count } = await prisma.accountToken.updateMany({
    where: {
      tokenHash,
      purpose: { in: allowed },
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { usedAt: new Date() },
  })
  if (count === 0) return null

  const row = await prisma.accountToken.findUnique({
    where: { tokenHash },
    select: { creatorId: true },
  })
  return row?.creatorId ?? null
}

/**
 * Absolute URL for a setup link. Prefers an explicitly configured origin;
 * falls back to the request's own. The Host header is attacker-controllable
 * in principle, so configuring NEXTAUTH_URL is preferred — but this link is
 * only ever shown back to the admin who just requested it, never emailed to a
 * third party, so the fallback cannot be used to phish someone else.
 */
export function setupLinkUrl(token: string, req: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL
  const origin = configured?.replace(/\/$/, '') || new URL(req.url).origin
  return `${origin}/set-password?token=${encodeURIComponent(token)}`
}
