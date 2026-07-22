import { revalidateTag } from 'next/cache'
import { prisma } from './prisma'
import { notifyAllCreators } from './notify'

// Publishes any campaigns/content whose scheduled time has arrived.
//
// Called lazily from the campaign and content list endpoints (so scheduled
// items go live on the next read — effectively instant under real traffic)
// and from the /api/cron/publish-scheduled route as a safety net. The
// per-instance throttle keeps hot endpoints from re-running the check on
// every request; updateMany's status guard makes concurrent lambdas safe
// (only the one that wins the flip sends the notification).
let lastRun = 0

// What the in-app/push notification says when a piece of content goes
// live, by section. Returns null for sections that publish silently.
export function contentNotifyTitle(section: string | null): string | null {
  if (section === 'updates') return 'New update from WGY'
  if (section === 'about' || section === 'faq') return null
  return 'New in the Learning Lounge'
}

export async function publishDueScheduled(force = false) {
  if (!force && Date.now() - lastRun < 60_000) return
  lastRun = Date.now()

  const now = new Date()

  const [duePosts, dueContent] = await Promise.all([
    prisma.post.findMany({
      where: { status: 'scheduled', scheduledAt: { lte: now } },
      select: { id: true, title: true, brandName: true, slug: true },
    }),
    prisma.postContent.findMany({
      where: { status: 'scheduled', scheduledAt: { lte: now } },
      select: { id: true, title: true, section: true },
    }),
  ])

  for (const post of duePosts) {
    const res = await prisma.post.updateMany({
      where: { id: post.id, status: 'scheduled' },
      data: { status: 'published', publishedAt: now },
    })
    if (res.count > 0) {
      await notifyAllCreators({
        type: 'campaign',
        title: 'New opportunity live',
        description: `${post.brandName ?? 'A brand'} — ${post.title}`,
        referenceId: post.slug ?? post.id,
      }).catch(err => console.error('[scheduled publish notify post]', err))
    }
  }

  for (const item of dueContent) {
    const res = await prisma.postContent.updateMany({
      where: { id: item.id, status: 'scheduled' },
      data: { status: 'published', publishedAt: now },
    })
    if (res.count > 0) {
      const title = contentNotifyTitle(item.section)
      // About/FAQ pages are evergreen — publish those silently
      if (title) {
        await notifyAllCreators({
          type: 'content',
          title,
          description: item.title,
          referenceId: item.id,
        }).catch(err => console.error('[scheduled publish notify content]', err))
      }
    }
  }

  // If anything went live, bust the members' cached lists so the newly
  // published items appear immediately rather than after the revalidate.
  if (dueContent.length > 0) revalidateTag('content')
  if (duePosts.length > 0) revalidateTag('campaigns')

  return { posts: duePosts.length, content: dueContent.length }
}
