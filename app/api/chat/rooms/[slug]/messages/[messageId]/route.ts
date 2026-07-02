import { NextResponse } from 'next/server'
import { getActiveSession } from "@/lib/session"
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _req: Request,
  { params }: { params: { slug: string; messageId: string } }
) {
  const session = await getActiveSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const message = await prisma.chatMessage.findUnique({ where: { id: params.messageId } })
  if (!message) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Admins can delete any message; creators can only delete their own
  if (!session.user.isAdmin && message.authorId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.chatMessage.update({
    where: { id: params.messageId },
    data: { isDeleted: true, deletedAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
