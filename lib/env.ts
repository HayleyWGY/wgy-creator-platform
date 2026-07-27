/**
 * Required-environment assertion.
 *
 * A missing variable used to surface at FIRST USE — often deep in a request,
 * sometimes only on certain data. The worst case is FIELD_ENCRYPTION_KEY:
 * absent, every sensitive-field read/write 500s, and because decryptField
 * passes non-prefixed (legacy plaintext) values straight through, a smoke test
 * on old rows can look healthy while every encrypted row is broken. This makes
 * a misconfigured deploy fail loudly at startup instead.
 *
 * REQUIRED_ENV is the single source of truth: the startup check, the test that
 * guards it, and the launch checklist all read from here.
 */

export interface EnvVar {
  name: string
  why: string
  /** Losing/changing the value destroys or orphans data. Must be backed up. */
  dataLoss?: boolean
}

/**
 * Present or the app is broken or insecure. Checked at startup in production.
 */
export const REQUIRED_ENV: EnvVar[] = [
  { name: 'DATABASE_URL', why: 'Runtime database connection (pooled). Nothing works without it.' },
  { name: 'NEXTAUTH_SECRET', why: 'Signs session tokens. Absent = auth is broken and insecure.' },
  { name: 'NEXTAUTH_URL', why: 'Base URL for auth callbacks. Wrong/absent = sign-in redirects break in production.' },
  { name: 'NEXT_PUBLIC_SUPABASE_URL', why: 'Supabase project URL for storage and realtime (client).' },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', why: 'Supabase anon key for storage and realtime (client).' },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', why: 'Server-side Supabase key for image/file uploads.' },
  {
    name: 'FIELD_ENCRYPTION_KEY',
    why: 'AES-256 key for encrypted PII (DOB, address, phone, gender). Absent = every sensitive-field read/write 500s.',
    dataLoss: true,
  },
  { name: 'UPSTASH_REDIS_REST_URL', why: 'Distributed rate limiter. Absent = login/brute-force throttling silently disabled.' },
  { name: 'UPSTASH_REDIS_REST_TOKEN', why: 'Auth token for the rate limiter (pairs with the URL).' },
  { name: 'CRON_SECRET', why: 'Bearer token protecting the scheduled-publish cron route. Absent = the route 401s everyone, including Vercel Cron, so the publishing safety-net stops.' },
]

/**
 * Needed for deploys and one-off scripts, not per-request. Not startup-checked
 * because the running server never reads them — but listed so the checklist
 * covers them.
 */
export const DEPLOY_ONLY_ENV: EnvVar[] = [
  {
    name: 'DIRECT_URL',
    why: 'Direct (non-pooled) database URL for `prisma db push` and maintenance scripts. The pooler on :6543 hangs on schema pushes.',
  },
]

/**
 * Deliberately optional. Absent must NEVER break the build or startup — each
 * has a guarded fallback. Several are dormant features awaiting launch.
 */
export const OPTIONAL_ENV: EnvVar[] = [
  { name: 'APPLY_HANDOFF_SECRET', why: 'Signs the portal application-handoff token. DORMANT until launch — unset means the apply flow is a plain link, by design.' },
  { name: 'NEXT_PUBLIC_PORTAL_URL', why: 'Portal origin for the handoff. Pairs with APPLY_HANDOFF_SECRET; dormant until launch.' },
  { name: 'NEXT_PUBLIC_APP_URL', why: 'Absolute origin for setup links in emails. Falls back to NEXTAUTH_URL when unset.' },
  { name: 'RESEND_API_KEY', why: 'Transactional email. Email is stubbed until this is set; absent = sends are logged, not delivered.' },
  { name: 'STRIPE_SECRET_KEY', why: 'Stripe API key. Billing is deferred pre-launch; absent = the webhook route cannot verify, which is fine while dormant.' },
  { name: 'STRIPE_WEBHOOK_SECRET', why: 'Verifies Stripe webhook signatures. Deferred with Stripe.' },
  { name: 'SENTRY_DSN', why: 'Server error monitoring. Absent = the SDK sends nothing (no-op). Recommended at launch.' },
  { name: 'NEXT_PUBLIC_SENTRY_DSN', why: 'Client error monitoring. Absent = no-op. Recommended at launch.' },
  { name: 'SENTRY_AUTH_TOKEN', why: 'Build-time source-map upload only. Absent = readable stack traces are not uploaded; the app is unaffected.' },
  { name: 'SENTRY_ORG', why: 'Build-time source-map upload (pairs with the auth token).' },
  { name: 'SENTRY_PROJECT', why: 'Build-time source-map upload (pairs with the auth token).' },
]

function missingRequired(): EnvVar[] {
  return REQUIRED_ENV.filter(v => {
    const value = process.env[v.name]
    return value === undefined || value.trim() === ''
  })
}

/**
 * Throws if any required variable is missing. Reports ALL of them at once —
 * fixing one only to hit the next on redeploy is exactly the slow failure this
 * replaces.
 *
 * Deliberately does NOT run during `next build` (NEXT_PHASE) or outside
 * production: a developer without every production secret must still be able
 * to run the app and the build. The gate is the production RUNTIME.
 */
export function assertRequiredEnv(): void {
  const missing = missingRequired()
  if (missing.length === 0) return

  const detail = missing.map(v => `  - ${v.name}: ${v.why}`).join('\n')
  const message =
    `\n❌ Missing ${missing.length} required environment variable(s):\n${detail}\n\n` +
    `Set them in Vercel (Project → Settings → Environment Variables, Production) ` +
    `and redeploy. See .env.example for the full list.\n`

  // Loud on the way out, in case the thrown error is swallowed by a wrapper.
  console.error(message)
  throw new Error(`Missing required environment variables: ${missing.map(v => v.name).join(', ')}`)
}
