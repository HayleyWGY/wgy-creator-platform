import { prisma } from '@/lib/prisma'
import { getActiveSession } from "@/lib/session"
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const session = await getActiveSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const thread = await prisma.dmThread.findUnique({
      where: { creatorId: session.user.id },
      select: { id: true },
    })

    if (thread) {
      await prisma.dmMessage.updateMany({
        where: { threadId: thread.id, isRead: false },
        data: { isRead: true },
      })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to mark read' }, { status: 500 })
  }
}
