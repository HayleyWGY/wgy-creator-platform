// Sentry (server) — error monitoring + alerts. Dormant until SENTRY_DSN is
// set: with no DSN the SDK sends nothing. Add the DSN in Vercel at launch to
// switch it on (Sentry then emails you when something new breaks).
import * as Sentry from '@sentry/nextjs'

const dsn = process.env.SENTRY_DSN

Sentry.init({
  dsn,
  enabled: !!dsn,
  // Performance tracing sampled at 10% (override via NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE)
  tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
  environment: process.env.VERCEL_ENV ?? 'development',
})
