// Loads .env for the test run so integration tests can reach real services.
// Tests that need a specific value still override it explicitly in their own
// beforeAll.
import fs from 'fs'
import path from 'path'

const envPath = path.join(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '')
    }
  }
}

/**
 * Keep DB integration tests away from the production database.
 *
 * .env holds the PRODUCTION connection strings (the dev server uses them), so
 * without this, `npm test` ran its integration suites — which create and
 * delete real rows — against production. Now:
 *
 *   - TEST_DATABASE_URL set  -> integration tests run against it (staging).
 *   - Otherwise, if the loaded URL is not the staging project, BOTH URLs are
 *     unset so every describe.skipIf(!hasDb) suite skips instead of touching
 *     production. Tests can only ever write to a database explicitly chosen
 *     for testing.
 */
const STAGING_DB_REF = 'ffbaencyqdcmawgueztf'
const TEST_DB = process.env.TEST_DATABASE_URL
if (TEST_DB) {
  process.env.DATABASE_URL = TEST_DB
  process.env.DIRECT_URL = TEST_DB
} else {
  const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || ''
  if (dbUrl && !dbUrl.includes(STAGING_DB_REF)) {
    delete process.env.DATABASE_URL
    delete process.env.DIRECT_URL
    console.warn(
      '[tests] Database URL is not the staging project — DB integration suites will SKIP. ' +
        'Set TEST_DATABASE_URL (staging) in .env to run them.',
    )
  }
}

/**
 * Keep test keys away from production keys.
 *
 * The rate-limit suites exercise the real limiter, so they write real counter
 * keys. The Upstash free tier allows only ONE database, so a separate test
 * instance isn't available — instead the tests take their own key namespace
 * in the same database.
 *
 * That addresses the real hazard. Sharing storage was never the problem: a
 * handful of test keys is nothing against the quota. The problem was
 * COLLISION — a test writing `login-ip:<a real address>` would throttle a
 * real member out of their own account. Under a separate prefix no test key
 * can ever name the same slot as a production one, so the two cannot
 * interfere no matter what a test does.
 *
 * A dedicated test database is still honoured if one is ever configured
 * (paid tier, or a second free account), in which case the prefix separation
 * is simply belt-and-braces.
 */
process.env.UPSTASH_RATELIMIT_PREFIX = 'wgy-rl-test'

const TEST_REDIS_URL = process.env.UPSTASH_REDIS_REST_URL_TEST
const TEST_REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN_TEST

if (TEST_REDIS_URL && TEST_REDIS_TOKEN) {
  process.env.UPSTASH_REDIS_REST_URL = TEST_REDIS_URL
  process.env.UPSTASH_REDIS_REST_TOKEN = TEST_REDIS_TOKEN
}
