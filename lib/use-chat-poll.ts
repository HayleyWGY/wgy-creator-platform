'use client'
import { useEffect, useRef, useCallback } from 'react'

/**
 * How often chat screens refetch. This is the PRIMARY freshness mechanism:
 * the Supabase Realtime ping layer is an accelerant on top, and when it isn't
 * delivering (e.g. RLS requires private channels the server can't yet
 * broadcast to), this interval is what members actually experience. 10s keeps
 * a back-and-forth feeling responsive without the Realtime dependency; it is
 * far under the per-user rate limit (300/min = 5s⁻¹) so it is safe at scale.
 */
export const CHAT_POLL_INTERVAL_MS = 10_000

/**
 * Polls a URL every `interval` ms and calls `onData` with the result.
 * Stops polling when the component unmounts.
 *
 * NOTE: messaging (DMs + community chat rooms) is backed by Prisma + this
 * short-interval polling — NOT Supabase Realtime. Supabase is used only for
 * Storage uploads elsewhere in the app. (Naming reconciled 2026-06-25.)
 */
export function useChatPoll<T>(
  url: string,
  onData: (data: T) => void,
  interval = 3000,
  enabled = true,
) {
  const onDataRef = useRef(onData)
  onDataRef.current = onData

  const poll = useCallback(async () => {
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        onDataRef.current(data)
      }
    } catch {
      // network error — silently skip
    }
  }, [url])

  useEffect(() => {
    if (!enabled) return
    poll()
    const id = setInterval(poll, interval)
    return () => clearInterval(id)
  }, [poll, interval, enabled])
}
