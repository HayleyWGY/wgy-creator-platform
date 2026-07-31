import { RouteLoading } from '@/components/boundaries/route-loading'

// Instant themed skeleton shown via Suspense during navigation, so a slow
// segment never shows a blank screen on mobile.
export default function Loading() {
  return <RouteLoading rows={5} />
}
