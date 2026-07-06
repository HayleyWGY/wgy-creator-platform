import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// GET — real numbers for the admin Analytics page: 12-month member growth,
// 12-month cancellations, activity, campaign engagement and the
// onboarding funnel.
export async function GET() {
  const session = await getActiveSession()
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const day7 = new Date(now.getTime() - 7 * 86_400_000)
  const day30 = new Date(now.getTime() - 30 * 86_400_000)

  const [
    joinDates,
    cancelDates,
    active7,
    active30,
    members,
    topCampaigns,
    groupChatAuthors,
  ] = await Promise.all([
    prisma.creator.findMany({
      where: { isAdmin: false, membershipStatus: { not: 'cancelled' } },
      select: { joinedAt: true },
    }),
    prisma.creator.findMany({
      where: { isAdmin: false, cancelledAt: { not: null } },
      select: { cancelledAt: true },
    }),
    prisma.creator.count({
      where: { isAdmin: false, membershipStatus: { not: 'cancelled' }, lastSeenAt: { gte: day7 } },
    }),
    prisma.creator.count({
      where: { isAdmin: false, membershipStatus: { not: 'cancelled' }, lastSeenAt: { gte: day30 } },
    }),
    prisma.creator.findMany({
      where: { isAdmin: false, membershipStatus: { not: 'cancelled' } },
      select: {
        id: true,
        profileImageUrl: true,
        instagramHandle: true,
        tiktokHandle: true,
        youtubeUrl: true,
        address: true,
        addressLine1: true,
        firstApplyAt: true,
      },
    }),
    prisma.post.findMany({
      where: { status: { in: ['published', 'closed'] } },
      orderBy: [{ likesCount: 'desc' }],
      take: 50,
      select: {
        id: true,
        title: true,
        brandName: true,
        status: true,
        likesCount: true,
        commentsCount: true,
        applyClicks: true,
        publishedAt: true,
      },
    }),
    // Members who've spoken in the group chat (checklist "say hi" step)
    prisma.chatMessage.groupBy({
      by: ['authorId'],
      where: { isDeleted: false, room: { slug: 'group-chat' } },
    }),
  ])

  // Month buckets for the last 12 months
  const months: { label: string; joined: number; cancelled: number; total: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    months.push({
      label: start.toLocaleDateString('en-GB', { month: 'short' }),
      joined: joinDates.filter(c => c.joinedAt >= start && c.joinedAt < end).length,
      cancelled: cancelDates.filter(c => c.cancelledAt! >= start && c.cancelledAt! < end).length,
      total: joinDates.filter(c => c.joinedAt < end).length,
    })
  }

  // Onboarding funnel across current members
  const chatAuthorIds = new Set(groupChatAuthors.map(g => g.authorId))
  const funnel = {
    total: members.length,
    photo: members.filter(m => m.profileImageUrl).length,
    socials: members.filter(m => m.instagramHandle || m.tiktokHandle || m.youtubeUrl).length,
    address: members.filter(m => m.address || m.addressLine1).length,
    saidHi: members.filter(m => chatAuthorIds.has(m.id)).length,
    applied: members.filter(m => m.firstApplyAt).length,
  }

  // Rank campaigns by overall engagement
  const campaigns = topCampaigns
    .map(c => ({ ...c, engagement: c.likesCount + c.commentsCount + c.applyClicks }))
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 10)

  return NextResponse.json({
    months,
    active7,
    active30,
    totalMembers: members.length,
    cancelledTotal: cancelDates.length,
    funnel,
    campaigns,
  })
}
