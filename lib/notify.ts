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
export async function notifyAllCreators(input: {
  type: 'announcement' | 'campaign' | 'content'
  title: string
  description: string
  referenceId?: string | null
}): Promise<number> {
  const creators = await prisma.creator.findMany({
    where: { isAdmin: false, membershipStatus: { not: 'cancelled' } },
    select: { id: true },
  })

  if (creators.length === 0) return 0

  await prisma.notification.createMany({
    data: creators.map(c => ({
      creatorId: c.id,
      type: input.type,
      title: input.title,
      description: input.description,
      referenceId: input.referenceId ?? null,
    })),
  })

  return creators.length
}
