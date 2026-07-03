import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveSession } from '@/lib/session'
import { rateLimit } from '@/lib/rate-limit'

const authorSelect = {
  id: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  isAdmin: true,
}

// The [id] segment accepts either the campaign's id or its slug —
// the detail page loads campaigns by slug but posts comments by id.
async function resolveCampaign(idOrSlug: string) {
  return prisma.post.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    select: { id: true },
  })
}

// GET — comments on a campaign
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getActiveSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const campaign = await resolveCampaign(params.id)
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const comments = await prisma.comment.findMany({
    where: { postId: campaign.id, isDeleted: false },
    orderBy: { createdAt: 'asc' },
    include: { author: { select: authorSelect } },
  })

  return NextResponse.json({ comments })
}

// POST — add a comment
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getActiveSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    if (!rateLimit(`campaign-comment:${session.user.id}`, 10, 60_000)) {
      return NextResponse.json({ error: 'Too many requests — please slow down' }, { status: 429 })
    }

    const { body } = await req.json()
    if (!body?.trim()) {
      return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 })
    }

    const campaign = await resolveCampaign(params.id)
    if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const comment = await prisma.comment.create({
      data: {
        postId: campaign.id,
        authorId: session.user.id,
        body: body.trim(),
      },
      include: { author: { select: authorSelect } },
    })

    await prisma.post.update({
      where: { id: campaign.id },
      data: { commentsCount: { increment: 1 } },
    })

    return NextResponse.json({ comment }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/campaigns/[id]/comments]', error)
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 })
  }
}
