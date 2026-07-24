import { NextResponse } from 'next/server'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getActiveSession } from '@/lib/session'
import { rateLimit } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'
import { createAccountToken, setupLinkUrl } from '@/lib/account-token'
import { verifyCurrentPassword } from '@/lib/admin-reauth'

/**
 * Admin team management.
 *
 * Granting and revoking admin rights are the highest-impact actions in the
 * product, so they are re-authenticated: the caller must supply their OWN
 * current password, verified with bcrypt.compare, in addition to holding an
 * admin session. A stolen session cookie alone is therefore not enough to
 * seize the platform.
 *
 * This mirrors the control already applied to the lower-impact
 * app/api/admin/settings route (changing your own email/password) — the
 * stricter check had been applied there and skipped here.
 *
 * Every outcome is written to the audit log, including failures. A burst of
 * 'Re-authentication failed' entries against an admin account is the
 * signature of a stolen cookie being exercised, which is exactly the signal
 * worth having when investigating.
 */

// GET — list admin accounts
export async function GET() {
  const session = await getActiveSession()
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admins = await prisma.creator.findMany({
    where: { isAdmin: true },
    select: { id: true, firstName: true, lastName: true, email: true, joinedAt: true, lastSeenAt: true },
    orderBy: { joinedAt: 'asc' },
  })

  return NextResponse.json({ admins, meId: session.user.id })
}

// POST — grant admin access. If the email belongs to an existing account
// it is promoted; otherwise a new admin account is created and a
// temporary password is returned once.
export async function POST(req: Request) {
  const session = await getActiveSession()
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await rateLimit(`admin-team:${session.user.id}`, 10, 60_000))) {
    await logAudit({
      actorId: session.user.id,
      action: 'Grant admin access blocked',
      detail: 'Rate limit exceeded',
      targetType: 'admin',
    })
    return NextResponse.json({ error: 'Too many requests — please slow down' }, { status: 429 })
  }

  const { email, firstName, lastName, currentPassword } = await req.json()

  // Re-authenticate BEFORE touching anything, so a stolen cookie cannot even
  // probe which emails already have accounts.
  const auth = await verifyCurrentPassword(session.user.id, currentPassword)
  if (!auth.ok) {
    await logAudit({
      actorId: session.user.id,
      action: 'Grant admin access DENIED',
      detail: `Re-authentication failed (${auth.reason})`,
      targetType: 'admin',
    })
    return auth.response
  }

  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
  if (!cleanEmail) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  // Emails are stored lowercase on every write path, so an exact lookup on
  // the lowercased value uses the unique index. The previous
  // `mode: 'insensitive'` match could not use that index and forced a
  // sequential scan of the whole creator table.
  const existing = await prisma.creator.findUnique({ where: { email: cleanEmail } })

  if (existing) {
    if (existing.isAdmin) {
      // An invited admin who never redeemed their link would otherwise be
      // stuck forever: the account exists (so this is a 409) but has no
      // usable password and no way to obtain one. Re-issuing is safe —
      // createAccountToken invalidates the previous token, so this cannot
      // leave two live links.
      //
      // TWO conditions, deliberately. passwordSetAt alone is not enough: it
      // was added to an existing table, so every pre-existing account read as
      // null until backfilled — which briefly made this branch willing to mint
      // a setup link for an ESTABLISHED admin, i.e. peer-admin takeover. The
      // token check is structural rather than data-dependent: only an account
      // that was actually invited has an admin_setup token, so a future import
      // that forgets to set passwordSetAt cannot reopen the hole.
      const wasInvited = await prisma.accountToken.count({
        where: { creatorId: existing.id, purpose: 'admin_setup' },
      })
      if (existing.passwordSetAt === null && wasInvited > 0) {
        const token = await createAccountToken(existing.id, 'admin_setup')
        await logAudit({
          actorId: session.user.id,
          action: 'Re-issued admin setup link',
          detail: `New setup link for ${existing.email} (previous link invalidated)`,
          targetType: 'admin',
          targetId: existing.id,
        })
        return NextResponse.json({
          admin: {
            id: existing.id,
            firstName: existing.firstName,
            lastName: existing.lastName,
            email: existing.email,
          },
          setupUrl: setupLinkUrl(token, req),
          reissued: true,
        })
      }
      return NextResponse.json({ error: 'That account is already an admin' }, { status: 409 })
    }
    const admin = await prisma.creator.update({
      where: { id: existing.id },
      data: { isAdmin: true },
      select: { id: true, firstName: true, lastName: true, email: true },
    })
    await logAudit({
      actorId: session.user.id,
      action: 'Granted admin access',
      detail: `Promoted existing account ${admin.email}`,
      targetType: 'admin',
      targetId: admin.id,
    })
    return NextResponse.json({ admin, promoted: true })
  }

  if (!firstName?.trim() || !lastName?.trim()) {
    return NextResponse.json({ error: 'First and last name are required for a new admin account' }, { status: 400 })
  }

  // The account is created with a password NOBODY knows — random bytes, hashed
  // and immediately discarded. It cannot be logged into until the invitee
  // redeems their setup link and chooses their own password. This replaces the
  // previous scheme, which generated a temporary password and returned it in
  // the response body: that was a permanent working credential, known to a
  // second person, travelling through an HTTP response.
  const unusablePassword = crypto.randomBytes(32).toString('base64')

  try {
    const admin = await prisma.creator.create({
      data: {
        email: cleanEmail,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        passwordHash: bcrypt.hashSync(unusablePassword, 10),
        isAdmin: true,
        membershipStatus: 'active',
        membershipType: 'team',
        passwordSetAt: null,
      },
      select: { id: true, firstName: true, lastName: true, email: true },
    })
    const token = await createAccountToken(admin.id, 'admin_setup')
    await logAudit({
      actorId: session.user.id,
      action: 'Granted admin access',
      detail: `Created new admin account ${admin.email} (setup link issued, expires in 24h)`,
      targetType: 'admin',
      targetId: admin.id,
    })
    return NextResponse.json({ admin, setupUrl: setupLinkUrl(token, req) }, { status: 201 })
  } catch (err: unknown) {
    // findUnique-then-create is not atomic: two concurrent requests for the
    // same email both see "no existing account" and both attempt the insert.
    // The unique index catches the loser, which must be a 409 — not an
    // unhandled 500. Matches the handling in admin/settings and
    // admin/creators/[id].
    if (typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2002') {
      return NextResponse.json({ error: 'That email is already in use by another account' }, { status: 409 })
    }
    throw err
  }
}

// DELETE — remove admin access (demote to regular account). You cannot
// demote yourself, and the last OTHER admin cannot be removed.
export async function DELETE(req: Request) {
  const session = await getActiveSession()
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await rateLimit(`admin-team:${session.user.id}`, 10, 60_000))) {
    await logAudit({
      actorId: session.user.id,
      action: 'Remove admin access blocked',
      detail: 'Rate limit exceeded',
      targetType: 'admin',
    })
    return NextResponse.json({ error: 'Too many requests — please slow down' }, { status: 429 })
  }

  const { adminId, currentPassword } = await req.json()

  const auth = await verifyCurrentPassword(session.user.id, currentPassword)
  if (!auth.ok) {
    await logAudit({
      actorId: session.user.id,
      action: 'Remove admin access DENIED',
      detail: `Re-authentication failed (${auth.reason})`,
      targetType: 'admin',
      targetId: typeof adminId === 'string' ? adminId : undefined,
    })
    return auth.response
  }

  if (!adminId) return NextResponse.json({ error: 'adminId required' }, { status: 400 })
  if (adminId === session.user.id) {
    return NextResponse.json({ error: 'You cannot remove your own admin access' }, { status: 400 })
  }

  const target = await prisma.creator.findUnique({
    where: { id: adminId },
    select: { id: true, email: true, isAdmin: true },
  })
  if (!target?.isAdmin) return NextResponse.json({ error: 'Not an admin account' }, { status: 404 })

  // Count admins OTHER than the caller. Counting the caller's own account was
  // the flaw: an attacker could demote every genuine admin one by one,
  // because their own account kept the total above the threshold. Requiring
  // one other admin to survive means a takeover always leaves a legitimate
  // admin able to respond.
  const otherAdminCount = await prisma.creator.count({
    where: { isAdmin: true, id: { not: session.user.id } },
  })
  if (otherAdminCount <= 1) {
    return NextResponse.json(
      { error: 'There must always be at least one other admin besides you. Add another admin before removing this one.' },
      { status: 400 },
    )
  }

  await prisma.creator.update({ where: { id: adminId }, data: { isAdmin: false } })
  await logAudit({
    actorId: session.user.id,
    action: 'Removed admin access',
    detail: `Demoted ${target.email}`,
    targetType: 'admin',
    targetId: adminId,
  })
  return NextResponse.json({ ok: true })
}
