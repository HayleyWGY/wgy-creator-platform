import { getActiveSession } from "@/lib/session"
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

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
  const data: Record<string, unknown> = {}
  for (const key of Object.keys(body)) {
    if (ADMIN_PATCHABLE.has(key)) data[key] = body[key]
  }

  if (data.dateOfBirth) {
    data.dateOfBirth = new Date(data.dateOfBirth as string)
  }

  const creator = await prisma.creator.update({
    where: { id: params.id },
    data,
    select: { id: true, firstName: true, lastName: true, membershipStatus: true },
  })
  return NextResponse.json({ creator })
}
