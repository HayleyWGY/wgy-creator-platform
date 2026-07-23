import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveSession } from '@/lib/session'
import { rateLimit } from '@/lib/rate-limit'

// POST — toggle the current creator's like on a campaign.
// Accepts the campaign id or slug in the [id] segment.
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getActiveSession()
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

  let liked: boolean
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

  const { likesCount } = (await prisma.post.findUnique({
    where: { id: campaign.id },
    select: { likesCount: true },
  }))!

  return NextResponse.json({ liked, likesCount })
}
