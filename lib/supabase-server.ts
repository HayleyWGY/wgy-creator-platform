import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Lazily-constructed service-role Supabase client — bypasses RLS, SERVER ONLY.
 * NEVER import this into a client component.
 *
 * DELIBERATELY LAZY, mirroring lib/stripe.ts getStripe(). The upload routes
 * previously built this at MODULE scope with `process.env.X!`, so a missing
 * Supabase env var threw at import time — which can fail `next build`. Building
 * it on first use instead means a misconfiguration surfaces when an upload is
 * actually attempted, not at import.
 *
 * SUPABASE_SERVICE_ROLE_KEY is in REQUIRED_ENV (see lib/env.ts), so production
 * always has it — this is build-time robustness and consistency, not a live bug.
 */
let client: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Supabase admin client is not configured — NEXT_PUBLIC_SUPABASE_URL / ' +
        'SUPABASE_SERVICE_ROLE_KEY are missing.',
    )
  }
  client = createClient(url, key)
  return client
}
