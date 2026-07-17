/**
 * Server → Supabase Realtime broadcast pings.
 *
 * Chat delivery model: after a message is written via Prisma, the server
 * fires a content-free "ping" on a Realtime broadcast topic. Subscribed
 * clients react by refetching through the normal NextAuth-gated API.
 *
 * Deliberately NO message content goes over Realtime: clients subscribe
 * with the public anon key, so broadcasts must never carry anything
 * sensitive. A ping only reveals "activity happened on this topic", and
 * topics use unguessable cuids.
 *
 * Topics:
 *   room:{slug}     — community chat room activity
 *   dm:{threadId}   — a DM thread's activity
 *   admin-inbox     — any DM activity (drives the admin inbox list)
 *
 * Fire-and-forget: a Realtime outage must never fail a send, so errors are
 * swallowed after a console.warn. Clients fall back to slow polling anyway.
 */

const ENDPOINT = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`

export async function pingRealtime(topics: string | string[]): Promise<void> {
  const list = Array.isArray(topics) ? topics : [topics]
  if (list.length === 0) return

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key || !process.env.NEXT_PUBLIC_SUPABASE_URL) return

  // The broadcast endpoint accepts a batch; chunk to stay well under
  // payload limits when mass-DM pings hundreds of threads at once.
  const CHUNK = 100
  for (let i = 0; i < list.length; i += CHUNK) {
    const messages = list.slice(i, i + CHUNK).map(topic => ({
      topic,
      event: 'ping',
      payload: {},
    }))
    try {
      await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
      })
    } catch (err) {
      console.warn('[realtime ping]', err instanceof Error ? err.message : err)
    }
  }
}
