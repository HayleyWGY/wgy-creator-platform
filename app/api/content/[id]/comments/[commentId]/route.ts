import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveSession } from '@/lib/session'

// DELETE — author or admin removes a comment
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const session = await getActiveSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const comment = await prisma.contentComment.findUnique({
      where: { id: params.commentId },
      select: { id: true, authorId: true, contentId: true },
    })
    if (!comment || comment.contentId !== params.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (comment.authorId !== session.user.id && !session.user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.contentComment.delete({ where: { id: params.commentId } })
    await prisma.postContent.update({
      where: { id: params.id },
      data: { commentsCount: { decrement: 1 } },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/content/[id]/comments/[commentId]]', error)
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 })
  }
}
