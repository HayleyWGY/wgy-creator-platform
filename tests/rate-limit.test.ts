import { describe, it, expect } from 'vitest'
import { rateLimit } from '@/lib/rate-limit'

describe('rateLimit (per-instance burst guard)', () => {
  it('allows requests up to the limit, then blocks', () => {
    const key = `test-block-${Math.random()}`
    // limit 3 per big window
    expect(rateLimit(key, 3, 60_000)).toBe(true)
    expect(rateLimit(key, 3, 60_000)).toBe(true)
    expect(rateLimit(key, 3, 60_000)).toBe(true)
    expect(rateLimit(key, 3, 60_000)).toBe(false) // 4th blocked
  })

  it('keeps separate counters per key', () => {
    const a = `test-a-${Math.random()}`
    const b = `test-b-${Math.random()}`
    expect(rateLimit(a, 1, 60_000)).toBe(true)
    expect(rateLimit(a, 1, 60_000)).toBe(false) // a exhausted
    expect(rateLimit(b, 1, 60_000)).toBe(true) // b independent
  })

  it('forgets old hits once the window has passed', () => {
    const key = `test-window-${Math.random()}`
    // Tiny 1ms window: after a wait, the earlier hit falls outside it
    expect(rateLimit(key, 1, 1)).toBe(true)
    // busy-wait ~5ms so the window elapses
    const until = Date.now() + 5
    while (Date.now() < until) { /* spin */ }
    expect(rateLimit(key, 1, 1)).toBe(true) // allowed again
  })
})
