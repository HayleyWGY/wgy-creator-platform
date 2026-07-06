import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveSession } from '@/lib/session'

// GET /api/search?q= — searches live opportunities and published
// Learning Lounge content by title/brand.
export async function GET(req: NextRequest) {
  const session = await getActiveSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) {
    return NextResponse.json({ campaigns: [], content: [] })
  }

  const [campaigns, content] = await Promise.all([
    prisma.post.findMany({
      where: {
        // Closed campaigns stay searchable — only drafts are hidden
        status: { in: ['published', 'closed'] },
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { brandName: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: { publishedAt: 'desc' },
      take: 8,
      select: { id: true, slug: true, title: true, brandName: true, campaignType: true },
    }),
    prisma.postContent.findMany({
      where: {
        status: 'published',
        title: { contains: q, mode: 'insensitive' },
      },
      orderBy: { publishedAt: 'desc' },
      take: 8,
      select: { id: true, title: true, contentType: true, section: true },
    }),
  ])

  return NextResponse.json({ campaigns, content })
}
