import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getPayingSession } from '@/lib/session'
import { rateLimit } from '@/lib/rate-limit'

// POST — toggle the current creator's like on a campaign.
// Accepts the campaign id or slug in the [id] segment.
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getPayingSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  if (!(await rateLimit(`campaign-like:${session.user.id}`, 30, 60_000))) {
    return NextResponse.json({ error: 'Too many requests — please slow down' }, { status: 429 })
  }

  const campaign = await prisma.post.findFirst({
    where: { OR: [{ id: params.id }, { slug: params.id }] },
    select: { id: true },
  })
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const key = { creatorId_postId: { creatorId: session.user.id, postId: campaign.id } }
  const existing = await prisma.like.findUnique({ where: key })

  // findUnique is only a hint: two concurrent requests (a double-tap) can both
  // read the same value and enter the same branch. The $transaction keeps each
  // row+count pair atomic, and the P2002/P2025 handling makes the lost race a
  // no-op instead of an unhandled 500 — the transaction rolls back, so the
  // count is never touched twice. Mirrors the creator-post like route.
  let liked: boolean
  try {
    if (existing) {
      await prisma.$transaction([
        prisma.like.delete({ where: key }),
        prisma.post.update({ where: { id: campaign.id }, data: { likesCount: { decrement: 1 } } }),
      ])
      liked = false
    } else {
      await prisma.$transaction([
        prisma.like.create({ data: { creatorId: session.user.id, postId: campaign.id } }),
        prisma.post.update({ where: { id: campaign.id }, data: { likesCount: { increment: 1 } } }),
      ])
      liked = true
    }
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') liked = true       // create lost: already liked
      else if (err.code === 'P2025') liked = false // delete lost: already unliked
      else throw err
    } else {
      throw err
    }
  }

  const { likesCount } = (await prisma.post.findUnique({
    where: { id: campaign.id },
    select: { likesCount: true },
  }))!

  return NextResponse.json({ liked, likesCount })
}
