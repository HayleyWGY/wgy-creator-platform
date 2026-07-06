import { prisma } from './prisma'

// Records a significant admin action for the Settings audit log.
// Await it — an unawaited insert can be killed when the lambda freezes.
// Never throws: a failed audit write must not break the action itself.
export async function logAudit(entry: {
  actorId: string
  action: string
  detail?: string
  targetType?: string
  targetId?: string
}) {
  try {
    await prisma.auditLog.create({ data: entry })
  } catch (err) {
    console.error('[audit]', err)
  }
}
