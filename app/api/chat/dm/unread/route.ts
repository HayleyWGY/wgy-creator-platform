import { prisma } from '@/lib/prisma'
import { getActiveSession } from "@/lib/session"
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await getActiveSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const count = await prisma.dmMessage.count({
      where: {
        thread: { creatorId: session.user.id },
        isRead: false,
        sender: { isAdmin: true },
      },
    })

    return NextResponse.json({ hasUnread: count > 0, count })
  } catch {
    return NextResponse.json({ error: 'Failed to check unread' }, { status: 500 })
  }
}
