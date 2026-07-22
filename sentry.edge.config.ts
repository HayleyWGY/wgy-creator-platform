// Sentry (edge runtime — middleware). Same DSN gating as the server config.
import * as Sentry from '@sentry/nextjs'

const dsn = process.env.SENTRY_DSN

Sentry.init({
  dsn,
  enabled: !!dsn,
  tracesSampleRate: 0,
  environment: process.env.VERCEL_ENV ?? 'development',
})
