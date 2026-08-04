import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveSession } from '@/lib/session'
import { rateLimit } from '@/lib/rate-limit'

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

  // Fire-and-forget from the client, but still throttled: without a limit a
  // member can POST in a loop to inflate applyClicks (an admin-facing metric).
  if (!(await rateLimit(`apply-click:${session.user.id}`, 20, 60_000))) {
    return NextResponse.json({ error: 'Too many requests — please slow down' }, { status: 429 })
  }

  const { campaignId } = await req.json().catch(() => ({ campaignId: null }))

  // Only count the click — and only mark the onboarding "first apply" — when the
  // id is a REAL opportunity a member could apply to: a published post in an
  // OPPORTUNITIES section. Previously any Post id (a draft, a community post, or
  // a made-up string) both incremented applyClicks and completed onboarding.
  let validCampaign = false
  if (typeof campaignId === 'string' && campaignId) {
    const post = await prisma.post.findFirst({
      where: { id: campaignId, status: 'published', section: { group: 'OPPORTUNITIES' } },
      select: { id: true },
    })
    validCampaign = post !== null
  }

  if (!validCampaign) {
    // Nothing to record — a spoofed/irrelevant id must not touch either metric.
    return NextResponse.json({ success: true })
  }

  await prisma.creator.updateMany({
    where: { id: session.user.id, firstApplyAt: null },
    data: { firstApplyAt: new Date() },
  })

  await prisma.post.update({
    where: { id: campaignId },
    data: { applyClicks: { increment: 1 } },
  }).catch(() => {})

  return NextResponse.json({ success: true })
}
