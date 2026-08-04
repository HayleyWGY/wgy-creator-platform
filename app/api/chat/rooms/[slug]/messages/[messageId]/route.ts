import { NextResponse } from 'next/server'
import { getPayingSession } from "@/lib/session"
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _req: Request,
  { params }: { params: { slug: string; messageId: string } }
) {
  const session = await getPayingSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Scope to the room in the URL: a message id that lives in another room is a
  // 404 here, so the slug param is enforced rather than decorative.
  const message = await prisma.chatMessage.findFirst({
    where: { id: params.messageId, room: { slug: params.slug } },
  })
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
