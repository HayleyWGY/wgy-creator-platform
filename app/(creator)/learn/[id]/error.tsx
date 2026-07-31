'use client'

import { RouteError } from '@/components/boundaries/route-error'

// Page-level boundary: an error here is caught WITHOUT unmounting the creator
// layout, so the bottom nav and header stay and the member keeps their place.
export default function PageError(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <RouteError {...props} homeHref="/home" homeLabel="Back to home" />
}
