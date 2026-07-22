import { prisma } from '@/lib/prisma'
import { getActiveSession } from "@/lib/session"
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await getActiveSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    // Note: the activity heartbeat lives in /api/notifications/unread now
    // (the count endpoint the nav bell hits on every navigation), so this
    // full-list fetch stays read-only for the notifications page.
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
