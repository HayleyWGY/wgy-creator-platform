import { prisma } from '@/lib/prisma'
import { getActiveSession } from "@/lib/session"
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await getActiveSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    // Activity heartbeat — this endpoint is polled on every navigation, so
    // it's a good pulse. Throttled to once/hour per creator (guarded update)
    // so it powers accurate "active in last N days" segments without a
    // write storm at scale.
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
    prisma.creator.updateMany({
      where: { id: session.user.id, lastSeenAt: { lt: hourAgo } },
      data: { lastSeenAt: new Date() },
    }).catch(() => {})

    const notifications = await prisma.notification.findMany({
      where: { creatorId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })

    const unreadCount = notifications.filter(n => !n.isRead).length

    return NextResponse.json({ notifications, unreadCount })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}
