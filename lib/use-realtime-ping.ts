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
 *
 * Pings are THROTTLED (see makePingThrottle): a flood of pings collapses into
 * at most one refetch per interval, so a malicious or accidental burst can't
 * turn one ping into one immediate DB hit per member. Crucially the throttle
 * fires on both the leading and trailing edge, so the last ping in a burst
 * always produces a refetch — no missed messages.
 */

const DEFAULT_MIN_INTERVAL_MS = 2000

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

export interface PingThrottle {
  /** Call on each incoming ping. */
  trigger: () => void
  /** Cancel any pending trailing call (use on unmount). */
  cancel: () => void
}

/**
 * Leading + trailing throttle.
 *
 * - The first trigger runs immediately (chat stays instant in normal use).
 * - Further triggers within `minIntervalMs` are collapsed, and guarantee
 *   exactly ONE trailing run when the window elapses.
 *
 * The trailing guarantee is the safety property. Because every `run` here is
 * a full refetch of the latest state, a single trailing run after a burst
 * catches every message that arrived during it — dropping the trailing call
 * (a naive leading-only throttle) is exactly the missed-message bug this must
 * avoid, so it does not.
 *
 * `now`/`setTimer`/`clearTimer` are injected so the behaviour is testable
 * with fake time; production uses Date.now and setTimeout.
 */
export function makePingThrottle(
  run: () => void,
  minIntervalMs: number,
  clock: {
    now: () => number
    setTimer: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>
    clearTimer: (t: ReturnType<typeof setTimeout>) => void
  } = { now: Date.now, setTimer: setTimeout, clearTimer: clearTimeout },
): PingThrottle {
  let lastRun = Number.NEGATIVE_INFINITY
  let timer: ReturnType<typeof setTimeout> | null = null

  const fire = () => {
    lastRun = clock.now()
    run()
  }

  const trigger = () => {
    const elapsed = clock.now() - lastRun
    if (elapsed >= minIntervalMs) {
      // Leading edge: enough time has passed, run now.
      fire()
    } else if (timer === null) {
      // Inside the window: schedule the single trailing run. Any further
      // triggers before it fires are collapsed into this one.
      timer = clock.setTimer(() => {
        timer = null
        fire()
      }, minIntervalMs - elapsed)
    }
  }

  const cancel = () => {
    if (timer !== null) {
      clock.clearTimer(timer)
      timer = null
    }
  }

  return { trigger, cancel }
}

export function useRealtimePing(
  topic: string | null,
  onPing: () => void,
  enabled = true,
  minIntervalMs = DEFAULT_MIN_INTERVAL_MS,
) {
  const onPingRef = useRef(onPing)
  onPingRef.current = onPing

  useEffect(() => {
    if (!enabled || !topic) return
    const supabase = getClient()
    if (!supabase) return

    // Read the ref at fire time so the callback is always current.
    const throttle = makePingThrottle(() => onPingRef.current(), minIntervalMs)

    const channel = supabase
      .channel(topic)
      .on('broadcast', { event: 'ping' }, throttle.trigger)
      .subscribe()

    return () => {
      throttle.cancel()
      supabase.removeChannel(channel)
    }
  }, [topic, enabled, minIntervalMs])
}
