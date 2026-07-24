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
 * Keep the test suite off the production Redis.
 *
 * The rate-limit suites exercise the real limiter, which means they write
 * real counter keys. Pointed at the production database those keys sit
 * alongside live login counters. Harmless so far, but a test run that CAN
 * touch production state will eventually break it — a stray `login-ip:` key
 * for a real address would throttle a real member out of their account.
 *
 * If a dedicated test database is configured, redirect the limiter to it.
 * If it is NOT configured, blank the production credentials instead: the
 * suites use `describe.skipIf(!hasRedis)`, so they skip. Falling back to
 * production would defeat the point of separating them, and a skipped test
 * is a much better outcome than one quietly writing to the live database.
 */
const TEST_REDIS_URL = process.env.UPSTASH_REDIS_REST_URL_TEST
const TEST_REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN_TEST

if (TEST_REDIS_URL && TEST_REDIS_TOKEN) {
  process.env.UPSTASH_REDIS_REST_URL = TEST_REDIS_URL
  process.env.UPSTASH_REDIS_REST_TOKEN = TEST_REDIS_TOKEN
} else {
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN
  if (!process.env.CI) {
    console.warn(
      '[tests] No UPSTASH_REDIS_REST_URL_TEST set — Redis suites will SKIP.\n' +
        '        They deliberately do NOT fall back to the production database.',
    )
  }
}
