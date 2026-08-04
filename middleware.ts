import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Routes that require a session. Replaces the former withAuth matcher — the
// middleware now runs on EVERY page (to attach a per-request CSP nonce), so
// auth gating has to be applied selectively here rather than by the matcher.
// Prefix match is exact-segment: '/profile' guards '/profile' and '/profile/x'
// but NOT '/profile-setup' (which must stay reachable to break the onboarding
// loop). Same for '/payment-updated' vs '/payment-failed'.
const PROTECTED_PREFIXES = [
  '/home', '/opportunities', '/community', '/learn', '/profile', '/messages',
  '/notifications', '/membership', '/payment-updated', '/search', '/about', '/admin',
]

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))
}

// script-src drops 'unsafe-inline' in favour of a per-request nonce +
// 'strict-dynamic', so an HTML-injection bug can no longer execute injected
// inline script. style-src keeps 'unsafe-inline' deliberately — the app uses
// inline styles pervasively and nonce-ing styles is a separate, much larger
// job. Everything else matches the previous policy from next.config.
function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
    "media-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; ')
}

// 128-bit base64 nonce. Buffer isn't available in the Edge runtime, so build it
// from Web Crypto + btoa.
function makeNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  const nonce = makeNonce()
  const csp = buildCsp(nonce)

  const withCsp = (res: NextResponse) => {
    res.headers.set('Content-Security-Policy', csp)
    return res
  }

  // Auth gating for protected routes — faithful port of the former withAuth
  // middleware. Only these paths trigger a token read.
  if (isProtected(pathname)) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

    if (!token) {
      const url = new URL('/sign-in', req.url)
      url.searchParams.set('callbackUrl', pathname)
      return withCsp(NextResponse.redirect(url))
    }
    if (token.membershipStatus === 'cancelled') {
      return withCsp(NextResponse.redirect(new URL('/sign-in', req.url)))
    }
    if (token.isAdmin && pathname.startsWith('/home')) {
      return withCsp(NextResponse.redirect(new URL('/admin/dashboard', req.url)))
    }
    if (!token.isAdmin && pathname.startsWith('/admin')) {
      return withCsp(NextResponse.redirect(new URL('/home', req.url)))
    }
    if (
      token.membershipStatus === 'payment_failed' &&
      !pathname.startsWith('/payment-failed') &&
      !pathname.startsWith('/payment-updated') &&
      !pathname.startsWith('/sign-in')
    ) {
      return withCsp(NextResponse.redirect(new URL('/payment-failed', req.url)))
    }
    // onboarded === false only (undefined tokens from before the field existed
    // must pass through — see the original fail-open note).
    if (!token.isAdmin && token.onboarded === false) {
      return withCsp(NextResponse.redirect(new URL('/profile-setup', req.url)))
    }
  }

  // Forward the nonce to Next via a request header so it stamps its own inline
  // + chunk scripts with it; also set the CSP on the response.
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)
  return withCsp(NextResponse.next({ request: { headers: requestHeaders } }))
}

export const config = {
  matcher: [
    // Every page EXCEPT API routes, Next internals, the Sentry tunnel, and the
    // favicon. `missing` skips prefetch requests, which don't render a document
    // and don't need a nonce.
    {
      source: '/((?!api|_next/static|_next/image|monitoring|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
