import { describe, it, expect } from 'vitest'
import {
  parseMessagePageParams,
  messagePageQuery,
  toChronologicalPage,
  messagesChanged,
  MESSAGE_PAGE_SIZE,
} from '@/lib/chat-pagination'

describe('toChronologicalPage', () => {
  // Rows arrive newest-first from Prisma; the UI renders oldest-first.
  const newestFirst = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ id: `m${n - i}` })) // m5, m4, m3...

  it('reverses to chronological order', () => {
    const { messages } = toChronologicalPage(newestFirst(3), 5)
    expect(messages.map(m => m.id)).toEqual(['m1', 'm2', 'm3'])
  })

  it('reports hasMore when the probe row came back, and drops it', () => {
    // limit 3, 4 rows fetched (3 + 1 probe)
    const { messages, hasMore } = toChronologicalPage(newestFirst(4), 3)
    expect(hasMore).toBe(true)
    expect(messages).toHaveLength(3)
    // The probe row is the OLDEST (last of a desc list) and must be dropped
    expect(messages.map(m => m.id)).toEqual(['m2', 'm3', 'm4'])
  })

  it('reports no more when the page is not full', () => {
    expect(toChronologicalPage(newestFirst(2), 5).hasMore).toBe(false)
  })

  it('does not mutate the caller array', () => {
    const rows = newestFirst(3)
    const copy = [...rows]
    toChronologicalPage(rows, 5)
    expect(rows).toEqual(copy)
  })
})

describe('messagePageQuery', () => {
  it('orders newest-first and fetches one extra as the probe', () => {
    const q = messagePageQuery(50)
    expect(q.orderBy).toEqual({ createdAt: 'desc' })
    expect(q.take).toBe(51)
    expect('cursor' in q).toBe(false)
  })

  it('adds an exclusive cursor when paging back', () => {
    const q = messagePageQuery(50, 'msg-123') as Record<string, unknown>
    expect(q.cursor).toEqual({ id: 'msg-123' })
    expect(q.skip).toBe(1) // exclusive — don't repeat the cursor row
  })
})

describe('parseMessagePageParams', () => {
  it('defaults to the standard page size', () => {
    expect(parseMessagePageParams('https://x.test/api')).toEqual({
      before: undefined,
      limit: MESSAGE_PAGE_SIZE,
    })
  })

  it('reads before and limit', () => {
    expect(parseMessagePageParams('https://x.test/api?before=abc&limit=10')).toEqual({
      before: 'abc',
      limit: 10,
    })
  })

  it('caps the limit so a client cannot request the whole table', () => {
    expect(parseMessagePageParams('https://x.test/api?limit=5000').limit).toBe(100)
  })

  it('falls back on junk input', () => {
    expect(parseMessagePageParams('https://x.test/api?limit=abc').limit).toBe(MESSAGE_PAGE_SIZE)
    expect(parseMessagePageParams('https://x.test/api?limit=-5').limit).toBe(MESSAGE_PAGE_SIZE)
  })
})

describe('messagesChanged (client re-render detection)', () => {
  const msgs = (...ids: string[]) => ids.map(id => ({ id }))

  it('THE REGRESSION: detects a new message when the page stays the same length', () => {
    // This is the exact scenario the old length-only check missed: a full
    // page where the newest message changed but the count did not.
    const before = msgs('a', 'b', 'c')
    const after = msgs('b', 'c', 'd')
    expect(before.length).toBe(after.length) // length alone says "no change"
    expect(messagesChanged(before, after)).toBe(true)
  })

  it('detects length changes (load, delete, paging)', () => {
    expect(messagesChanged(msgs('a'), msgs('a', 'b'))).toBe(true)
    expect(messagesChanged(msgs('a', 'b'), msgs('a'))).toBe(true)
  })

  it('reports no change for identical lists, so re-renders stay cheap', () => {
    expect(messagesChanged(msgs('a', 'b', 'c'), msgs('a', 'b', 'c'))).toBe(false)
    expect(messagesChanged([], [])).toBe(false)
  })
})
