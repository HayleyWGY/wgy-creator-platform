'use client'

import { RouteError } from '@/components/boundaries/route-error'

// Auth group (sign-in, set-password, profile-setup, payment-failed). No layout
// in this group, so this boundary catches page errors directly. Recovery sends
// the member back to sign-in — the safe entry point for every auth flow.
export default function AuthError(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <RouteError {...props} homeHref="/sign-in" homeLabel="Back to sign in" />
}
