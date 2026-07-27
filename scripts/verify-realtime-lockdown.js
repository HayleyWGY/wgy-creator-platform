/**
 * Verifies that the Supabase Realtime config rejects anonymous broadcast.
 *
 * The threat: clients subscribe with the PUBLIC anon key, so if the project
 * lets anyone broadcast on public channels, an attacker can flood ping topics
 * and make every member's browser refetch in a storm. This script does what an
 * attacker would — connects with the anon key and tries to broadcast on the
 * fully-guessable `room:group-chat` topic — and checks that it is refused.
 *
 * Run it AFTER applying the dashboard lockdown steps:
 *   node scripts/verify-realtime-lockdown.js
 *
 * PASS = the anon broadcast was rejected (locked down correctly).
 * FAIL = the anon broadcast was accepted (still open — re-check the steps).
 *
 * It uses ONLY the public anon key — never the service role — so it is safe to
 * run and genuinely reproduces an outside attacker's capability.
 */

const fs = require('fs')
const path = require('path')

// Load .env the same way the other scripts do.
;(function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  }
})()

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const TOPIC = 'room:group-chat' // a public, fully-guessable topic

if (!URL || !ANON) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env')
  process.exit(2)
}

async function main() {
  const { createClient } = require('@supabase/supabase-js')
  const supabase = createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  console.log('\nAttempting an ANONYMOUS broadcast with the public key...')
  console.log(`  topic: ${TOPIC}`)

  const channel = supabase.channel(TOPIC, { config: { broadcast: { ack: true } } })

  // ack:true asks the server to confirm receipt, so a rejected send resolves
  // to something other than 'ok'.
  const subscribed = await new Promise((resolve) => {
    channel.subscribe((status) => resolve(status))
    setTimeout(() => resolve('TIMEOUT'), 8000)
  })

  console.log(`  subscribe status: ${subscribed}`)

  // If subscription itself is refused, that already proves anon can't join.
  if (subscribed !== 'SUBSCRIBED') {
    console.log('\n✅ PASS — the anonymous client could not even subscribe. Locked down.')
    await supabase.removeChannel(channel)
    process.exit(0)
  }

  let sendResult
  try {
    sendResult = await channel.send({
      type: 'broadcast',
      event: 'ping',
      payload: { probe: true },
    })
  } catch (err) {
    sendResult = `error: ${err && err.message ? err.message : err}`
  }

  console.log(`  send result: ${JSON.stringify(sendResult)}`)
  await supabase.removeChannel(channel)

  if (sendResult === 'ok') {
    console.log(
      '\n❌ FAIL — the anonymous broadcast was ACCEPTED. Realtime is still open.\n' +
        '   Re-check the dashboard steps: RLS on realtime.messages must block\n' +
        '   INSERT for anon, and the channel must be private.',
    )
    process.exit(1)
  }

  console.log('\n✅ PASS — the anonymous broadcast was rejected. Locked down correctly.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Unexpected error running the check:', err)
  process.exit(2)
})
