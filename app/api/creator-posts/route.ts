import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPayingSession } from "@/lib/session"
import { rateLimit } from '@/lib/rate-limit'
import { clampLimit } from '@/lib/pagination'

// Feed page size: default 20, hard cap 50. The cap is the DoS fix — an
// unbounded `take` combined with the (previously unbounded) likes include
// let one request pull hundreds of thousands of rows through a max:1 pool.
const POSTS_DEFAULT_LIMIT = 20
const POSTS_MAX_LIMIT = 50

const authorSelect = {
  id: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
}

export async function GET(req: NextRequest) {
  const session = await getPayingSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const limit  = clampLimit(searchParams.get('limit'), { def: POSTS_DEFAULT_LIMIT, max: POSTS_MAX_LIMIT })
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
        // The like COUNT comes from the scalar likesCount column (maintained
        // by the like route), so no _count is needed. This bounded lookup
        // returns at most one row — the caller's own like, if any — to drive
        // the filled-heart state. It replaces `likes: { select: creatorId }`,
        // which pulled EVERY like row for EVERY post: 800 rows for an
        // 800-like post, unbounded and never even read by the client.
        likes: { where: { creatorId: session.user.id }, select: { creatorId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
    })

    // Collapse the one-or-zero-row likes lookup into a boolean and drop the
    // array, so the response carries `likedByMe` instead of raw like rows.
    const shaped = posts.map(({ likes, ...post }) => ({
      ...post,
      likedByMe: likes.length > 0,
    }))

    return NextResponse.json({ posts: shaped })
  } catch (error) {
    console.error('[GET /api/creator-posts]', error)
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getPayingSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    if (!(await rateLimit(`post-create:${session.user.id}`, 5, 60_000))) {
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
