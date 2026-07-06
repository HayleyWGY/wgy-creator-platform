import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveSession } from '@/lib/session'
import { rateLimit } from '@/lib/rate-limit'

// GET — one tag with its creators (admin only)
export async function GET(
  _req: Request,
  { params }: { params: { tagId: string } }
) {
  const session = await getActiveSession()
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tag = await prisma.tag.findUnique({
    where: { id: params.tagId },
    include: {
      creators: {
        orderBy: { assignedAt: 'desc' },
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profileImageUrl: true,
              membershipStatus: true,
              joinedAt: true,
            },
          },
        },
      },
    },
  })

  if (!tag) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    tag: {
      id: tag.id,
      name: tag.name,
      colour: tag.colour,
      creators: tag.creators.map(ct => ({
        assignedAt: ct.assignedAt,
        ...ct.creator,
      })),
    },
  })
}

// PATCH — rename / recolour a tag, or add/remove a creator (admin only)
export async function PATCH(
  req: Request,
  { params }: { params: { tagId: string } }
) {
  const session = await getActiveSession()
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!rateLimit(`admin-tag-edit:${session.user.id}`, 60, 60_000)) {
    return NextResponse.json({ error: 'Too many requests — please slow down' }, { status: 429 })
  }

  const tag = await prisma.tag.findUnique({ where: { id: params.tagId } })
  if (!tag) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { name, colour, addCreatorId, removeCreatorId } = await req.json()

  if (addCreatorId) {
    const creator = await prisma.creator.findUnique({
      where: { id: addCreatorId }, select: { id: true },
    })
    if (!creator) return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    await prisma.creatorTag.upsert({
      where: { creatorId_tagId: { creatorId: addCreatorId, tagId: tag.id } },
      update: {},
      create: { creatorId: addCreatorId, tagId: tag.id, assignedById: session.user.id },
    })
    return NextResponse.json({ ok: true })
  }

  if (removeCreatorId) {
    await prisma.creatorTag.deleteMany({
      where: { creatorId: removeCreatorId, tagId: tag.id },
    })
    return NextResponse.json({ ok: true })
  }

  const data: Record<string, string> = {}
  if (typeof name === 'string' && name.trim()) {
    const trimmed = name.trim()
    if (trimmed.length > 60) return NextResponse.json({ error: 'Tag name is too long' }, { status: 400 })
    const clash = await prisma.tag.findFirst({
      where: { id: { not: tag.id }, name: { equals: trimmed, mode: 'insensitive' } },
    })
    if (clash) return NextResponse.json({ error: 'A tag with that name already exists' }, { status: 409 })
    data.name = trimmed
  }
  if (typeof colour === 'string' && colour) data.colour = colour

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const updated = await prisma.tag.update({ where: { id: tag.id }, data })
  return NextResponse.json({ tag: updated })
}

// DELETE — remove a tag and all its assignments (admin only)
export async function DELETE(
  _req: Request,
  { params }: { params: { tagId: string } }
) {
  const session = await getActiveSession()
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tag = await prisma.tag.findUnique({ where: { id: params.tagId } })
  if (!tag) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.$transaction([
    prisma.creatorTag.deleteMany({ where: { tagId: tag.id } }),
    prisma.tag.delete({ where: { id: tag.id } }),
  ])

  return NextResponse.json({ ok: true })
}
