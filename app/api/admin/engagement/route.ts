import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

const authorSelect = { id: true, firstName: true, lastName: true, profileImageUrl: true, isAdmin: true }

interface EngagementItem {
  id: string
  kind: 'community' | 'campaign'
  action: 'comment' | 'reply'
  authorName: string
  authorImage: string | null
  body: string
  context: string
  href: string
  createdAt: string
}

// GET — unified feed of engagement on WGY content: comments on posts an
// admin authored, comments on campaigns (all WGY's), and replies to any
// WGY comment. Excludes comments made by admins themselves. Returns the
// list plus an unread count relative to this admin's last-seen watermark.
export async function GET() {
  const session = await getActiveSession()
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [communityComments, campaignComments, read] = await Promise.all([
    // Community: comment/reply where our post OR reply to our comment,
    // and not written by an admin
    prisma.creatorPostComment.findMany({
      where: {
        isDeleted: false,
        author: { isAdmin: false },
        OR: [
          { post: { author: { isAdmin: true } } },
          { parent: { author: { isAdmin: true } } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 60,
      include: {
        author: { select: authorSelect },
        post: { select: { id: true, author: { select: { firstName: true, lastName: true } } } },
        parent: { select: { id: true } },
      },
    }),
    // Campaign comments: campaigns are WGY's posts, so every non-admin
    // comment/reply is engagement on our content
    prisma.comment.findMany({
      where: { isDeleted: false, author: { isAdmin: false } },
      orderBy: { createdAt: 'desc' },
      take: 60,
      include: {
        author: { select: authorSelect },
        post: { select: { id: true, title: true, slug: true } },
        parent: { select: { id: true } },
      },
    }),
    prisma.adminRead.findUnique({ where: { adminId: session.user.id } }),
  ])

  const items: EngagementItem[] = []

  for (const c of communityComments) {
    items.push({
      id: c.id,
      kind: 'community',
      action: c.parentId ? 'reply' : 'comment',
      authorName: `${c.author.firstName} ${c.author.lastName}`,
      authorImage: c.author.profileImageUrl,
      body: c.body,
      context: c.parentId
        ? 'replied to your comment'
        : `commented on ${c.post.author.firstName}'s post`,
      href: `/admin/community/posts/${c.post.id}`,
      createdAt: c.createdAt.toISOString(),
    })
  }

  for (const c of campaignComments) {
    items.push({
      id: c.id,
      kind: 'campaign',
      action: c.parentId ? 'reply' : 'comment',
      authorName: `${c.author.firstName} ${c.author.lastName}`,
      authorImage: c.author.profileImageUrl,
      body: c.body,
      context: c.parentId
        ? `replied on "${c.post.title}"`
        : `commented on "${c.post.title}"`,
      href: `/admin/campaigns/${c.post.id}/comments`,
      createdAt: c.createdAt.toISOString(),
    })
  }

  items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  const trimmed = items.slice(0, 60)

  const seenAt = read?.engagementSeenAt ?? new Date(0)
  const unreadCount = trimmed.filter(i => new Date(i.createdAt) > seenAt).length

  return NextResponse.json({ items: trimmed, unreadCount, seenAt: seenAt.toISOString() })
}

// POST — mark the engagement feed as seen up to now (per admin)
export async function POST() {
  const session = await getActiveSession()
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await prisma.adminRead.upsert({
    where: { adminId: session.user.id },
    update: { engagementSeenAt: new Date() },
    create: { adminId: session.user.id, engagementSeenAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
