import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveSession } from '@/lib/session'

// DELETE — author or admin removes a campaign comment (soft delete)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const session = await getActiveSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const comment = await prisma.comment.findUnique({
      where: { id: params.commentId },
      select: { id: true, authorId: true, postId: true, isDeleted: true },
    })
    if (!comment || comment.isDeleted) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (comment.authorId !== session.user.id && !session.user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.comment.update({
      where: { id: params.commentId },
      data: { isDeleted: true },
    })
    await prisma.post.update({
      where: { id: comment.postId },
      data: { commentsCount: { decrement: 1 } },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/campaigns/[id]/comments/[commentId]]', error)
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 })
  }
}
