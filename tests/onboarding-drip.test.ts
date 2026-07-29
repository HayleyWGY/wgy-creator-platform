import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// The drip pings realtime as a side effect — mock it so we can assert WHO got
// a message without a websocket.
const pingRealtime = vi.fn((_topics: unknown) => Promise.resolve())
vi.mock('@/lib/realtime-server', () => ({ pingRealtime: (topics: unknown) => pingRealtime(topics) }))

import { runOnboardingDrip } from '@/lib/onboarding-drip'

/**
 * Idempotency: the drip claims OnboardingMessageSent inside a transaction
 * before sending. If a concurrent run already claimed a (creator, step), the
 * unique constraint throws P2002, the transaction rolls back, and NO duplicate
 * DM is written. This proves that behaviour: two recipients, the second's
 * claim throws P2002, and only the first is sent + pinged.
 */

function p2002() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: '7.8.0',
  })
}

beforeEach(() => {
  pingRealtime.mockClear()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyPrisma = prisma as any
  vi.spyOn(anyPrisma.messageTemplate, 'findMany').mockResolvedValue([
    { id: 'step1', dayOffset: 0, body: 'Hi {firstName}', sequenceName: 'onboarding', isActive: true },
  ])
  vi.spyOn(anyPrisma.creator, 'findMany').mockResolvedValue([
    { id: 'r1', firstName: 'Ann' },
    { id: 'r2', firstName: 'Bea' },
  ])
  // Nobody pre-filtered out, and both already have DM threads.
  vi.spyOn(anyPrisma.onboardingMessageSent, 'findMany').mockResolvedValue([])
  vi.spyOn(anyPrisma.dmThread, 'findMany').mockResolvedValue([
    { id: 't1', creatorId: 'r1' },
    { id: 't2', creatorId: 'r2' },
  ])
})

afterEach(() => vi.restoreAllMocks())

describe('onboarding drip idempotency (constraint-gated send)', () => {
  it('does NOT double-send when a claim loses the race (P2002)', async () => {
    let call = 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(prisma as any, '$transaction').mockImplementation(() => {
      call += 1
      // r1 wins the claim; r2's claim collides (concurrent run got there first).
      return call === 1 ? Promise.resolve([]) : Promise.reject(p2002())
    })

    const sent = await runOnboardingDrip('admin-1')

    // Only the winner counts and gets pinged; the loser is skipped, not sent.
    expect(sent).toBe(1)
    expect(pingRealtime).toHaveBeenCalledTimes(1)
    expect(pingRealtime).toHaveBeenCalledWith(['dm:t1', 'admin-inbox'])
  })

  it('sends to both when neither claim collides', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(prisma as any, '$transaction').mockResolvedValue([])

    const sent = await runOnboardingDrip('admin-1')

    expect(sent).toBe(2)
    expect(pingRealtime).toHaveBeenCalledWith(['dm:t1', 'dm:t2', 'admin-inbox'])
  })

  it('rethrows a non-P2002 error (does not silently swallow real failures)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(prisma as any, '$transaction').mockRejectedValue(new Error('db down'))
    await expect(runOnboardingDrip('admin-1')).rejects.toThrow('db down')
  })
})
