import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

const SAFE_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  bio: true,
  profileImageUrl: true,
  instagramHandle: true,
  tiktokHandle: true,
  youtubeUrl: true,
  contentNiches: true,
  membershipStatus: true,
  membershipType: true,
  joinedAt: true,
  lastSeenAt: true,
  addressLine1: true,
  addressLine2: true,
  city: true,
  postcode: true,
  country: true,
}

const PATCHABLE_FIELDS = new Set([
  'firstName', 'lastName', 'bio',
  'instagramHandle', 'tiktokHandle', 'youtubeUrl',
  'profileImageUrl', 'contentNiches',
  'addressLine1', 'addressLine2', 'city', 'postcode', 'country',
])

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const creator = await prisma.creator.findUnique({
    where: { id: session.user.id },
    select: SAFE_SELECT,
  })
  if (!creator) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ creator })
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const data: Record<string, unknown> = {}
  for (const key of Object.keys(body)) {
    if (PATCHABLE_FIELDS.has(key)) data[key] = body[key]
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
  }

  const creator = await prisma.creator.update({
    where: { id: session.user.id },
    data,
    select: SAFE_SELECT,
  })
  return NextResponse.json({ creator })
}
