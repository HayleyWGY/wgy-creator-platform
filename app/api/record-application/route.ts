import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { verifyApplicationReceipt, RECEIPT_TTL_SECONDS } from '@/lib/apply-handoff'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

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
  // No session on this route (it's authenticated by a signed receipt),
  // so key by IP. Runs before receipt verification so invalid-token
  // spam is throttled too.
  if (!(await rateLimit(`record-application:${getClientIp(req)}`, 10, 60_000))) {
    return NextResponse.json({ error: 'Too many requests — please slow down' }, { status: 429, headers: corsHeaders() })
  }

  const { receipt, campaign_name, campaign_slug } = await req.json().catch(() => ({}))

  const claims = verifyApplicationReceipt(receipt)
  if (!claims) {
    return NextResponse.json({ error: 'Invalid or expired receipt' }, { status: 404, headers: corsHeaders() })
  }
  const { creatorId, jti } = claims

  // Rate-limit by the creator INSIDE the receipt, not just the source IP. The
  // abuse this stops — a creator looping their own receipt to spam rows — comes
  // from one member and can rotate IPs, so the IP limit above is not enough.
  if (!(await rateLimit(`record-application-cid:${creatorId}`, 10, 60_000))) {
    return NextResponse.json({ error: 'Too many requests — please slow down' }, { status: 429, headers: corsHeaders() })
  }

  const name = typeof campaign_name === 'string' ? campaign_name.trim().slice(0, 200) : ''
  if (!name) {
    return NextResponse.json({ error: 'campaign_name required' }, { status: 400, headers: corsHeaders() })
  }
  const slug = typeof campaign_slug === 'string' && campaign_slug.trim() ? campaign_slug.trim().slice(0, 200) : null

  // Best-effort purge of dead single-use rows (receipt already expired, so it
  // can no longer be replayed regardless). Kept out of the redemption
  // transaction and probabilistic so it isn't a write on every request.
  if (Math.random() < 0.05) {
    prisma.redeemedReceipt.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {})
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Single-use: claim the receipt's jti. The unique PK makes a replay of
      // the same receipt collide here (P2002), which we surface as a 409. This
      // is what closes the loop: a creator reading their own receipt out of the
      // form can submit it exactly once.
      await tx.redeemedReceipt.create({
        data: { jti, expiresAt: new Date(Date.now() + RECEIPT_TTL_SECONDS * 1000) },
      })

      // De-duplicate on campaignSlug, not free-text campaignName — varying the
      // name by a character used to defeat this entirely. Only a stable slug
      // identifies the same campaign. Falls back to name when the portal sends
      // no slug (older payloads).
      const dupWhere = slug
        ? { creatorId, campaignSlug: slug, appliedAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } }
        : { creatorId, campaignName: name, appliedAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } }
      const recentDuplicate = await tx.campaignApplication.findFirst({ where: dupWhere, select: { id: true } })

      if (!recentDuplicate) {
        await tx.campaignApplication.create({
          data: { creatorId, campaignName: name, campaignSlug: slug },
        })
      }
    })
  } catch (err) {
    // A replayed receipt (jti already redeemed) is a unique-constraint
    // violation. Reject it — the original submission was already logged, so
    // nothing is lost, and no new row is written.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: 'This application has already been recorded' }, { status: 409, headers: corsHeaders() })
    }
    throw err
  }

  return NextResponse.json({ ok: true }, { headers: corsHeaders() })
}
