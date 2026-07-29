import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { notifyAllCreators, notifyAllCreatorsMany } from '@/lib/notify'

/**
 * The fan-out writes ~1,000 rows per published item through a max:1 pool. Two
 * properties matter: it is inserted in bounded CHUNKS (not one big write), and
 * the multi-announcement path reads the recipient list ONCE (the cron can fan
 * out several items in a run). Spy on the Prisma client so we assert the call
 * pattern without inserting thousands of real rows.
 */

const fakeCreators = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `c${i}` }))

let findMany: ReturnType<typeof vi.spyOn>
let createMany: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  findMany = vi.spyOn(prisma.creator, 'findMany')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createMany = vi.spyOn(prisma.notification, 'createMany').mockResolvedValue({ count: 0 } as any)
})
afterEach(() => vi.restoreAllMocks())

describe('notifyAllCreators — chunked single announcement', () => {
  it('inserts 450 recipients in 200-sized chunks (3 writes), not one', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findMany.mockResolvedValue(fakeCreators(450) as any)

    const total = await notifyAllCreators({ type: 'campaign', title: 'x', description: 'y' })

    expect(total).toBe(450)
    expect(createMany).toHaveBeenCalledTimes(3) // 200 + 200 + 50
    const sizes = createMany.mock.calls.map((c: unknown[]) => (c[0] as { data: unknown[] }).data.length)
    expect(sizes).toEqual([200, 200, 50])
    expect(Math.max(...sizes)).toBeLessThanOrEqual(200)
  })

  it('does nothing when there are no creators', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findMany.mockResolvedValue([] as any)
    expect(await notifyAllCreators({ type: 'content', title: 'x', description: 'y' })).toBe(0)
    expect(createMany).not.toHaveBeenCalled()
  })
})

describe('notifyAllCreatorsMany — the cron multiplied case', () => {
  it('reads the recipient list ONCE for several announcements', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findMany.mockResolvedValue(fakeCreators(150) as any)

    const total = await notifyAllCreatorsMany([
      { type: 'campaign', title: 'a', description: '1' },
      { type: 'campaign', title: 'b', description: '2' },
      { type: 'content', title: 'c', description: '3' },
    ])

    // 150 creators × 3 announcements = 450 rows.
    expect(total).toBe(450)
    // The whole point: creators fetched once, not once per announcement.
    expect(findMany).toHaveBeenCalledTimes(1)
    // 450 rows still chunked at 200.
    const sizes = createMany.mock.calls.map((c: unknown[]) => (c[0] as { data: unknown[] }).data.length)
    expect(sizes).toEqual([200, 200, 50])
  })

  it('is a no-op for an empty announcement list (does not even query creators)', async () => {
    expect(await notifyAllCreatorsMany([])).toBe(0)
    expect(findMany).not.toHaveBeenCalled()
  })
})

describe('call sites await the fan-out (the freeze bug)', () => {
  const read = (p: string) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8')

  it('all three publish sites await notifyAllCreators', () => {
    for (const p of [
      'app/api/campaigns/route.ts',
      'app/api/content/route.ts',
      'app/api/content/[id]/route.ts',
    ]) {
      const src = read(p)
      expect(src, `${p} must await the fan-out`).toMatch(/await notifyAllCreators\(/)
      // The bare unawaited form must be gone.
      expect(src, `${p} still has an unawaited call`).not.toMatch(/(?<!await )\bnotifyAllCreators\(\{/)
    }
  })

  it('scheduled-publish batches via notifyAllCreatorsMany and awaits it', () => {
    const src = read('lib/scheduled-publish.ts')
    expect(src).toMatch(/await notifyAllCreatorsMany\(/)
    // No longer notifies per-item inside the loops.
    expect(src).not.toMatch(/await notifyAllCreators\(\{/)
  })
})

describe('notifications route counts unread with a query, not a JS filter', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'app/api/notifications/route.ts'), 'utf8')

  it('uses prisma.notification.count on isRead, not array.filter', () => {
    expect(src).toMatch(/notification\.count\(\{[\s\S]*?isRead:\s*false/)
    expect(src).not.toMatch(/\.filter\(n => !n\.isRead\)/)
  })
})
