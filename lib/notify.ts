import { prisma } from '@/lib/prisma'

/**
 * Create an in-app notification for every active (non-admin) creator.
 * Shows up instantly in the bell icon / notifications page.
 *
 * NOTE: this is also the future hook point for real push notifications —
 * when the app is wrapped for the app stores and a push provider (e.g.
 * OneSignal via the wrapper) is connected, its send call slots in here so
 * every announcement + go-live automatically reaches lock screens too.
 */
export interface NotifyInput {
  type: 'announcement' | 'campaign' | 'content'
  title: string
  description: string
  referenceId?: string | null
}

// One publish fans out ~1,000 rows through a max:1 pool. Insert in chunks so it
// is several small writes rather than a single large one that ties up the pool.
const INSERT_CHUNK = 200

/**
 * Create an in-app notification for every active (non-admin) creator.
 *
 * MUST be awaited by callers. On Vercel the lambda is frozen the moment the
 * response returns, so an unawaited fan-out is frequently killed mid-write —
 * the same hazard lib/audit.ts documents.
 */
export async function notifyAllCreators(input: NotifyInput): Promise<number> {
  return notifyAllCreatorsMany([input])
}

/**
 * Fan out SEVERAL announcements in one pass, fetching the recipient list only
 * ONCE. This is the cron's case: when five scheduled items go live at 3am,
 * calling notifyAllCreators five times re-queries all ~1,000 creators five
 * times and issues five separate write bursts. Here the creators are read once
 * and every row is inserted in shared chunks.
 *
 * Returns the total number of notification rows written.
 */
export async function notifyAllCreatorsMany(inputs: NotifyInput[]): Promise<number> {
  if (inputs.length === 0) return 0

  const creators = await prisma.creator.findMany({
    where: { isAdmin: false, membershipStatus: { not: 'cancelled' } },
    select: { id: true },
  })
  if (creators.length === 0) return 0

  const rows = inputs.flatMap(input =>
    creators.map(c => ({
      creatorId: c.id,
      type: input.type,
      title: input.title,
      description: input.description,
      referenceId: input.referenceId ?? null,
    })),
  )

  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    await prisma.notification.createMany({ data: rows.slice(i, i + INSERT_CHUNK) })
  }

  return rows.length
}
