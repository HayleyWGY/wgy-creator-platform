import { getActiveSession } from "@/lib/session"
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

function calcAge(dob: Date | null): number | null {
  if (!dob) return null
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

  return NextResponse.json({
    creator: {
      ...creator,
      age: calcAge(creator.dateOfBirth),
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
  // reinstating means the admin re-enters the basics and we issue a
  // temporary password, returned once in this response.
  if (body.reinstate) {
    const { email, firstName, lastName } = body.reinstate
    if (!email?.trim() || !firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json({ error: 'Email, first name and last name are required' }, { status: 400 })
    }
    const tempPassword = `WGY-${Math.random().toString(36).slice(2, 8)}-${Math.floor(1000 + Math.random() * 9000)}`
    try {
      const creator = await prisma.creator.update({
        where: { id: params.id },
        data: {
          email: email.trim().toLowerCase(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          passwordHash: bcrypt.hashSync(tempPassword, 10),
          membershipStatus: 'active',
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
        select: { id: true, email: true, firstName: true, lastName: true, membershipStatus: true },
      })
      return NextResponse.json({ creator, tempPassword })
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

  if (data.dateOfBirth) {
    data.dateOfBirth = new Date(data.dateOfBirth as string)
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
    return NextResponse.json({ creator })
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2002') {
      return NextResponse.json({ error: 'That email is already in use by another account' }, { status: 409 })
    }
    throw err
  }
}
