import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getActiveSession } from '@/lib/session'
import { rateLimit } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'

// PATCH — update the signed-in admin's own account (email and/or password).
// Requires the current password for either change.
export async function PATCH(req: Request) {
  const session = await getActiveSession()
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!rateLimit(`admin-settings:${session.user.id}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests — please slow down' }, { status: 429 })
  }

  const { email, currentPassword, newPassword } = await req.json()

  if (!currentPassword) {
    return NextResponse.json({ error: 'Your current password is required' }, { status: 400 })
  }

  const me = await prisma.creator.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, passwordHash: true },
  })
  if (!me || !bcrypt.compareSync(currentPassword, me.passwordHash)) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 403 })
  }

  const data: Record<string, string> = {}
  const changes: string[] = []

  if (typeof email === 'string' && email.trim() && email.trim().toLowerCase() !== me.email) {
    data.email = email.trim().toLowerCase()
    changes.push(`email changed to ${data.email}`)
  }

  if (typeof newPassword === 'string' && newPassword) {
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
    }
    data.passwordHash = bcrypt.hashSync(newPassword, 10)
    changes.push('password changed')
  }

  if (changes.length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  try {
    const updated = await prisma.creator.update({
      where: { id: me.id },
      data,
      select: { id: true, email: true },
    })
    await logAudit({
      actorId: me.id,
      action: 'Updated own account',
      detail: changes.join('; '),
      targetType: 'admin',
      targetId: me.id,
    })
    return NextResponse.json({ ok: true, email: updated.email })
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2002') {
      return NextResponse.json({ error: 'That email is already in use by another account' }, { status: 409 })
    }
    throw err
  }
}
