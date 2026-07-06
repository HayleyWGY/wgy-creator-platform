import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getActiveSession } from '@/lib/session'
import { rateLimit } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'

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
  if (!rateLimit(`admin-team:${session.user.id}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests — please slow down' }, { status: 429 })
  }

  const { email, firstName, lastName } = await req.json()
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
  if (!cleanEmail) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

  const existing = await prisma.creator.findFirst({
    where: { email: { equals: cleanEmail, mode: 'insensitive' } },
  })

  if (existing) {
    if (existing.isAdmin) {
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

  const tempPassword = `WGY-${Math.random().toString(36).slice(2, 8)}-${Math.floor(1000 + Math.random() * 9000)}`
  const admin = await prisma.creator.create({
    data: {
      email: cleanEmail,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      passwordHash: bcrypt.hashSync(tempPassword, 10),
      isAdmin: true,
      membershipStatus: 'active',
      membershipType: 'team',
    },
    select: { id: true, firstName: true, lastName: true, email: true },
  })
  await logAudit({
    actorId: session.user.id,
    action: 'Granted admin access',
    detail: `Created new admin account ${admin.email}`,
    targetType: 'admin',
    targetId: admin.id,
  })
  return NextResponse.json({ admin, tempPassword }, { status: 201 })
}

// DELETE — remove admin access (demote to regular account). You cannot
// demote yourself and the last admin cannot be removed.
export async function DELETE(req: Request) {
  const session = await getActiveSession()
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { adminId } = await req.json()
  if (!adminId) return NextResponse.json({ error: 'adminId required' }, { status: 400 })
  if (adminId === session.user.id) {
    return NextResponse.json({ error: 'You cannot remove your own admin access' }, { status: 400 })
  }

  const target = await prisma.creator.findUnique({
    where: { id: adminId },
    select: { id: true, email: true, isAdmin: true },
  })
  if (!target?.isAdmin) return NextResponse.json({ error: 'Not an admin account' }, { status: 404 })

  const adminCount = await prisma.creator.count({ where: { isAdmin: true } })
  if (adminCount <= 1) {
    return NextResponse.json({ error: 'There must always be at least one admin' }, { status: 400 })
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
