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
      !pathname.startsWith('/sign-in')
    ) {
      return NextResponse.redirect(new URL('/payment-failed', req.url))
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
    '/search/:path*',
    '/admin/:path*',
  ],
}
