import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// GET — paginated audit log, newest first
export async function GET(req: Request) {
  const session = await getActiveSession()
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const pageSize = 50

  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        actor: { select: { firstName: true, lastName: true, email: true } },
      },
    }),
    prisma.auditLog.count(),
  ])

  return NextResponse.json({ entries, total, page, pageSize })
}
