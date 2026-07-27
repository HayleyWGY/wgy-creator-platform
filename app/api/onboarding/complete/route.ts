import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveSession } from '@/lib/session'

/**
 * Marks the signed-in member as having finished the profile-setup gate —
 * whether they filled it in or skipped. Stamps onboardedAt so middleware stops
 * routing them to /profile-setup, on this device and every future login.
 *
 * Idempotent and monotonic: only ever SETS the timestamp, and only if it is
 * still null, so a double-submit or a re-visit cannot move it. The client
 * follows this with session update({ onboarded: true }) for the immediate
 * token flip; this write is the durable source of truth for the next login.
 */
export async function POST() {
  const session = await getActiveSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  await prisma.creator.updateMany({
    where: { id: session.user.id, onboardedAt: null },
    data: { onboardedAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
