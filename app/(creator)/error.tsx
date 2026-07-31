'use client'

import { RouteError } from '@/components/boundaries/route-error'

// Catches errors from any creator page not caught by a nearer boundary. The
// root layout (and its providers) survive; the member lands on a themed
// recovery screen instead of the global crash page.
export default function CreatorError(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <RouteError {...props} homeHref="/home" homeLabel="Back to home" />
}
