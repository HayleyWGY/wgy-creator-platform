import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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
    const post = await prisma.creatorPost.findFirst({
      where: { id: params.id, isDeleted: false },
      include: {
        author: { select: authorSelect },
        comments: {
          where: { isDeleted: false },
          include: { author: { select: authorSelect } },
          orderBy: { createdAt: 'asc' },
        },
        likes: { select: { creatorId: true } },
      },
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json({ post })
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
    const session = await getServerSession(authOptions)
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
