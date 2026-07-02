import { prisma } from '@/lib/prisma'
import { getActiveSession } from "@/lib/session"
import { NextResponse } from 'next/server'

export async function POST(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getActiveSession()
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { messageId } = await req.json()

    const room = await prisma.chatRoom.findUnique({ where: { slug: params.slug } })
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

    await prisma.chatRoom.update({
      where: { slug: params.slug },
      data: { pinnedMessageId: messageId || null },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to pin message' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getActiveSession()
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.chatRoom.update({
      where: { slug: params.slug },
      data: { pinnedMessageId: null },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to unpin' }, { status: 500 })
  }
}
