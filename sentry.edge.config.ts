// Sentry (edge runtime — middleware). Same DSN gating as the server config.
import * as Sentry from '@sentry/nextjs'

const dsn = process.env.SENTRY_DSN

Sentry.init({
  dsn,
  enabled: !!dsn,
  tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
  environment: process.env.VERCEL_ENV ?? 'development',
})
