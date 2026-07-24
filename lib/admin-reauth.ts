import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { logAudit } from './audit'

/**
 * Re-authentication for high-impact admin actions.
 *
 * Holding an admin session is not sufficient authority to do things that can
 * permanently take over an account. A session cookie can be stolen; the
 * password cannot be replayed out of one. So the operations below demand the
 * caller's OWN password in addition to their session.
 *
 * Which operations, and why each is a takeover primitive:
 *
 *   - granting/revoking admin rights   (app/api/admin/admins)
 *   - changing a member's email        — the address receives setup and, once
 *                                        Resend ships, password-reset links,
 *                                        so redirecting it hands over the
 *                                        account in one step
 *   - changing membershipStatus        — 'cancelled' revokes a live session;
 *                                        it is also half of the forged-delete
 *                                        path into reinstate
 *   - reinstating a deleted account    — issues a working setup link
 *
 * Failures are audited by the caller, which knows what was being attempted.
 * A run of 'password rejected' entries against one admin is the signature of
 * a stolen cookie being exercised.
 */

export type ReauthResult =
  | { ok: true; actor: { id: string; email: string } }
  | { ok: false; response: NextResponse; reason: string }

export async function verifyCurrentPassword(
  actorId: string,
  currentPassword: unknown,
): Promise<ReauthResult> {
  if (typeof currentPassword !== 'string' || !currentPassword) {
    return {
      ok: false,
      reason: 'no password supplied',
      response: NextResponse.json({ error: 'Your current password is required' }, { status: 400 }),
    }
  }

  // Loaded by session id — never by a client-supplied id, which would let a
  // caller re-authenticate against an account they already control.
  const actor = await prisma.creator.findUnique({
    where: { id: actorId },
    select: { id: true, email: true, passwordHash: true },
  })
  if (!actor || !(await bcrypt.compare(currentPassword, actor.passwordHash))) {
    return {
      ok: false,
      reason: 'password rejected',
      response: NextResponse.json({ error: 'Current password is incorrect' }, { status: 403 }),
    }
  }

  return { ok: true, actor: { id: actor.id, email: actor.email } }
}

/**
 * Verify, and audit the failure in one step. Returns null when the caller is
 * authorised; otherwise the response to return.
 */
export async function requireReauth(opts: {
  actorId: string
  currentPassword: unknown
  action: string
  targetType?: string
  targetId?: string
  detail?: string
}): Promise<NextResponse | null> {
  const result = await verifyCurrentPassword(opts.actorId, opts.currentPassword)
  if (result.ok) return null

  await logAudit({
    actorId: opts.actorId,
    action: `${opts.action} DENIED`,
    detail: `Re-authentication failed (${result.reason})${opts.detail ? ` — ${opts.detail}` : ''}`,
    targetType: opts.targetType,
    targetId: opts.targetId,
  })
  return result.response
}

/**
 * Fields an admin cannot change on a member without re-authenticating.
 * Kept here rather than in the route so the list and the reasoning above stay
 * together.
 */
// An array rather than a Set: it is only ever iterated and the build targets
// a JS level where spreading a Set needs downlevelIteration.
export const REAUTH_REQUIRED_FIELDS = ['email', 'membershipStatus'] as const
