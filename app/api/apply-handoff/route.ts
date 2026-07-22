import { NextRequest, NextResponse } from 'next/server'
import { getActiveSession } from '@/lib/session'
import { mintHandoffToken } from '@/lib/apply-handoff'

// Called by the logged-in creator's browser when they tap Apply on a
// campaign whose apply link points at the portal. Mints a short-lived
// signed token for them and returns the portal URL with the token attached.
//
// If the handoff feature is off (no secret / no portal URL), returns
// enabled:false and the Apply button just opens the plain link instead.
export async function POST(req: NextRequest) {
  const session = await getActiveSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL
  const token = mintHandoffToken(session.user.id)
  if (!portalUrl || !token) {
    return NextResponse.json({ enabled: false })
  }

  const { applyLinkUrl } = await req.json().catch(() => ({ applyLinkUrl: '' }))

  // Only ever hand off to our own portal — never append a token to an
  // arbitrary external link.
  if (typeof applyLinkUrl !== 'string' || !applyLinkUrl.startsWith(portalUrl)) {
    return NextResponse.json({ enabled: false })
  }

  const url = new URL(applyLinkUrl)
  url.searchParams.set('t', token)
  return NextResponse.json({ enabled: true, url: url.toString() })
}
