'use client'
import { useEffect, useRef, useCallback } from 'react'

/**
 * Polls a URL every `interval` ms and calls `onData` with the result.
 * Stops polling when the component unmounts.
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
