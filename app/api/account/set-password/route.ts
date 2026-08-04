import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'
import { peekAccountToken, consumeAccountToken, SETUP_PURPOSES } from '@/lib/account-token'

/**
 * Redeem a setup link and choose a password.
 *
 * Deliberately UNAUTHENTICATED — the whole point is that the account has no
 * usable password yet. The token is the credential, so it is the only thing
 * trusted here, and it is single-use, expiring and stored only as a hash.
 *
 * Rate-limited by IP: the token is 32 random bytes and not guessable, but an
 * unauthenticated endpoint should never be an unlimited bcrypt trigger.
 */

// GET — is this link still valid? Drives whether the page shows a form or an
// "expired" message. Returns no account details: a valid token proves
// possession of the link, not the right to learn who it belongs to.
export async function GET(req: Request) {
  if (!(await rateLimit(`set-password-check:${getClientIp(req)}`, 30, 60_000))) {
    return NextResponse.json({ error: 'Too many requests — please slow down' }, { status: 429 })
  }

  const token = new URL(req.url).searchParams.get('token')
  const creatorId = await peekAccountToken(token, SETUP_PURPOSES)
  return NextResponse.json({ valid: creatorId !== null })
}

export async function POST(req: Request) {
  if (!(await rateLimit(`set-password:${getClientIp(req)}`, 10, 60_000))) {
    return NextResponse.json({ error: 'Too many requests — please slow down' }, { status: 429 })
  }

  const { token, password } = await req.json().catch(() => ({}))

  if (typeof password !== 'string') {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  // The minimum depends on the account: admins must use 12 characters (they can
  // trigger takeover-level actions), members 8. Peek the token — which does NOT
  // consume it — to learn whose account this is before validating length, so a
  // too-short password never burns a valid setup link.
  const peekedId = await peekAccountToken(token, SETUP_PURPOSES)
  let minLength = 8
  if (peekedId) {
    const account = await prisma.creator.findUnique({ where: { id: peekedId }, select: { isAdmin: true } })
    if (account?.isAdmin) minLength = 12
  }
  if (password.length < minLength) {
    return NextResponse.json(
      { error: `Password must be at least ${minLength} characters` },
      { status: 400 },
    )
  }

  // Consume BEFORE writing the password: the update is guarded by the
  // database, so a token can never be redeemed twice even under concurrency.
  const creatorId = await consumeAccountToken(token, SETUP_PURPOSES)
  if (!creatorId) {
    return NextResponse.json(
      { error: 'This link is invalid, has expired, or has already been used.' },
      { status: 400 },
    )
  }

  await prisma.creator.update({
    where: { id: creatorId },
    data: {
      passwordHash: await bcrypt.hash(password, 10),
      passwordSetAt: new Date(),
    },
  })

  await logAudit({
    actorId: creatorId,
    action: 'Completed account setup',
    detail: 'Password set via setup link',
    targetType: 'admin',
    targetId: creatorId,
  })

  return NextResponse.json({ ok: true })
}
