import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveSession } from '@/lib/session'

// POST — fired (fire-and-forget) when a creator taps Apply on any
// opportunity. Records their first-ever apply for the onboarding
// checklist. Applications themselves happen on the external portal.
export async function POST() {
  const session = await getActiveSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  await prisma.creator.updateMany({
    where: { id: session.user.id, firstApplyAt: null },
    data: { firstApplyAt: new Date() },
  })

  return NextResponse.json({ success: true })
}
