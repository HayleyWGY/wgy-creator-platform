import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveSession } from '@/lib/session'
import { rateLimit } from '@/lib/rate-limit'

// GET — all tags with creator counts (admin only)
export async function GET() {
  const session = await getActiveSession()
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tags = await prisma.tag.findMany({
    include: { _count: { select: { creators: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({
    tags: tags.map(t => ({
      id: t.id,
      name: t.name,
      colour: t.colour,
      count: t._count.creators,
      createdAt: t.createdAt,
    })),
  })
}

// POST — create a tag (admin only)
export async function POST(req: Request) {
  const session = await getActiveSession()
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!rateLimit(`admin-tag-create:${session.user.id}`, 20, 60_000)) {
    return NextResponse.json({ error: 'Too many requests — please slow down' }, { status: 429 })
  }

  const { name, colour } = await req.json()
  const trimmed = typeof name === 'string' ? name.trim() : ''
  if (!trimmed) return NextResponse.json({ error: 'Tag name is required' }, { status: 400 })
  if (trimmed.length > 60) return NextResponse.json({ error: 'Tag name is too long' }, { status: 400 })

  const existing = await prisma.tag.findFirst({
    where: { name: { equals: trimmed, mode: 'insensitive' } },
  })
  if (existing) {
    return NextResponse.json({ error: 'A tag with that name already exists' }, { status: 409 })
  }

  const tag = await prisma.tag.create({
    data: {
      name: trimmed,
      colour: typeof colour === 'string' && colour ? colour : '#e4dcd1',
      createdById: session.user.id,
    },
  })

  return NextResponse.json({ tag }, { status: 201 })
}
