import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'

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
  try {
    const comments = await prisma.creatorPostComment.findMany({
      where: { postId: params.id, isDeleted: false, parentId: null },
      include: {
        author: { select: authorSelect },
        replies: {
          where: { isDeleted: false },
          include: { author: { select: authorSelect } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({ comments })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    if (!rateLimit(`comment-create:${session.user.id}`, 10, 60_000)) {
      return NextResponse.json({ error: 'Too many requests — please slow down' }, { status: 429 })
    }

    const { body, parentId } = await req.json()
    if (!body?.trim()) {
      return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 })
    }

    const comment = await prisma.creatorPostComment.create({
      data: {
        postId: params.id,
        authorId: session.user.id,
        body: body.trim(),
        parentId: parentId || null,
      },
      include: {
        author: { select: authorSelect },
        replies: true,
      },
    })

    await prisma.creatorPost.update({
      where: { id: params.id },
      data: { commentsCount: { increment: 1 } },
    })

    // Notify parent comment author on reply
    if (parentId) {
      const parentComment = await prisma.creatorPostComment.findUnique({
        where: { id: parentId },
        include: { post: { include: { author: { select: { firstName: true } } } } },
      })
      if (parentComment && parentComment.authorId !== session.user.id) {
        await prisma.notification.create({
          data: {
            creatorId: parentComment.authorId,
            type: 'reply',
            title: 'New reply to your comment',
            description: `${session.user.firstName} ${session.user.lastName} replied to your comment on ${parentComment.post.author.firstName}'s post`,
            referenceId: params.id,
          },
        })
      }
    }

    // Notify post author on top-level comment
    if (!parentId) {
      const post = await prisma.creatorPost.findUnique({
        where: { id: params.id },
        select: { authorId: true },
      })
      if (post && post.authorId !== session.user.id) {
        await prisma.notification.create({
          data: {
            creatorId: post.authorId,
            type: 'comment',
            title: 'New comment on your post',
            description: `${session.user.firstName} ${session.user.lastName} commented on your post`,
            referenceId: params.id,
          },
        })
      }
    }

    return NextResponse.json({ comment }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/creator-posts/[id]/comments]', error)
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 })
  }
}
