import { NextRequest, NextResponse } from 'next/server'
import { getActiveSession } from '@/lib/session'
import { mintHandoffToken, isSameOrigin } from '@/lib/apply-handoff'

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

  // Applying is paid value: a payment_failed member is blocked here — the same
  // 402 that app/api/profile/apply-click returns — so the UI can prompt them to
  // fix their card. Kept on getActiveSession (not getPayingSession) precisely so
  // we can return this specific, actionable message instead of a bare 401/403.
  if (session.user.membershipStatus === 'payment_failed' && !session.user.isAdmin) {
    return NextResponse.json(
      { error: 'payment_update_needed', message: 'Update your payment details to apply.' },
      { status: 402 },
    )
  }

  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL
  const token = mintHandoffToken(session.user.id)
  if (!portalUrl || !token) {
    return NextResponse.json({ enabled: false })
  }

  const { applyLinkUrl } = await req.json().catch(() => ({ applyLinkUrl: '' }))

  // Only ever hand off to our own portal — never append a token to an
  // arbitrary external link. Compare PARSED ORIGINS, not string prefixes: a
  // prefix test let a lookalike host (portal.wegotyouagency.com.attacker.tld)
  // through and leaked the member's token to it.
  if (typeof applyLinkUrl !== 'string' || !isSameOrigin(applyLinkUrl, portalUrl)) {
    return NextResponse.json({ enabled: false })
  }

  const url = new URL(applyLinkUrl)
  url.searchParams.set('t', token)
  return NextResponse.json({ enabled: true, url: url.toString() })
}
