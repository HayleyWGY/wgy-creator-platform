'use client'

import { RouteError } from '@/components/boundaries/route-error'

// Catches errors from any admin page not caught by a nearer boundary.
export default function AdminError(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <RouteError {...props} homeHref="/admin/dashboard" homeLabel="Back to dashboard" />
}
