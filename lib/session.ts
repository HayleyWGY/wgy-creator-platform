import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { Session } from 'next-auth'

/**
 * Session helper for API routes — the ONLY way routes should read the session.
 *
 * The jwt callback in lib/auth.ts re-reads membershipStatus + isAdmin from
 * the database on every request, so the values here are live, not whatever
 * was baked into the cookie at sign-in. A cancelled member is refused
 * immediately, even mid-session — access revocation takes effect on their
 * very next request.
 */
export async function getActiveSession(): Promise<Session | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  if (session.user.membershipStatus === 'cancelled') return null
  return session
}
