import { prisma } from './prisma'
import { pingRealtime } from './realtime-server'

const DAY = 24 * 60 * 60 * 1000
// Only send a step to creators who crossed its day-threshold within this
// window, so enabling the sequence (or migrating old members) never
// retro-blasts people who joined long ago.
const GRACE_DAYS = 2

// Runs the onboarding DM drip. For each active step (a MessageTemplate in
// the 'onboarding' sequence), finds creators who joined dayOffset days ago
// (within the grace window) and haven't received that step yet, and sends
// it as a WGY DM. Idempotent via OnboardingMessageSent. Called from the
// daily cron. Sender is the given admin (WGY).
export async function runOnboardingDrip(senderAdminId: string) {
  const now = Date.now()

  const steps = await prisma.messageTemplate.findMany({
    where: { sequenceName: 'onboarding', isActive: true },
  })

  let totalSent = 0

  for (const step of steps) {
    const windowEnd = new Date(now - step.dayOffset * DAY)          // joined at least dayOffset ago
    const windowStart = new Date(now - (step.dayOffset + GRACE_DAYS) * DAY) // but not too long ago

    const due = await prisma.creator.findMany({
      where: {
        isAdmin: false,
        membershipStatus: { not: 'cancelled' },
        joinedAt: { gt: windowStart, lte: windowEnd },
      },
      select: { id: true, firstName: true },
    })
    if (due.length === 0) continue

    // Skip anyone already sent this step
    const already = await prisma.onboardingMessageSent.findMany({
      where: { templateId: step.id, creatorId: { in: due.map(d => d.id) } },
      select: { creatorId: true },
    })
    const sentSet = new Set(already.map(a => a.creatorId))
    const recipients = due.filter(d => !sentSet.has(d.id))
    if (recipients.length === 0) continue

    // Ensure a DM thread per recipient
    const ids = recipients.map(r => r.id)
    const existing = await prisma.dmThread.findMany({
      where: { creatorId: { in: ids } },
      select: { id: true, creatorId: true },
    })
    const threadByCreator = new Map(existing.map(t => [t.creatorId, t.id]))
    const missing = ids.filter(id => !threadByCreator.has(id))
    if (missing.length > 0) {
      await prisma.dmThread.createMany({ data: missing.map(creatorId => ({ creatorId })), skipDuplicates: true })
      const created = await prisma.dmThread.findMany({
        where: { creatorId: { in: missing } },
        select: { id: true, creatorId: true },
      })
      created.forEach(t => threadByCreator.set(t.creatorId, t.id))
    }

    // Personalise + send + log
    await prisma.dmMessage.createMany({
      data: recipients.map(r => ({
        threadId: threadByCreator.get(r.id)!,
        senderId: senderAdminId,
        body: step.body.replace(/\{firstName\}/g, r.firstName || 'there'),
      })),
    })
    await prisma.dmThread.updateMany({
      where: { id: { in: recipients.map(r => threadByCreator.get(r.id)!) } },
      data: { updatedAt: new Date() },
    })
    await prisma.onboardingMessageSent.createMany({
      data: recipients.map(r => ({ creatorId: r.id, templateId: step.id })),
    })

    // Wake recipients' open chats and the admin inbox
    pingRealtime([
      ...recipients.map(r => `dm:${threadByCreator.get(r.id)!}`),
      'admin-inbox',
    ]).catch(() => {})

    totalSent += recipients.length
  }

  return totalSent
}
