import { prisma } from './prisma'
import { pingRealtime } from './realtime-server'

// Sends a direct message from an admin to a set of creators. Ensures each
// creator has a DM thread, inserts the message, and bumps the threads so
// they surface at the top of the admin inbox. Returns the number sent.
export async function sendDmToCreators(
  adminId: string,
  creatorIds: string[],
  body: string,
): Promise<number> {
  if (creatorIds.length === 0) return 0

  // Ensure a DM thread exists for each recipient
  const existing = await prisma.dmThread.findMany({
    where: { creatorId: { in: creatorIds } },
    select: { creatorId: true },
  })
  const have = new Set(existing.map(t => t.creatorId))
  const missing = creatorIds.filter(id => !have.has(id))
  if (missing.length > 0) {
    await prisma.dmThread.createMany({
      data: missing.map(creatorId => ({ creatorId })),
      skipDuplicates: true,
    })
  }

  const threads = await prisma.dmThread.findMany({
    where: { creatorId: { in: creatorIds } },
    select: { id: true },
  })
  const threadIds = threads.map(t => t.id)

  await prisma.$transaction([
    prisma.dmMessage.createMany({
      data: threadIds.map(threadId => ({ threadId, senderId: adminId, body })),
    }),
    prisma.dmThread.updateMany({
      where: { id: { in: threadIds } },
      data: { updatedAt: new Date() },
    }),
  ])

  // Wake every recipient's open chat plus the admin inbox (batched)
  pingRealtime([...threadIds.map(id => `dm:${id}`), 'admin-inbox']).catch(() => {})

  return threadIds.length
}
