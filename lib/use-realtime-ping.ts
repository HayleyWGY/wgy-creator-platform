'use client'
import { useEffect, useRef } from 'react'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Client side of the chat Realtime layer (see lib/realtime-server.ts).
 *
 * Subscribes to a broadcast topic with the public anon key and calls
 * `onPing` whenever the server announces activity. Pings carry no content —
 * the callback should refetch through the normal authenticated API.
 *
 * Pages keep useChatPoll as a slow fallback (~30s) so chat still works if
 * the websocket is blocked or drops.
 */

let client: SupabaseClient | null = null
function getClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return client
}

export function useRealtimePing(
  topic: string | null,
  onPing: () => void,
  enabled = true,
) {
  const onPingRef = useRef(onPing)
  onPingRef.current = onPing

  useEffect(() => {
    if (!enabled || !topic) return
    const supabase = getClient()
    if (!supabase) return

    const channel = supabase
      .channel(topic)
      .on('broadcast', { event: 'ping' }, () => onPingRef.current())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [topic, enabled])
}
