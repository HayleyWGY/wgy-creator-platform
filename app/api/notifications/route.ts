import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

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
