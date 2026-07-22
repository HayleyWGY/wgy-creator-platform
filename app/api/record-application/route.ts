import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyApplicationReceipt } from '@/lib/apply-handoff'

// Called server-to-server BY THE PORTAL after a creator successfully submits
// an application form they reached via the secure handoff. The signed
// receipt token identifies the creator (the browser can't forge it), so we
// can safely log which campaign they applied to.
//
// Disabled until APPLY_HANDOFF_SECRET is set (verify returns null → 404).

function corsHeaders() {
  const origin = process.env.NEXT_PUBLIC_PORTAL_URL
  const headers: Record<string, string> = { 'Cache-Control': 'no-store' }
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Vary'] = 'Origin'
  }
  return headers
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { ...corsHeaders(), 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' },
  })
}

export async function POST(req: NextRequest) {
  const { receipt, campaign_name, campaign_slug } = await req.json().catch(() => ({}))

  const creatorId = verifyApplicationReceipt(receipt)
  if (!creatorId) {
    return NextResponse.json({ error: 'Invalid or expired receipt' }, { status: 404, headers: corsHeaders() })
  }

  const name = typeof campaign_name === 'string' ? campaign_name.trim().slice(0, 200) : ''
  if (!name) {
    return NextResponse.json({ error: 'campaign_name required' }, { status: 400, headers: corsHeaders() })
  }
  const slug = typeof campaign_slug === 'string' && campaign_slug.trim() ? campaign_slug.trim().slice(0, 200) : null

  // Guard against a double-submit logging the same campaign twice in quick
  // succession — treat a same-campaign application within the last hour as a
  // duplicate rather than a new row.
  const recentDuplicate = await prisma.campaignApplication.findFirst({
    where: {
      creatorId,
      campaignName: name,
      appliedAt: { gt: new Date(Date.now() - 60 * 60 * 1000) },
    },
    select: { id: true },
  })
  if (!recentDuplicate) {
    await prisma.campaignApplication.create({
      data: { creatorId, campaignName: name, campaignSlug: slug },
    })
  }

  return NextResponse.json({ ok: true }, { headers: corsHeaders() })
}
