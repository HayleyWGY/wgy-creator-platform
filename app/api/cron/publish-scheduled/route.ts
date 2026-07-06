import { NextRequest, NextResponse } from 'next/server'
import { publishDueScheduled } from '@/lib/scheduled-publish'

export const dynamic = 'force-dynamic'

// GET — invoked by Vercel Cron (see vercel.json). Publishes any scheduled
// campaigns/content that are due. Lazy publishing on the list endpoints is
// the primary mechanism; this is the safety net for quiet periods.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await publishDueScheduled(true)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[cron publish-scheduled]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
