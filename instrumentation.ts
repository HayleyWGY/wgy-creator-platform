// Loads the right Sentry config per runtime. Next.js calls register() once
// on server/edge startup. onRequestError forwards App Router server errors
// to Sentry (no-op until a DSN is set).
import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

export const onRequestError = Sentry.captureRequestError
