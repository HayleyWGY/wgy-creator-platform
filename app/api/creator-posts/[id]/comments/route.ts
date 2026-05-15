import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const { body } = await req.json()

    if (!body?.trim()) {
      return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 })
    }

    const comment = await prisma.creatorPostComment.create({
      data: {
        postId:   params.id,
        authorId: session.user.id,
        body:     body.trim(),
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImageUrl: true,
          },
        },
      },
    })

    await prisma.creatorPost.update({
      where: { id: params.id },
      data:  { commentsCount: { increment: 1 } },
    })

    return NextResponse.json({ comment }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/creator-posts/[id]/comments]', error)
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 })
  }
}
