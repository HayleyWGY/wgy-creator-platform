import { describe, it, expect } from 'vitest'
import { makePingThrottle } from '@/lib/use-realtime-ping'

/**
 * The chat Realtime layer refetches on every ping. Unthrottled, an anon
 * broadcast flood turns into one immediate DB hit per ping per connected
 * member — a one-request DoS. The throttle collapses a flood into at most one
 * refetch per interval.
 *
 * The property that MUST hold: the last ping in a burst always produces a
 * refetch. Every run is a full refetch of latest state, so one trailing run
 * after a burst catches every message — a leading-only throttle that dropped
 * the trailing call would silently lose messages, which is worse than the
 * problem being fixed.
 *
 * A fake clock drives virtual time so timing is deterministic.
 */

function fakeClock() {
  let t = 1_000_000 // arbitrary non-zero start
  interface Scheduled { id: number; at: number; fn: () => void }
  let seq = 0
  let scheduled: Scheduled[] = []
  return {
    now: () => t,
    setTimer: (fn: () => void, ms: number) => {
      const id = ++seq
      scheduled.push({ id, at: t + ms, fn })
      return id as unknown as ReturnType<typeof setTimeout>
    },
    clearTimer: (handle: ReturnType<typeof setTimeout>) => {
      scheduled = scheduled.filter(s => s.id !== (handle as unknown as number))
    },
    /** Advance virtual time, firing any timers due. */
    advance(ms: number) {
      const target = t + ms
      // Fire timers in due order as time moves forward.
      for (;;) {
        const next = scheduled
          .filter(s => s.at <= target)
          .sort((a, b) => a.at - b.at)[0]
        if (!next) break
        scheduled = scheduled.filter(s => s.id !== next.id)
        t = next.at
        next.fn()
      }
      t = target
    },
  }
}

const INTERVAL = 2000

describe('makePingThrottle', () => {
  it('runs the first ping immediately (chat stays instant)', () => {
    const clock = fakeClock()
    let runs = 0
    const { trigger } = makePingThrottle(() => runs++, INTERVAL, clock)
    trigger()
    expect(runs).toBe(1)
  })

  it('collapses a burst into at most one run per interval', () => {
    const clock = fakeClock()
    let runs = 0
    const { trigger } = makePingThrottle(() => runs++, INTERVAL, clock)

    // 100 pings in 10ms — the attack shape.
    for (let i = 0; i < 100; i++) {
      trigger()
      clock.advance(0.1)
    }
    expect(runs).toBe(1) // leading run only, so far

    // The trailing run lands when the window elapses.
    clock.advance(INTERVAL)
    expect(runs).toBe(2)

    // A full second of quiet — no further runs.
    clock.advance(INTERVAL)
    expect(runs).toBe(2)
  })

  it('THE SAFETY PROPERTY: the last ping in a burst always triggers a run', () => {
    const clock = fakeClock()
    let runs = 0
    const { trigger } = makePingThrottle(() => runs++, INTERVAL, clock)

    trigger() // leading run (1)
    clock.advance(500)
    trigger() // collapsed → schedules trailing
    clock.advance(500)
    trigger() // collapsed into the same trailing
    // The trailing run must still fire for the last ping.
    clock.advance(INTERVAL)
    expect(runs).toBe(2)
  })

  it('never exceeds one run per interval under sustained load', () => {
    const clock = fakeClock()
    let runs = 0
    const { trigger } = makePingThrottle(() => runs++, INTERVAL, clock)

    // 10 seconds of pings every 50ms.
    for (let i = 0; i < 200; i++) {
      trigger()
      clock.advance(50)
    }
    // 10s / 2s window = at most ~5–6 runs, not 200.
    expect(runs).toBeLessThanOrEqual(6)
    expect(runs).toBeGreaterThan(3) // but it IS keeping up, not stalling
  })

  it('spaced-out pings each run immediately (no artificial delay in normal use)', () => {
    const clock = fakeClock()
    let runs = 0
    const { trigger } = makePingThrottle(() => runs++, INTERVAL, clock)

    trigger()
    clock.advance(INTERVAL + 1)
    trigger()
    clock.advance(INTERVAL + 1)
    trigger()
    // Three pings more than a window apart → three immediate runs.
    expect(runs).toBe(3)
  })

  it('cancel() stops a pending trailing run (unmount safety)', () => {
    const clock = fakeClock()
    let runs = 0
    const { trigger, cancel } = makePingThrottle(() => runs++, INTERVAL, clock)

    trigger() // leading (1)
    clock.advance(100)
    trigger() // schedules trailing
    cancel() // component unmounted
    clock.advance(INTERVAL * 2)
    expect(runs).toBe(1) // trailing never fired after cancel
  })

  it('resumes correctly after a burst settles', () => {
    const clock = fakeClock()
    let runs = 0
    const { trigger } = makePingThrottle(() => runs++, INTERVAL, clock)

    trigger()
    for (let i = 0; i < 20; i++) { trigger(); clock.advance(10) }
    clock.advance(INTERVAL) // trailing fires
    const afterBurst = runs

    // Long quiet, then a fresh ping — must run immediately, not be swallowed.
    clock.advance(INTERVAL * 5)
    trigger()
    expect(runs).toBe(afterBurst + 1)
  })
})
