import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveSession } from '@/lib/session'

// POST — fired (fire-and-forget) when a creator taps Apply on any
// opportunity. Records their first-ever apply for the onboarding
// checklist and counts the click against the campaign for analytics.
// Applications themselves happen on the external portal.
export async function POST(req: NextRequest) {
  const session = await getActiveSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { campaignId } = await req.json().catch(() => ({ campaignId: null }))

  await prisma.creator.updateMany({
    where: { id: session.user.id, firstApplyAt: null },
    data: { firstApplyAt: new Date() },
  })

  if (typeof campaignId === 'string' && campaignId) {
    await prisma.post.updateMany({
      where: { id: campaignId },
      data: { applyClicks: { increment: 1 } },
    }).catch(() => {})
  }

  return NextResponse.json({ success: true })
}
