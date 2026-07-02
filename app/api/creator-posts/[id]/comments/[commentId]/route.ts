import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveSession } from "@/lib/session"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const session = await getActiveSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const comment = await prisma.creatorPostComment.findUnique({
      where: { id: params.commentId },
      select: { id: true, authorId: true, postId: true },
    })

    if (!comment || comment.postId !== params.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Only author or admin can delete
    const user = session.user as { id: string; isAdmin?: boolean }
    if (comment.authorId !== user.id && !user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.creatorPostComment.delete({ where: { id: params.commentId } })

    await prisma.creatorPost.update({
      where: { id: params.id },
      data:  { commentsCount: { decrement: 1 } },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/creator-posts/[id]/comments/[commentId]]', error)
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 })
  }
}
