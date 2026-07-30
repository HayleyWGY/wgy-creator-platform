import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { Session } from 'next-auth'

/**
 * Session helper for API routes — the ONLY way routes should read the session.
 *
 * The jwt callback in lib/auth.ts re-reads membershipStatus + isAdmin from the
 * database, so the values here reflect current status rather than whatever was
 * baked into the cookie at sign-in — BUT that read is cached for 60s per lambda
 * instance (getLiveStatus in lib/auth.ts). So revocation is not instantaneous:
 * a cancelled member keeps API access for up to 60 seconds after the change,
 * and because each warm instance holds its own cache, access degrades raggedly
 * across instances rather than cleanly at one moment. The 60s window is a
 * deliberate trade-off to keep DB load flat under 3s chat polls.
 *
 * This blocks `cancelled` only. It deliberately does NOT block `payment_failed`
 * — that is enforced separately by getPayingSession() on the routes that require
 * an active paying membership. See that helper for the reasoning.
 */
export async function getActiveSession(): Promise<Session | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  if (session.user.membershipStatus === 'cancelled') return null
  return session
}

/**
 * Stricter session helper: requires an active PAYING membership. Rejects both
 * `cancelled` and `payment_failed`.
 *
 * Why this exists: middleware.ts redirects payment_failed members at the PAGE
 * level, but its `matcher` covers no /api/* paths, so the API alone did not
 * enforce the paywall — a payment_failed member could keep hitting the API
 * directly (or via a native wrapper that ignores page redirects). Routes that
 * deliver paid value must call this, not getActiveSession(), so the paywall is
 * a real boundary and not merely a page-level suggestion.
 *
 * Same 60s per-instance staleness applies as getActiveSession() (see above).
 *
 * NOTE: routes that a payment_failed member legitimately needs — reading their
 * own profile/membership state, and everything required to fix their card —
 * must stay on getActiveSession(), or they would be locked out of the very
 * flow that lets them recover. The split of which routes use which is applied
 * deliberately, not blanket-swapped.
 */
export async function getPayingSession(): Promise<Session | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  const status = session.user.membershipStatus
  // Cancelled is out for everyone. payment_failed blocks paying members from
  // paid features, but NOT admins — they're staff, not subject to the member
  // paywall, and these routes are shared (e.g. admins create the opportunities
  // that members browse through the same file).
  if (status === 'cancelled') return null
  if (status === 'payment_failed' && !session.user.isAdmin) return null
  return session
}
