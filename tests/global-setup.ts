/**
 * Removes the rate-limit keys the suite created.
 *
 * They carry a TTL and would expire on their own within the window, so this
 * is tidiness rather than correctness. It is worth having because it makes
 * the prefix separation VISIBLE: the teardown deletes `wgy-rl-test*` and can
 * physically not match a production `wgy-rl:` key, so a glance at the
 * database after a run shows exactly which keys were the suite's.
 *
 * Never throws — a failed cleanup must not fail an otherwise green run.
 */
import fs from 'fs'
import path from 'path'

// globalSetup runs in Vitest's main process, BEFORE setupFiles — so .env has
// not been loaded yet and must be read here too.
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  }
}

export async function teardown() {
  loadEnv()
  const url = process.env.UPSTASH_REDIS_REST_URL_TEST || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN_TEST || process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return

  const headers = { Authorization: `Bearer ${token}` }

  try {
    const res = await fetch(`${url}/keys/wgy-rl-test*`, { headers })
    if (!res.ok) return
    const keys: string[] = (await res.json()).result ?? []
    if (keys.length === 0) return

    // Guard against ever deleting a production key, however the prefix is
    // configured. Cheap, and the consequence of getting it wrong is throttling
    // real members.
    const safe = keys.filter(k => k.startsWith('wgy-rl-test'))

    await Promise.all(
      safe.map(k =>
        fetch(url, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(['DEL', k]),
        }).catch(() => {}),
      ),
    )
    console.log(`[tests] cleaned ${safe.length} test rate-limit key(s)`)
  } catch {
    // Ignore — cleanup is best-effort.
  }
}
