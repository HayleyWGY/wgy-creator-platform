import { getActiveSession } from "@/lib/session"
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { parsePage } from '@/lib/pagination'

export async function GET(req: Request) {
  const session = await getActiveSession()
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('q') || ''
  const statusFilter = searchParams.get('status') || ''
  // parsePage collapses missing/NaN/negative to page 1 — `?page=abc` used to
  // become NaN, reaching `skip: NaN` and throwing an unhandled 500.
  const page = parsePage(searchParams.get('page'))
  const pageSize = 20

  const where: Record<string, unknown> = {
    isAdmin: false,
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(statusFilter && statusFilter !== 'all' ? { membershipStatus: statusFilter } : {}),
  }

  const [creators, total] = await Promise.all([
    prisma.creator.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        profileImageUrl: true,
        membershipStatus: true,
        membershipType: true,
        joinedAt: true,
        lastSeenAt: true,
        instagramHandle: true,
        tiktokHandle: true,
        youtubeUrl: true,
        tags: {
          include: {
            tag: { select: { id: true, name: true, colour: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.creator.count({ where }),
  ])

  return NextResponse.json({ creators, total, page, pageSize })
}
