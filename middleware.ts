import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    // Cancelled members are fully revoked. The API layer enforces this
    // instantly via getActiveSession(); this sweep also pushes them off
    // pages once their token refreshes (SessionProvider poll / focus).
    if (token?.membershipStatus === 'cancelled') {
      return NextResponse.redirect(new URL('/sign-in', req.url))
    }

    // Redirect admin users away from creator routes
    if (token?.isAdmin && pathname.startsWith('/home')) {
      return NextResponse.redirect(new URL('/admin/dashboard', req.url))
    }

    // Redirect non-admin users away from admin routes
    if (!token?.isAdmin && pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/home', req.url))
    }

    // Redirect payment failed users
    if (
      token?.membershipStatus === 'payment_failed' &&
      !pathname.startsWith('/payment-failed') &&
      !pathname.startsWith('/payment-updated') &&
      !pathname.startsWith('/sign-in')
    ) {
      // /payment-updated is exempt: a member returning from the Stripe portal is
      // still payment_failed until Stripe retries and the (Phase 2) webhook
      // flips their status, so bouncing them here would hide the success page.
      return NextResponse.redirect(new URL('/payment-failed', req.url))
    }

    // First-run onboarding gate: a member who has never completed or skipped
    // profile-setup is routed there before the app.
    //
    // Strict `=== false`, deliberately. Tokens issued before this field
    // existed have `onboarded === undefined` and must PASS THROUGH — a member
    // already signed in during the deploy must not be trapped in a redirect.
    // Only a fresh login sets the flag explicitly (true for the backfilled
    // existing accounts, false only for genuinely un-onboarded members). This
    // is the same fail-open discipline the rate limiter learned the hard way.
    //
    // Admins are exempt (they have no creator onboarding). /profile-setup is
    // not in the matcher below, so it is never gated against itself — no loop.
    if (token && !token.isAdmin && token.onboarded === false) {
      return NextResponse.redirect(new URL('/profile-setup', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    '/home/:path*',
    '/opportunities/:path*',
    '/community/:path*',
    '/learn/:path*',
    '/profile/:path*',
    '/messages/:path*',
    '/notifications/:path*',
    '/membership/:path*',
    '/payment-updated/:path*',
    '/search/:path*',
    '/about/:path*',
    '/admin/:path*',
  ],
}
