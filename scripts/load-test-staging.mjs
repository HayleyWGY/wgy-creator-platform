/**
 * Staging load test — hammers the seeded staging deployment with realistic,
 * authenticated traffic and reports latency percentiles + error rates.
 *
 * It logs in a handful of real seeded sessions (active members + one admin) via
 * the NextAuth credentials flow, then fires a weighted mix of the actual GET
 * endpoints for a fixed duration at a set concurrency — including the heavy
 * ones: the paginated admin DM inbox, room-message pagination (300 msgs/room),
 * and the 1,000-row admin creators list.
 *
 *   node scripts/load-test-staging.mjs
 *   node scripts/load-test-staging.mjs --url https://wgy-creator-staging.vercel.app --concurrency 25 --duration 45
 *
 * SAFETY: read-only (GET) traffic only, and it refuses to run against a URL that
 * isn't the known staging host — never point it at production.
 *
 * Notes on the free tiers:
 *  - Supabase free has a limited connection pool; very high --concurrency can
 *    exhaust it (you'll see 500s). Start modest (default 20) and climb.
 *  - The rate limiter is shared with production but namespaced (wgy-rl-staging),
 *    so this can't affect production keys. Logins are capped at 20/15min per IP,
 *    so the script logs in a SMALL fixed pool of sessions once and reuses them.
 */

// ── config ──────────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).flatMap((a, i, arr) => (a.startsWith('--') ? [[a.slice(2), arr[i + 1]]] : [])),
)
const TARGET = (args.url || 'https://wgy-creator-staging.vercel.app').replace(/\/$/, '')
const CONCURRENCY = Number(args.concurrency || 20)
const DURATION_S = Number(args.duration || 30)

const STAGING_HOST = 'wgy-creator-staging.vercel.app'
if (!TARGET.includes(STAGING_HOST) && !args.force) {
  console.error(`🛑 Refusing to load-test ${TARGET} — not the staging host (${STAGING_HOST}). Use --force to override.`)
  process.exit(1)
}

// Seeded credentials (see scripts/seed-staging.ts). member0001..0010 are all
// "active" (so they pass the paying-session gate); owner@ is an admin.
const MEMBER_PW = 'StagingMember1!'
const ADMIN_PW = 'StagingAdmin1!'
const MEMBERS = Array.from({ length: 6 }, (_, i) => `member${String(i + 1).padStart(4, '0')}@staging.test`)
const ADMIN = 'owner@staging.test'
const ROOM_SLUGS = ['general', 'campaigns', 'wins', 'support']
const SEARCH_TERMS = ['ava', 'fitness', 'glow', 'london', 'reel']

// ── tiny cookie jar + NextAuth credentials login ─────────────────────────────
function mergeCookies(jar, res) {
  const set = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : []
  for (const c of set) {
    const [pair] = c.split(';')
    const idx = pair.indexOf('=')
    if (idx > 0) jar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim())
  }
}
const cookieHeader = jar => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ')

async function login(email, password) {
  const jar = new Map()
  // 1. CSRF token (also sets the csrf cookie).
  const csrfRes = await fetch(`${TARGET}/api/auth/csrf`, { headers: {} })
  mergeCookies(jar, csrfRes)
  const { csrfToken } = await csrfRes.json()

  // 2. Credentials callback — form-encoded, returns 200 + session cookie.
  const body = new URLSearchParams({ csrfToken, email, password, json: 'true', callbackUrl: TARGET })
  const cbRes = await fetch(`${TARGET}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: cookieHeader(jar) },
    body,
    redirect: 'manual',
  })
  mergeCookies(jar, cbRes)

  const hasSession = [...jar.keys()].some(k => k.includes('session-token'))
  if (!hasSession) throw new Error(`login failed for ${email} (status ${cbRes.status})`)
  return cookieHeader(jar)
}

// ── endpoint mix (weighted) ──────────────────────────────────────────────────
// role: which session pool to use. weight: relative frequency.
const ENDPOINTS = [
  { name: 'GET /api/campaigns', role: 'member', weight: 5, path: () => '/api/campaigns' },
  { name: 'GET /api/chat/rooms', role: 'member', weight: 2, path: () => '/api/chat/rooms' },
  { name: 'GET /api/chat/rooms/[slug]/messages', role: 'member', weight: 5, path: () => `/api/chat/rooms/${rand(ROOM_SLUGS)}/messages` },
  { name: 'GET /api/chat/rooms/unread', role: 'member', weight: 3, path: () => '/api/chat/rooms/unread' },
  { name: 'GET /api/chat/dm', role: 'member', weight: 3, path: () => '/api/chat/dm' },
  { name: 'GET /api/notifications/unread', role: 'member', weight: 3, path: () => '/api/notifications/unread' },
  { name: 'GET /api/content', role: 'member', weight: 2, path: () => '/api/content' },
  { name: 'GET /api/search', role: 'member', weight: 2, path: () => `/api/search?q=${rand(SEARCH_TERMS)}` },
  { name: 'GET /api/profile/checklist', role: 'member', weight: 1, path: () => '/api/profile/checklist' },
  // The heavy admin queries — the whole reason we care about pagination.
  { name: 'GET /api/chat/dm/admin', role: 'admin', weight: 4, path: () => '/api/chat/dm/admin' },
  { name: 'GET /api/admin/creators', role: 'admin', weight: 3, path: () => '/api/admin/creators' },
  { name: 'GET /api/admin/stats', role: 'admin', weight: 2, path: () => '/api/admin/stats' },
  { name: 'GET /api/admin/analytics', role: 'admin', weight: 2, path: () => '/api/admin/analytics' },
]
const WEIGHTED = ENDPOINTS.flatMap(e => Array(e.weight).fill(e))
const rand = arr => arr[Math.floor(Math.random() * arr.length)]

// ── stats ────────────────────────────────────────────────────────────────────
const stats = new Map() // name -> { lat:[], ok, err, codes:{} }
function record(name, ms, status, ok) {
  let s = stats.get(name)
  if (!s) { s = { lat: [], ok: 0, err: 0, codes: {} }; stats.set(name, s) }
  s.lat.push(ms)
  s.codes[status] = (s.codes[status] || 0) + 1
  ok ? s.ok++ : s.err++
}
const pct = (arr, p) => (arr.length ? arr.slice().sort((a, b) => a - b)[Math.min(arr.length - 1, Math.floor((p / 100) * arr.length))] : 0)

// ── run ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🎯 Target:      ${TARGET}`)
  console.log(`⚙️  Concurrency: ${CONCURRENCY}   Duration: ${DURATION_S}s\n`)

  process.stdout.write('Logging in seeded sessions… ')
  const memberCookies = []
  for (const m of MEMBERS) {
    try { memberCookies.push(await login(m, MEMBER_PW)) } catch (e) { console.warn(`\n  ! ${e.message}`) }
  }
  let adminCookie
  try { adminCookie = await login(ADMIN, ADMIN_PW) } catch (e) { console.warn(`\n  ! ${e.message}`) }
  console.log(`done (${memberCookies.length} members, ${adminCookie ? 1 : 0} admin).\n`)
  if (!memberCookies.length) { console.error('No member sessions — aborting.'); process.exit(1) }

  const cookieFor = role => (role === 'admin' ? adminCookie : rand(memberCookies))
  const deadline = Date.now() + DURATION_S * 1000
  let inFlight = 0
  let total = 0

  async function oneRequest() {
    const ep = rand(WEIGHTED)
    const cookie = cookieFor(ep.role)
    if (!cookie) return
    const t0 = performance.now()
    try {
      const res = await fetch(`${TARGET}${ep.path()}`, { headers: { cookie }, redirect: 'manual' })
      // Drain body so timing includes full transfer.
      await res.arrayBuffer()
      const ms = performance.now() - t0
      // 2xx and 3xx (auth redirects on gated routes) count as "served"; 4xx/5xx are errors.
      record(ep.name, ms, res.status, res.status < 400)
    } catch (e) {
      record(ep.name, performance.now() - t0, 'NETERR', false)
    }
    total++
  }

  async function worker() {
    while (Date.now() < deadline) {
      inFlight++
      await oneRequest()
      inFlight--
    }
  }

  const started = Date.now()
  const ticker = setInterval(() => process.stdout.write(`\r  running… ${total} requests, ${inFlight} in flight   `), 500)
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  clearInterval(ticker)
  const elapsed = (Date.now() - started) / 1000

  // ── report ──────────────────────────────────────────────────────────────────
  console.log(`\n\n──────── RESULTS (${elapsed.toFixed(1)}s, ${total} requests, ${(total / elapsed).toFixed(1)} req/s) ────────\n`)
  const rows = [...stats.entries()].sort((a, b) => b[1].lat.length - a[1].lat.length)
  const pad = (s, n) => String(s).padEnd(n)
  const padL = (s, n) => String(s).padStart(n)
  console.log(pad('endpoint', 40), padL('n', 6), padL('p50', 7), padL('p95', 8), padL('p99', 8), padL('err%', 6))
  let totalErr = 0, totalN = 0
  for (const [name, s] of rows) {
    const n = s.lat.length
    const errPct = ((s.err / n) * 100)
    totalErr += s.err; totalN += n
    console.log(
      pad(name, 40), padL(n, 6),
      padL(pct(s.lat, 50).toFixed(0) + 'ms', 7),
      padL(pct(s.lat, 95).toFixed(0) + 'ms', 8),
      padL(pct(s.lat, 99).toFixed(0) + 'ms', 8),
      padL(errPct.toFixed(1), 6),
    )
    const badCodes = Object.entries(s.codes).filter(([c]) => c === 'NETERR' || Number(c) >= 400)
    if (badCodes.length) console.log(pad('', 40), '   ↳ non-2xx/3xx:', badCodes.map(([c, n]) => `${c}×${n}`).join(', '))
  }
  console.log(`\nOverall error rate: ${((totalErr / totalN) * 100).toFixed(2)}%  (${totalErr}/${totalN})`)
  console.log('Note: 3xx on gated routes = auth redirect, counted as served. Investigate any 4xx/5xx above.\n')
}

main().catch(e => { console.error(e); process.exit(1) })
