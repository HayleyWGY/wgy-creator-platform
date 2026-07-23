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

// GET — comments for a Learning Lounge item (any signed-in member)
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getActiveSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const comments = await prisma.contentComment.findMany({
    where: { contentId: params.id },
    orderBy: { createdAt: 'asc' },
    include: { author: { select: authorSelect } },
  })

  return NextResponse.json({ comments })
}

// POST — add a comment
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getActiveSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    if (!(await rateLimit(`content-comment:${session.user.id}`, 10, 60_000))) {
      return NextResponse.json({ error: 'Too many requests — please slow down' }, { status: 429 })
    }

    const { body } = await req.json()
    if (!body?.trim()) {
      return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 })
    }

    const content = await prisma.postContent.findUnique({
      where: { id: params.id },
      select: { id: true },
    })
    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    const comment = await prisma.contentComment.create({
      data: {
        contentId: params.id,
        authorId: session.user.id,
        body: body.trim(),
      },
      include: { author: { select: authorSelect } },
    })

    await prisma.postContent.update({
      where: { id: params.id },
      data: { commentsCount: { increment: 1 } },
    })

    return NextResponse.json({ comment }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/content/[id]/comments]', error)
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 })
  }
}
