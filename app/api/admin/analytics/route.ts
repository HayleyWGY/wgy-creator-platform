import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveSession } from '@/lib/session'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// Shared base filter: real members only (non-admin, not cancelled).
const MEMBER = { isAdmin: false, membershipStatus: { not: 'cancelled' as const } }

// GET — real numbers for the admin Analytics page: 12-month member growth,
// 12-month cancellations, activity, campaign engagement and the onboarding
// funnel.
//
// All aggregation is done IN THE DATABASE via bounded count() queries — the
// route never loads member rows into JS to filter them. The previous version
// pulled every member row (incl. the wide, encrypted `members` select) and
// bucketed in JavaScript, an unbounded pattern that grew with the member table
// and — on an admin endpoint — was a cheap way for a compromised session to
// load the database.
//
// Deliberately NOT raw SQL: Prisma groupBy can't express date_trunc, but the
// repo keeps a zero-$queryRaw invariant (no injection surface). At these
// volumes ~35 indexed counts are trivial and keep that invariant intact. See
// the ticket discussion for why the raw date_trunc GROUP BY was not worth it.
export async function GET() {
  const session = await getActiveSession()
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!(await rateLimit(`admin-analytics:${session.user.id}`, 30, 60_000))) {
    return NextResponse.json({ error: 'Too many requests — please slow down' }, { status: 429 })
  }

  const now = new Date()
  const day7 = new Date(now.getTime() - 7 * 86_400_000)
  const day30 = new Date(now.getTime() - 30 * 86_400_000)

  // Calendar-month ranges for the last 12 months (oldest first).
  const monthRanges = []
  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    monthRanges.push({ start, end, label: start.toLocaleDateString('en-GB', { month: 'short' }) })
  }

  const [
    joinedPerMonth,
    cancelledPerMonth,
    baseBeforeWindow,
    totalMembers,
    photo,
    socials,
    address,
    applied,
    saidHi,
    active7,
    active30,
    cancelledTotal,
    topCampaigns,
  ] = await Promise.all([
    // Joins per month (counts, not rows).
    Promise.all(monthRanges.map(r =>
      prisma.creator.count({ where: { ...MEMBER, joinedAt: { gte: r.start, lt: r.end } } }),
    )),
    // Cancellations per month.
    Promise.all(monthRanges.map(r =>
      prisma.creator.count({ where: { isAdmin: false, cancelledAt: { gte: r.start, lt: r.end } } }),
    )),
    // Members who joined BEFORE the 12-month window, so the running total below
    // starts from the right base rather than needing 12 more cumulative counts.
    prisma.creator.count({ where: { ...MEMBER, joinedAt: { lt: monthRanges[0].start } } }),

    // Onboarding funnel — one count per step.
    prisma.creator.count({ where: MEMBER }),
    prisma.creator.count({ where: { ...MEMBER, profileImageUrl: { not: null } } }),
    prisma.creator.count({ where: { ...MEMBER, OR: [
      { instagramHandle: { not: null } }, { tiktokHandle: { not: null } }, { youtubeUrl: { not: null } },
    ] } }),
    prisma.creator.count({ where: { ...MEMBER, OR: [
      { address: { not: null } }, { addressLine1: { not: null } },
    ] } }),
    prisma.creator.count({ where: { ...MEMBER, firstApplyAt: { not: null } } }),
    // "Said hi" — has at least one non-deleted message in the group chat.
    // Relation filter, so no separate groupBy + id-set intersection needed.
    prisma.creator.count({ where: { ...MEMBER,
      chatMessages: { some: { isDeleted: false, room: { slug: 'group-chat' } } },
    } }),

    prisma.creator.count({ where: { ...MEMBER, lastSeenAt: { gte: day7 } } }),
    prisma.creator.count({ where: { ...MEMBER, lastSeenAt: { gte: day30 } } }),
    prisma.creator.count({ where: { isAdmin: false, cancelledAt: { not: null } } }),

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
  ])

  // Build the 12-month series; the cumulative "total" is derived from the base
  // plus a running sum of joins, so no extra queries are needed for it.
  let running = baseBeforeWindow
  const months = monthRanges.map((r, i) => {
    running += joinedPerMonth[i]
    return { label: r.label, joined: joinedPerMonth[i], cancelled: cancelledPerMonth[i], total: running }
  })

  const funnel = { total: totalMembers, photo, socials, address, saidHi, applied }

  const campaigns = topCampaigns
    .map(c => ({ ...c, engagement: c.likesCount + c.commentsCount + c.applyClicks }))
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 10)

  return NextResponse.json({
    months,
    active7,
    active30,
    totalMembers,
    cancelledTotal,
    funnel,
    campaigns,
  })
}
