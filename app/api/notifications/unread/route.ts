import { prisma } from '@/lib/prisma'
import { getActiveSession } from "@/lib/session"
import { NextResponse } from 'next/server'

// Lightweight unread-count endpoint for the nav bell badge. The header calls
// this on every navigation, so it must stay cheap: an indexed COUNT on
// (creatorId, isRead) — NOT a fetch of the 30 latest rows. Also carries the
// throttled activity heartbeat, since this is now the per-navigation pulse.
export async function GET() {
  try {
    const session = await getActiveSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    // Activity heartbeat — throttled to once/hour per creator (guarded
    // update) so it powers accurate "active in last N days" segments
    // without a write storm at scale.
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
    prisma.creator.updateMany({
      where: { id: session.user.id, lastSeenAt: { lt: hourAgo } },
      data: { lastSeenAt: new Date() },
    }).catch(() => {})

    const unreadCount = await prisma.notification.count({
      where: { creatorId: session.user.id, isRead: false },
    })

    return NextResponse.json({ unreadCount })
  } catch {
    return NextResponse.json({ error: 'Failed to check unread' }, { status: 500 })
  }
}
