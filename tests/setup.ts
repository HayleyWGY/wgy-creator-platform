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
