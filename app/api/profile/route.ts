import { getActiveSession } from "@/lib/session"
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

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
  // Campaign tags — only ones the admin has marked visible to the creator.
  // Shown as "My Collabs" on the profile.
  tags: {
    where: { isVisibleToCreator: true },
    select: { tag: { select: { id: true, name: true } } },
    orderBy: { assignedAt: 'desc' as const },
  },
}

const PATCHABLE_FIELDS = new Set([
  'firstName', 'lastName', 'bio',
  'instagramHandle', 'tiktokHandle', 'youtubeUrl',
  'profileImageUrl', 'contentNiches',
  'addressLine1', 'addressLine2', 'city', 'postcode', 'country',
])

export async function GET() {
  const session = await getActiveSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const creator = await prisma.creator.findUnique({
    where: { id: session.user.id },
    select: SAFE_SELECT,
  })
  if (!creator) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ creator })
}

export async function PATCH(req: Request) {
  const session = await getActiveSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await rateLimit(`profile-update:${session.user.id}`, 20, 60_000))) {
    return NextResponse.json({ error: 'Too many requests — please slow down' }, { status: 429 })
  }

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

// DELETE — creator deletes their own account.
// We scrub all personal data and permanently revoke access rather than
// hard-deleting the row: community content stays intact (attributed to
// "Deleted User"), foreign keys stay valid, and the Stripe IDs remain so
// support can reconcile the subscription (deleting the account does NOT
// cancel Stripe billing — the user is told to email support for that).
// membershipStatus 'cancelled' blocks sign-in and, via getActiveSession,
// revokes any live session on its next request.
export async function DELETE() {
  const session = await getActiveSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Admin accounts are managed by WGY, not self-deletable.
  if (session.user.isAdmin) {
    return NextResponse.json({ error: 'Admin accounts cannot be deleted here' }, { status: 400 })
  }

  const id = session.user.id

  await prisma.$transaction([
    prisma.creator.update({
      where: { id },
      data: {
        email: `deleted-${id}@deleted.wegotyouagency.com`,
        passwordHash: 'DELETED', // never matches bcrypt.compare
        firstName: 'Deleted',
        lastName: 'User',
        bio: null,
        profileImageUrl: null,
        instagramHandle: null,
        tiktokHandle: null,
        youtubeUrl: null,
        otherSocialLinks: Prisma.JsonNull,
        addressLine1: null,
        addressLine2: null,
        city: null,
        postcode: null,
        country: null,
        contentNiches: [],
        dateOfBirth: null,
        address: null,
        contactNumber: null,
        gender: null,
        membershipStatus: 'cancelled',
        cancelledAt: new Date(),
      },
    }),
    // Notifications are personal to the account — remove them outright.
    prisma.notification.deleteMany({ where: { creatorId: id } }),
  ])

  return NextResponse.json({ success: true })
}
