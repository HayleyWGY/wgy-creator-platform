/**
 * Supabase RLS hardening — one-off, idempotent.
 *
 * This app never uses Supabase's auto-generated REST API (PostgREST): all
 * data access goes through Prisma over the direct Postgres connection, and
 * the only supabase-js usage is server-side Storage uploads with the
 * service-role key. So the public REST surface can be closed completely:
 *
 *   1. REVOKE all privileges on every public table/sequence from the
 *      `anon` and `authenticated` REST roles (Supabase's default
 *      privileges had granted them rights automatically).
 *   2. ALTER DEFAULT PRIVILEGES so tables created in the future by the
 *      `postgres` role never get those grants either.
 *   3. Enable ROW LEVEL SECURITY on every public table with no policies —
 *      even if a grant ever reappears, RLS denies all rows.
 *
 * None of this affects the app: Prisma connects as `postgres` (table
 * owner — RLS without FORCE doesn't apply to it), and the service-role
 * key has BYPASSRLS.
 *
 * Run with: node scripts/harden-rls.js
 */

const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env')
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}
loadEnv()

;(async () => {
  const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL, max: 1 })
  const prisma = new PrismaClient({ adapter })

  try {
    // 1. Revoke existing grants from the REST roles
    await prisma.$executeRawUnsafe('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated')
    await prisma.$executeRawUnsafe('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated')
    await prisma.$executeRawUnsafe('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated')
    console.log('✓ Revoked all existing table/sequence/function grants from anon + authenticated')

    // 2. Stop future tables getting default grants
    await prisma.$executeRawUnsafe('ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated')
    await prisma.$executeRawUnsafe('ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated')
    await prisma.$executeRawUnsafe('ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated')
    console.log('✓ Removed default privileges so future tables stay closed')

    // 3. Enable RLS on every public table (no policies = deny-all for
    //    non-owner, non-bypass roles)
    const tables = await prisma.$queryRawUnsafe(`
      SELECT c.relname AS name, c.relrowsecurity AS rls
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY c.relname
    `)
    // ALTER TABLE takes a brief ACCESS EXCLUSIVE lock; under live app
    // traffic that can queue behind reads and blow the statement timeout.
    // Use a short lock_timeout and retry each table a few times instead of
    // queueing indefinitely.
    await prisma.$executeRawUnsafe(`SET lock_timeout = '3s'`)
    let enabled = 0
    const failed = []
    for (const t of tables) {
      if (t.rls) continue
      let done = false
      for (let attempt = 1; attempt <= 5 && !done; attempt++) {
        try {
          await prisma.$executeRawUnsafe(`ALTER TABLE public."${t.name}" ENABLE ROW LEVEL SECURITY`)
          done = true
          enabled++
        } catch (err) {
          if (attempt === 5) {
            failed.push(t.name)
            console.warn(`  ! Could not lock ${t.name} after 5 attempts — re-run the script to catch it`)
          } else {
            await new Promise(r => setTimeout(r, 2000))
          }
        }
      }
    }
    console.log(`✓ RLS enabled on ${enabled} table(s) this run (${tables.filter(t => t.rls).length} already had it${failed.length ? `, ${failed.length} still pending: ${failed.join(', ')}` : ''})`)

    // Verify final state
    const after = await prisma.$queryRawUnsafe(`
      SELECT count(*)::int AS missing
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
    `)
    const grants = await prisma.$queryRawUnsafe(`
      SELECT count(*)::int AS grants
      FROM information_schema.role_table_grants
      WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated')
    `)
    console.log(`\nFinal state: tables without RLS = ${after[0].missing}, REST-role grants remaining = ${grants[0].grants}`)
  } finally {
    await prisma.$disconnect()
  }
})()
