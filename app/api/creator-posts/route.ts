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

export async function GET(req: NextRequest) {
  const session = await getActiveSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const limit  = parseInt(searchParams.get('limit') || '20')
    const cursor = searchParams.get('cursor') || undefined

    const posts = await prisma.creatorPost.findMany({
      where: { isDeleted: false },
      include: {
        author: { select: authorSelect },
        comments: {
          where: { isDeleted: false },
          include: { author: { select: authorSelect } },
          orderBy: { createdAt: 'asc' },
          take: 10,
        },
        likes: { select: { creatorId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
    })

    return NextResponse.json({ posts })
  } catch (error) {
    console.error('[GET /api/creator-posts]', error)
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getActiveSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    if (!rateLimit(`post-create:${session.user.id}`, 5, 60_000)) {
      return NextResponse.json({ error: 'Too many requests — please slow down' }, { status: 429 })
    }

    const { body, imageUrl } = await req.json()

    if (!body?.trim()) {
      return NextResponse.json({ error: 'Post body is required' }, { status: 400 })
    }

    const wordCount = body.trim().split(/\s+/).length
    if (wordCount > 1000) {
      return NextResponse.json({ error: 'Post exceeds 1000 words' }, { status: 400 })
    }

    const post = await prisma.creatorPost.create({
      data: {
        authorId: session.user.id,
        body:     body.trim(),
        imageUrl: imageUrl || null,
      },
      include: {
        author:   { select: authorSelect },
        comments: true,
        likes:    true,
      },
    })

    return NextResponse.json({ post }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/creator-posts]', error)
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
  }
}
