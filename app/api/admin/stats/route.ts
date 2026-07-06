import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveSession } from '@/lib/session'

// GET — real numbers for the admin dashboard: stat cards, 12-month member
// growth (cumulative, from joinedAt), and the latest campaigns.
export async function GET() {
  const session = await getActiveSession()
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [totalCreators, activeSubscriptions, joinedThisMonth, joinDates, recentPosts] = await Promise.all([
    prisma.creator.count({
      where: { isAdmin: false, membershipStatus: { not: 'cancelled' } },
    }),
    prisma.creator.count({
      where: { isAdmin: false, membershipStatus: 'active', membershipType: 'paid' },
    }),
    prisma.creator.count({
      where: { isAdmin: false, membershipStatus: { not: 'cancelled' }, joinedAt: { gte: monthStart } },
    }),
    prisma.creator.findMany({
      where: { isAdmin: false, membershipStatus: { not: 'cancelled' } },
      select: { joinedAt: true },
    }),
    prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true,
        title: true,
        status: true,
        postType: true,
        section: { select: { name: true } },
      },
    }),
  ])

  // Cumulative member count at the end of each of the last 12 months
  const months: { label: string; count: number }[] = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const label = new Date(now.getFullYear(), now.getMonth() - i, 1)
      .toLocaleDateString('en-GB', { month: 'short' })
    const count = joinDates.filter(c => c.joinedAt < end).length
    months.push({ label, count })
  }

  return NextResponse.json({
    totalCreators,
    activeSubscriptions,
    joinedThisMonth,
    monthlyGrowth: months,
    recentCampaigns: recentPosts.map(p => ({
      id: p.id,
      name: p.title,
      section: p.postType || p.section?.name || '—',
      status: p.status === 'published' ? 'LIVE' : p.status === 'closed' ? 'CLOSED' : 'DRAFT',
    })),
  })
}
