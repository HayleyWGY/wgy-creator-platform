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
    select: { id: true, title: true, slug: true },
  })
}

// GET — top-level comments on a campaign, each with its nested replies
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
    where: { postId: campaign.id, isDeleted: false, parentId: null },
    orderBy: { createdAt: 'asc' },
    include: {
      author: { select: authorSelect },
      replies: {
        where: { isDeleted: false },
        orderBy: { createdAt: 'asc' },
        include: { author: { select: authorSelect } },
      },
    },
  })

  return NextResponse.json({ comments })
}

// POST — add a comment or a threaded reply (pass parentId to reply)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getActiveSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    if (!(await rateLimit(`campaign-comment:${session.user.id}`, 10, 60_000))) {
      return NextResponse.json({ error: 'Too many requests — please slow down' }, { status: 429 })
    }

    const { body, parentId } = await req.json()
    if (!body?.trim()) {
      return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 })
    }

    const campaign = await resolveCampaign(params.id)
    if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Validate the parent belongs to this campaign, if replying
    let parent: { id: string; authorId: string } | null = null
    if (parentId) {
      parent = await prisma.comment.findFirst({
        where: { id: parentId, postId: campaign.id, isDeleted: false },
        select: { id: true, authorId: true },
      })
      if (!parent) return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 })
    }

    const comment = await prisma.comment.create({
      data: {
        postId: campaign.id,
        authorId: session.user.id,
        body: body.trim(),
        parentId: parent?.id ?? null,
      },
      include: {
        author: { select: authorSelect },
        replies: true,
      },
    })

    await prisma.post.update({
      where: { id: campaign.id },
      data: { commentsCount: { increment: 1 } },
    })

    // Notify the author of the comment being replied to (never yourself)
    if (parent && parent.authorId !== session.user.id) {
      await prisma.notification.create({
        data: {
          creatorId: parent.authorId,
          type: 'reply',
          title: 'New reply to your comment',
          description: `${session.user.isAdmin ? 'WGY' : session.user.firstName} replied on ${campaign.title}`,
          referenceId: campaign.slug ?? campaign.id,
        },
      }).catch(err => console.error('[notify campaign reply]', err))
    }

    return NextResponse.json({ comment }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/campaigns/[id]/comments]', error)
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 })
  }
}
