import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveSession } from "@/lib/session"
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
    // Community content is members-only. Without this the endpoint returned
    // comment bodies plus each author's id, name and profile image to anyone
    // holding a post id and no cookie at all.
    const session = await getActiveSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

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
    const session = await getActiveSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    if (!(await rateLimit(`comment-create:${session.user.id}`, 10, 60_000))) {
      return NextResponse.json({ error: 'Too many requests — please slow down' }, { status: 429 })
    }

    const { body, parentId } = await req.json()
    if (!body?.trim()) {
      return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 })
    }

    // The post must exist. Without this a bogus id reached the create() and
    // caused an unhandled foreign-key 500; it also gives us the author for the
    // top-level notification without a second query.
    const post = await prisma.creatorPost.findUnique({
      where: { id: params.id },
      select: { authorId: true, author: { select: { firstName: true } } },
    })
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    // Validate the parent belongs to THIS post (mirrors the campaigns route).
    // Without it, a parentId pointing into another post's thread was written
    // verbatim: the reply rendered under a stranger's comment, counts drifted,
    // and a fabricated notification fired. A non-existent parentId 500'd on the
    // foreign key.
    //
    // Depth cap: a parent must itself be top-level (parentId === null). The
    // render is only one level deep, so a reply-to-a-reply is written but never
    // shown — cap it at two levels rather than store invisible rows.
    let parent: { id: string; authorId: string } | null = null
    if (parentId) {
      const found = await prisma.creatorPostComment.findFirst({
        where: { id: parentId, postId: params.id, isDeleted: false },
        select: { id: true, authorId: true, parentId: true },
      })
      if (!found) return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 })
      if (found.parentId !== null) {
        return NextResponse.json({ error: 'You can only reply to a top-level comment' }, { status: 400 })
      }
      parent = { id: found.id, authorId: found.authorId }
    }

    const comment = await prisma.creatorPostComment.create({
      data: {
        postId: params.id,
        authorId: session.user.id,
        body: body.trim(),
        parentId: parent?.id ?? null,
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

    // Notifications are fire-and-forget: a notification failure must not fail
    // the comment that was already written (the campaigns route already does
    // this; creator-posts previously let a notify error surface as a 500).
    if (parent) {
      // Reply → notify the parent author (never yourself).
      if (parent.authorId !== session.user.id) {
        await prisma.notification.create({
          data: {
            creatorId: parent.authorId,
            type: 'reply',
            title: 'New reply to your comment',
            description: `${session.user.firstName} ${session.user.lastName} replied to your comment on ${post.author.firstName}'s post`,
            referenceId: params.id,
          },
        }).catch(err => console.error('[notify creator-post reply]', err))
      }
    } else if (post.authorId !== session.user.id) {
      // Top-level → notify the post author.
      await prisma.notification.create({
        data: {
          creatorId: post.authorId,
          type: 'comment',
          title: 'New comment on your post',
          description: `${session.user.firstName} ${session.user.lastName} commented on your post`,
          referenceId: params.id,
        },
      }).catch(err => console.error('[notify creator-post comment]', err))
    }

    return NextResponse.json({ comment }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/creator-posts/[id]/comments]', error)
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 })
  }
}
