import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET — return the current creator's DM thread (create if missing)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let thread = await prisma.dmThread.findUnique({
    where: { creatorId: session.user.id },
    include: {
      messages: {
        where: { isDeleted: false },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, profileImageUrl: true, isAdmin: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 100,
      },
    },
  })

  if (!thread) {
    thread = await prisma.dmThread.create({
      data: { creatorId: session.user.id },
      include: {
        messages: {
          where: { isDeleted: false },
          include: {
            sender: { select: { id: true, firstName: true, lastName: true, profileImageUrl: true, isAdmin: true } },
          },
          orderBy: { createdAt: 'asc' },
          take: 100,
        },
      },
    })
  } else {
    // Mark all admin messages as read
    await prisma.dmMessage.updateMany({
      where: { threadId: thread.id, senderId: { not: session.user.id }, isRead: false },
      data: { isRead: true },
    })
  }

  return NextResponse.json({ thread })
}

// POST — creator sends a message in their own thread
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { body, imageUrl } = await req.json()
  if (!body?.trim() && !imageUrl) {
    return NextResponse.json({ error: 'Message body required' }, { status: 400 })
  }

  let thread = await prisma.dmThread.findUnique({ where: { creatorId: session.user.id } })
  if (!thread) {
    thread = await prisma.dmThread.create({ data: { creatorId: session.user.id } })
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
