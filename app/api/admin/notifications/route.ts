import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveSession } from '@/lib/session'
import { rateLimit } from '@/lib/rate-limit'
import { notifyAllCreators } from '@/lib/notify'

// GET — recent announcements sent (one entry per broadcast)
export async function GET() {
  const session = await getActiveSession()
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const recent = await prisma.notification.findMany({
    where: { type: 'announcement' },
    distinct: ['title', 'description'],
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { title: true, description: true, createdAt: true },
  })

  return NextResponse.json({ recent })
}

// POST — broadcast a custom announcement to every active creator
export async function POST(req: NextRequest) {
  const session = await getActiveSession()
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!rateLimit(`announce:${session.user.id}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too many requests — please slow down' }, { status: 429 })
  }

  const { title, description } = await req.json()
  if (!title?.trim() || !description?.trim()) {
    return NextResponse.json({ error: 'Title and message are required' }, { status: 400 })
  }

  const recipients = await notifyAllCreators({
    type: 'announcement',
    title: title.trim(),
    description: description.trim(),
  })

  return NextResponse.json({ recipients })
}
