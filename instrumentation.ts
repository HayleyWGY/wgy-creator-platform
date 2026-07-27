// Loads the right Sentry config per runtime. Next.js calls register() once
// on server/edge startup. onRequestError forwards App Router server errors
// to Sentry (no-op until a DSN is set).
import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Fail a misconfigured production deploy at startup, not at first use.
    // Node runtime only (env vars live there), production only (a dev without
    // every secret must still boot), and never during the build phase — the
    // build runs with the production env but a throw there would block the
    // deploy at compile rather than surface the missing var at startup.
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.NEXT_PHASE !== 'phase-production-build'
    ) {
      const { assertRequiredEnv } = await import('./lib/env')
      assertRequiredEnv()
    }

    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

export const onRequestError = Sentry.captureRequestError
