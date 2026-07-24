import { getActiveSession } from "@/lib/session"
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { logAudit } from '@/lib/audit'
import { encryptField, decryptField } from '@/lib/field-crypto'
import { createAccountToken, setupLinkUrl } from '@/lib/account-token'
import { requireReauth, REAUTH_REQUIRED_FIELDS } from '@/lib/admin-reauth'
import { notifyEmailChanged } from '@/lib/transactional-email'

// dob is the decrypted "YYYY-MM-DD" string
function calcAge(dobStr: string | null): number | null {
  if (!dobStr) return null
  const dob = new Date(dobStr)
  if (isNaN(dob.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return age
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getActiveSession()
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const creator = await prisma.creator.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      profileImageUrl: true,
      bio: true,
      instagramHandle: true,
      tiktokHandle: true,
      youtubeUrl: true,
      contentNiches: true,
      membershipStatus: true,
      membershipType: true,
      stripeCustomerId: true,
      stripeSubId: true,
      joinedAt: true,
      lastSeenAt: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      postcode: true,
      country: true,
      // Sensitive fields (admin only)
      dateOfBirth: true,
      address: true,
      contactNumber: true,
      gender: true,
      tags: {
        include: {
          tag: { select: { id: true, name: true, colour: true } },
        },
      },
    },
  })

  if (!creator) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Recent completed campaign applications, for admin context
  const applications = await prisma.campaignApplication.findMany({
    where: { creatorId: params.id },
    orderBy: { appliedAt: 'desc' },
    take: 5,
    select: { id: true, campaignName: true, appliedAt: true },
  })

  const dateOfBirth = decryptField(creator.dateOfBirth)
  return NextResponse.json({
    creator: {
      ...creator,
      dateOfBirth,
      address: decryptField(creator.address),
      contactNumber: decryptField(creator.contactNumber),
      gender: decryptField(creator.gender),
      age: calcAge(dateOfBirth),
      applications,
    },
  })
}

const ADMIN_PATCHABLE = new Set([
  'email',
  'firstName', 'lastName', 'bio',
  'instagramHandle', 'tiktokHandle', 'youtubeUrl',
  'membershipStatus', 'membershipType',
  'dateOfBirth', 'address', 'contactNumber', 'gender',
  'addressLine1', 'addressLine2', 'city', 'postcode', 'country',
  'contentNiches',
])

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getActiveSession()
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  // ── Reinstate a deleted account ─────────────────────────────────────
  // Account deletion scrubs personal data (unrecoverable by design), so
  // reinstating means the admin re-enters the basics and we issue a one-time
  // setup link. The member chooses their own password.
  //
  // This replaced a generated temporary password. That was wrong twice over:
  // it was built from Math.random() (xorshift128+, state-recoverable, so the
  // password was predictable rather than random), and it was a working
  // credential valid indefinitely, known to whoever passed it on. A setup
  // link expires in 24h, works once, and never becomes a credential.
  if (body.reinstate) {
    const { email, firstName, lastName } = body.reinstate
    if (!email?.trim() || !firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json({ error: 'Email, first name and last name are required' }, { status: 400 })
    }

    // Re-authenticate: reinstating issues a working setup link, which is a
    // takeover primitive in impact terms even with the deleted-state guard
    // below. Runs first so a stolen cookie cannot probe account state either.
    const denied = await requireReauth({
      actorId: session.user.id,
      currentPassword: body.currentPassword,
      action: 'Reinstate account',
      targetType: 'creator',
      targetId: params.id,
    })
    if (denied) return denied
    // The target MUST actually be a deleted account.
    //
    // Without this the branch was an account-takeover primitive: it set
    // passwordHash, email and membershipStatus on whatever id the URL named,
    // so pointing it at an ACTIVE member returned working credentials for
    // that member — their DMs and their PII, which decrypts transparently on
    // read. The audit entry then recorded it as "Reinstated deleted account",
    // so the one control that should have caught it described it as routine.
    //
    // Three markers, all written by the DELETE handler in
    // app/api/profile/route.ts. Two of them (email, membershipStatus) are in
    // ADMIN_PATCHABLE, so an admin could set them by hand and forge a
    // deleted-looking account — checking only those would leave a two-step
    // version of the same attack. passwordHash is NOT admin-patchable, so the
    // 'DELETED' sentinel is the marker that cannot be forged through this
    // surface, and it is what actually anchors the check.
    const target = await prisma.creator.findUnique({
      where: { id: params.id },
      select: { id: true, email: true, membershipStatus: true, passwordHash: true, isAdmin: true },
    })
    if (!target) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const deletedEmail = `deleted-${params.id}@deleted.wegotyouagency.com`
    const isGenuinelyDeleted =
      target.passwordHash === 'DELETED' &&
      target.membershipStatus === 'cancelled' &&
      target.email === deletedEmail

    if (!isGenuinelyDeleted) {
      // Audit the REJECTION too. A reinstate aimed at a live account is not a
      // mistake anyone makes by accident, and this is the entry that shows it.
      await logAudit({
        actorId: session.user.id,
        action: 'Reinstate REJECTED — account is not deleted',
        detail:
          `Attempted reinstate of ${target.email} ` +
          `(status: ${target.membershipStatus}, ` +
          `password: ${target.passwordHash === 'DELETED' ? 'scrubbed' : 'intact'}, ` +
          `email: ${target.email === deletedEmail ? 'scrubbed' : 'intact'})`,
        targetType: 'creator',
        targetId: params.id,
      })
      return NextResponse.json(
        { error: 'This account has not been deleted, so it cannot be reinstated.' },
        { status: 400 },
      )
    }

    // A password nobody knows, so the account cannot be signed into until the
    // setup link is redeemed.
    const unusablePassword = crypto.randomBytes(32).toString('base64')
    try {
      const creator = await prisma.creator.update({
        where: { id: params.id },
        data: {
          email: email.trim().toLowerCase(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          passwordHash: bcrypt.hashSync(unusablePassword, 10),
          membershipStatus: 'active',
          failedLoginAttempts: 0,
          lockedUntil: null,
          passwordSetAt: null,
        },
        select: { id: true, email: true, firstName: true, lastName: true, membershipStatus: true },
      })
      const token = await createAccountToken(creator.id, 'account_setup')
      await logAudit({
        actorId: session.user.id,
        action: 'Reinstated deleted account',
        // Records what was VERIFIED, not just what was intended. The old
        // wording asserted the account had been deleted without anything
        // having checked it, which is what let a takeover read as routine.
        detail:
          `Verified deleted (scrubbed email + password sentinel + cancelled), ` +
          `reinstated as ${creator.email}. Setup link issued, expires in 24h.`,
        targetType: 'creator',
        targetId: creator.id,
      })
      return NextResponse.json({ creator, setupUrl: setupLinkUrl(token, req) })
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2002') {
        return NextResponse.json({ error: 'That email is already in use by another account' }, { status: 409 })
      }
      throw err
    }
  }

  // ── Tag management ──────────────────────────────────────────────────
  if (body.addTagName) {
    const name = String(body.addTagName).trim()
    if (!name) return NextResponse.json({ error: 'Tag name required' }, { status: 400 })
    let tag = await prisma.tag.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } })
    if (!tag) {
      tag = await prisma.tag.create({ data: { name, createdById: session.user.id } })
    }
    await prisma.creatorTag.upsert({
      where: { creatorId_tagId: { creatorId: params.id, tagId: tag.id } },
      update: {},
      create: { creatorId: params.id, tagId: tag.id, assignedById: session.user.id },
    })
    return NextResponse.json({ tag })
  }

  if (body.removeTagId) {
    await prisma.creatorTag.deleteMany({
      where: { creatorId: params.id, tagId: String(body.removeTagId) },
    })
    return NextResponse.json({ success: true })
  }

  // ── Standard field updates ──────────────────────────────────────────
  const data: Record<string, unknown> = {}
  for (const key of Object.keys(body)) {
    if (ADMIN_PATCHABLE.has(key)) data[key] = body[key]
  }

  if (typeof data.email === 'string') {
    data.email = data.email.trim().toLowerCase()
    if (!data.email) return NextResponse.json({ error: 'Email cannot be empty' }, { status: 400 })
  }

  // Re-authenticate before changing email or membershipStatus.
  //
  // Both are takeover primitives. The address receives setup links today and
  // password-reset links once Resend ships, so redirecting it hands over the
  // account; membershipStatus 'cancelled' revokes a live session and is also
  // half of the forged-delete path into reinstate. Everything else here
  // (names, socials, tags, PII fields) is ordinary admin editing and stays
  // unguarded — gating it all would train admins to type their password
  // constantly, which is its own weakness.
  //
  // Compared against the CURRENT values so a no-op resubmit of an unchanged
  // form is not treated as a privileged change.
  const before = await prisma.creator.findUnique({
    where: { id: params.id },
    select: { email: true, membershipStatus: true },
  })
  if (!before) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  const privilegedChanges = REAUTH_REQUIRED_FIELDS.filter(
    field => data[field] !== undefined && data[field] !== before[field],
  )

  if (privilegedChanges.length > 0) {
    const denied = await requireReauth({
      actorId: session.user.id,
      currentPassword: body.currentPassword,
      action: `Change member ${privilegedChanges.join(' + ')}`,
      targetType: 'creator',
      targetId: params.id,
      detail: `on ${before.email}`,
    })
    if (denied) return denied
  }

  // Encrypt the sensitive PII fields before they touch the database.
  // DOB is normalised to "YYYY-MM-DD" first so age maths stays reliable.
  if (typeof data.dateOfBirth === 'string' && data.dateOfBirth) {
    const parsed = new Date(data.dateOfBirth)
    if (isNaN(parsed.getTime())) {
      return NextResponse.json({ error: 'Invalid date of birth' }, { status: 400 })
    }
    data.dateOfBirth = parsed.toISOString().slice(0, 10)
  }
  for (const key of ['dateOfBirth', 'address', 'contactNumber', 'gender'] as const) {
    if (key in data) {
      data[key] = data[key] ? encryptField(String(data[key])) : null
    }
  }

  // Stamp when a member is cancelled — feeds the monthly-cancellations
  // analytics. Kept on reactivation so history survives.
  if (data.membershipStatus === 'cancelled') {
    data.cancelledAt = new Date()
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
  }

  try {
    const creator = await prisma.creator.update({
      where: { id: params.id },
      data,
      select: { id: true, firstName: true, lastName: true, email: true, membershipStatus: true },
    })
    await logAudit({
      actorId: session.user.id,
      action: data.membershipStatus
        ? `Set membership status to ${data.membershipStatus}`
        : 'Updated creator details',
      detail:
        `${creator.firstName} ${creator.lastName} (${creator.email}) — fields: ` +
        `${Object.keys(data).filter(k => k !== 'cancelledAt').join(', ')}` +
        // Record the old address explicitly. Once the row is updated the
        // previous value is gone, and "who did this account used to belong
        // to" is the first question anyone investigating will ask.
        (privilegedChanges.includes('email') ? ` — email changed from ${before.email}` : '') +
        (privilegedChanges.length > 0 ? ' [re-authenticated]' : ''),
      targetType: 'creator',
      targetId: creator.id,
    })

    // Tell the member their address was changed — primarily at the OLD
    // address, which is where the actual owner still reads mail. Notifying
    // only the new one would inform whoever performed the change and nobody
    // else. Not awaited into the response path: a mail failure must not fail
    // the update, and notifyEmailChanged never throws.
    if (privilegedChanges.includes('email')) {
      notifyEmailChanged({
        oldEmail: before.email,
        newEmail: creator.email,
        changedByAdmin: session.user.email ?? session.user.id,
      }).catch(err => console.error('[notifyEmailChanged]', err))
    }

    return NextResponse.json({ creator })
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2002') {
      return NextResponse.json({ error: 'That email is already in use by another account' }, { status: 409 })
    }
    throw err
  }
}
