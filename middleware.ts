import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

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
    '/admin/:path*',
  ],
}
