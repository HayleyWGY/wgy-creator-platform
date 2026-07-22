import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyHandoffToken } from '@/lib/apply-handoff'

// Called server-to-server BY THE PORTAL to pre-fill an application form.
// Returns ONLY name, email, and address for the creator named by a valid
// signed handoff token. No social handles, no other fields.
//
// Locked to the configured portal origin via CORS. Disabled entirely until
// APPLY_HANDOFF_SECRET is set (verifyHandoffToken returns null → 404).

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
    headers: { ...corsHeaders(), 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' },
  })
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('t')
  const creatorId = verifyHandoffToken(token)
  if (!creatorId) {
    // Same response whether the feature is off or the token is bad — reveals nothing
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404, headers: corsHeaders() })
  }

  const creator = await prisma.creator.findUnique({
    where: { id: creatorId },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      postcode: true,
    },
  })
  if (!creator) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: corsHeaders() })
  }

  // Exactly the fields the portal form pre-fills — name, email, address only
  return NextResponse.json(
    {
      prefill: {
        full_name: [creator.firstName, creator.lastName].filter(Boolean).join(' '),
        email: creator.email,
        address_line1: creator.addressLine1 ?? '',
        address_line2: creator.addressLine2 ?? '',
        city: creator.city ?? '',
        postcode: creator.postcode ?? '',
      },
    },
    { headers: corsHeaders() },
  )
}
