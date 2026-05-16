import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const room = await prisma.chatRoom.findUnique({ where: { slug: params.slug } })
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  const messages = await prisma.chatMessage.findMany({
    where: { roomId: room.id, isDeleted: false },
    include: {
      author: { select: { id: true, firstName: true, lastName: true, profileImageUrl: true, isAdmin: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
  })

  return NextResponse.json({ messages })
}

export async function POST(
  req: Request,
  { params }: { params: { slug: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { body, imageUrl } = await req.json()
  if (!body?.trim() && !imageUrl) {
    return NextResponse.json({ error: 'Message body required' }, { status: 400 })
  }

  const room = await prisma.chatRoom.findUnique({ where: { slug: params.slug } })
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  // Block @everyone/@all for non-admins
  if (!session.user.isAdmin) {
    const lower = (body || '').toLowerCase()
    if (lower.includes('@everyone') || lower.includes('@all') || lower.includes('@channel')) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
    }
  }

  const message = await prisma.chatMessage.create({
    data: {
      roomId: room.id,
      authorId: session.user.id,
      body: body?.trim() || '',
      imageUrl: imageUrl || null,
    },
    include: {
      author: { select: { id: true, firstName: true, lastName: true, profileImageUrl: true, isAdmin: true } },
    },
  })

  return NextResponse.json({ message }, { status: 201 })
}
