import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const existing = await prisma.creatorPostLike.findUnique({
      where: { postId_creatorId: { postId: params.id, creatorId: session.user.id } },
    })

    if (existing) {
      await prisma.creatorPostLike.delete({ where: { id: existing.id } })
      await prisma.creatorPost.update({
        where: { id: params.id },
        data:  { likesCount: { decrement: 1 } },
      })
      return NextResponse.json({ liked: false })
    } else {
      await prisma.creatorPostLike.create({
        data: { postId: params.id, creatorId: session.user.id },
      })
      await prisma.creatorPost.update({
        where: { id: params.id },
        data:  { likesCount: { increment: 1 } },
      })
      return NextResponse.json({ liked: true })
    }
  } catch (error) {
    console.error('[POST /api/creator-posts/[id]/like]', error)
    return NextResponse.json({ error: 'Failed to toggle like' }, { status: 500 })
  }
}
