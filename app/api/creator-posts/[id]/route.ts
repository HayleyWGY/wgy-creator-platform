import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPayingSession } from "@/lib/session"

const authorSelect = {
  id: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getPayingSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  try {
    const post = await prisma.creatorPost.findFirst({
      where: { id: params.id, isDeleted: false },
      include: {
        author: { select: authorSelect },
        // Bounded. This was unbounded — every comment on the post — and is
        // also dead weight: the detail page fetches comments from the
        // dedicated /comments endpoint (which paginates), not from here. The
        // cap stops one popular post being a DoS while leaving the field for
        // any caller that does read it.
        comments: {
          where: { isDeleted: false },
          include: { author: { select: authorSelect } },
          orderBy: { createdAt: 'asc' },
          take: 10,
        },
        // Bounded per-user lookup for filled-heart state; the count comes from
        // the likesCount scalar. Was `likes: { select: creatorId }` — every
        // like row for the post.
        likes: { where: { creatorId: session.user.id }, select: { creatorId: true } },
      },
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const { likes, ...rest } = post
    return NextResponse.json({ post: { ...rest, likedByMe: likes.length > 0 } })
  } catch (error) {
    console.error('[GET /api/creator-posts/[id]]', error)
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getPayingSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const post = await prisma.creatorPost.findUnique({ where: { id: params.id } })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const isAuthor = post.authorId === session.user.id
    const isAdmin  = session.user.isAdmin

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.creatorPost.update({
      where: { id: params.id },
      data:  { isDeleted: true },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/creator-posts/[id]]', error)
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
  }
}
