import { NextRequest, NextResponse } from 'next/server'
import { publishDueScheduled } from '@/lib/scheduled-publish'
import { runOnboardingDrip } from '@/lib/onboarding-drip'
import { reconcileCounts } from '@/lib/reconcile-counts'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET — invoked by Vercel Cron (see vercel.json). Runs the daily jobs:
// publishing due scheduled campaigns/content (lazy publishing on the list
// endpoints is the primary mechanism; this is the safety net) and the
// onboarding DM drip. Kept as one cron because Vercel Hobby limits cron
// jobs; each job is independent so one failing won't block the other.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result: Record<string, unknown> = {}

  try {
    result.scheduled = await publishDueScheduled(true)
  } catch (err) {
    console.error('[cron publish-scheduled]', err)
    result.scheduledError = true
  }

  try {
    // Attribute drip DMs to the earliest admin account (WGY)
    const admin = await prisma.creator.findFirst({
      where: { isAdmin: true },
      orderBy: { joinedAt: 'asc' },
      select: { id: true },
    })
    result.onboardingSent = admin ? await runOnboardingDrip(admin.id) : 0
  } catch (err) {
    console.error('[cron onboarding-drip]', err)
    result.onboardingError = true
  }

  try {
    // Heal any drift between the denormalised like/comment counts and the real
    // rows. Cheap at our scale; independent of the jobs above.
    result.reconcile = await reconcileCounts()
  } catch (err) {
    console.error('[cron reconcile-counts]', err)
    result.reconcileError = true
  }

  return NextResponse.json({ ok: true, ...result })
}
