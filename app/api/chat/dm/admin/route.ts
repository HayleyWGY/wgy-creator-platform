import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET — list all DM threads (admin only)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const threads = await prisma.dmThread.findMany({
    include: {
      creator: { select: { id: true, firstName: true, lastName: true, profileImageUrl: true, email: true } },
      messages: {
        where: { isDeleted: false },
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          sender: { select: { id: true, firstName: true, isAdmin: true } },
        },
      },
      _count: {
        select: { messages: { where: { isRead: false, senderId: { not: session.user.id } } } },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({ threads })
}

// POST — admin sends a message to a creator's thread
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { creatorId, body, imageUrl } = await req.json()
  if (!creatorId) return NextResponse.json({ error: 'creatorId required' }, { status: 400 })
  if (!body?.trim() && !imageUrl) return NextResponse.json({ error: 'Message body required' }, { status: 400 })

  let thread = await prisma.dmThread.findUnique({ where: { creatorId } })
  if (!thread) {
    thread = await prisma.dmThread.create({ data: { creatorId } })
  }

  const message = await prisma.dmMessage.create({
    data: {
      threadId: thread.id,
      senderId: session.user.id,
      body: body?.trim() || '',
      imageUrl: imageUrl || null,
    },
    include: {
      sender: { select: { id: true, firstName: true, lastName: true, profileImageUrl: true, isAdmin: true } },
    },
  })

  await prisma.dmThread.update({ where: { id: thread.id }, data: { updatedAt: new Date() } })

  return NextResponse.json({ message }, { status: 201 })
}
