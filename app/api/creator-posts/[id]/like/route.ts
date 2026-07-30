import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getPayingSession } from "@/lib/session"
import { rateLimit } from '@/lib/rate-limit'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getPayingSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    // Matches the campaign-like limit for consistency
    if (!(await rateLimit(`post-like:${session.user.id}`, 30, 60_000))) {
      return NextResponse.json({ error: 'Too many requests — please slow down' }, { status: 429 })
    }

    const key = { postId_creatorId: { postId: params.id, creatorId: session.user.id } }
    const existing = await prisma.creatorPostLike.findUnique({ where: key })

    // The like row and the denormalised count MUST move together, or the count
    // drifts permanently. Each branch pairs the two writes in a $transaction so
    // they commit or roll back as one — matching the campaign-like route.
    //
    // The findUnique above is only a hint: two concurrent requests (a mobile
    // double-tap) can both read the same value and both enter the same branch.
    // We make each branch idempotent against that race so the loser is a no-op,
    // never an unhandled 500 or a second increment/decrement:
    //   create loses -> P2002 (row already exists): already liked
    //   delete loses -> P2025 (row already gone):   already unliked
    // In both cases the transaction rolls back, so the count is untouched.
    try {
      if (existing) {
        await prisma.$transaction([
          prisma.creatorPostLike.delete({ where: key }),
          prisma.creatorPost.update({
            where: { id: params.id },
            data:  { likesCount: { decrement: 1 } },
          }),
        ])
        return NextResponse.json({ liked: false })
      } else {
        await prisma.$transaction([
          prisma.creatorPostLike.create({
            data: { postId: params.id, creatorId: session.user.id },
          }),
          prisma.creatorPost.update({
            where: { id: params.id },
            data:  { likesCount: { increment: 1 } },
          }),
        ])
        return NextResponse.json({ liked: true })
      }
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        // Idempotent outcomes for the lost race — report the settled state.
        if (err.code === 'P2002') return NextResponse.json({ liked: true })
        if (err.code === 'P2025') return NextResponse.json({ liked: false })
      }
      throw err
    }
  } catch (error) {
    console.error('[POST /api/creator-posts/[id]/like]', error)
    return NextResponse.json({ error: 'Failed to toggle like' }, { status: 500 })
  }
}
