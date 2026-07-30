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

  // Applying is paid value: a member whose payment has failed is blocked here
  // (not on getPayingSession) so we can return a specific, actionable message
  // the UI shows, rather than a generic 401. Admins are staff and pass through.
  if (session.user.membershipStatus === 'payment_failed' && !session.user.isAdmin) {
    return NextResponse.json(
      { error: 'payment_update_needed', message: 'Update your payment details to apply.' },
      { status: 402 },
    )
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
