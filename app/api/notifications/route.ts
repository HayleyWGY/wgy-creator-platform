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
    // Fetch the latest 30 for display, and count unread with a real query.
    // Filtering the fetched array (the old approach) could only ever count
    // unread AMONG the last 30 — it silently capped the badge and undercounted
    // anyone with more. count() uses the [creatorId, isRead] index directly.
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { creatorId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.notification.count({
        where: { creatorId: session.user.id, isRead: false },
      }),
    ])

    return NextResponse.json({ notifications, unreadCount })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}
