/**
 * Cursor pagination for chat and DM message lists.
 *
 * THE BUG THIS REPLACES: the routes fetched `orderBy: createdAt asc, take: 100`,
 * which selects the OLDEST 100 rows. Once a conversation passed 100 messages
 * the API returned the same frozen page forever — new messages were written to
 * the database and never returned to anyone.
 *
 * The fix is to page newest-first and reverse for display. Because that
 * off-by-one-and-reverse logic is easy to get subtly wrong, it lives here once
 * rather than being copy-pasted into each of the three message routes.
 */

export const MESSAGE_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 100

export interface MessagePageParams {
  /** Message id to page back from (exclusive). Absent = newest page. */
  before?: string
  limit: number
}

/** Reads `?before=<id>&limit=<n>` from a request URL. */
export function parseMessagePageParams(url: string): MessagePageParams {
  const { searchParams } = new URL(url)
  const before = searchParams.get('before') || undefined
  const raw = parseInt(searchParams.get('limit') ?? '', 10)
  const limit =
    Number.isFinite(raw) && raw > 0 ? Math.min(raw, MAX_PAGE_SIZE) : MESSAGE_PAGE_SIZE
  return { before, limit }
}

/**
 * Prisma args for a newest-first page. Deliberately fetches limit + 1 rows so
 * the caller can tell whether older messages exist without a second COUNT.
 */
export function messagePageQuery(limit: number, before?: string) {
  return {
    orderBy: { createdAt: 'desc' as const },
    take: limit + 1,
    ...(before ? { cursor: { id: before }, skip: 1 } : {}),
  }
}

/**
 * Turns the newest-first rows (with the extra probe row) into the
 * chronological order the UI renders, plus whether more history exists.
 *
 * Always copies before reversing — reversing the caller's array in place has
 * bitten this pattern before.
 */
export function toChronologicalPage<T>(
  rows: T[],
  limit: number,
): { messages: T[]; hasMore: boolean } {
  const hasMore = rows.length > limit
  return { messages: rows.slice(0, limit).reverse(), hasMore }
}

/**
 * Whether a freshly fetched list differs from what's currently rendered.
 *
 * The clients previously compared `prev.length === next.length` only. Once a
 * response was pinned at exactly the page cap that was always true, so React
 * never re-rendered even as the content changed — which would have hidden the
 * API fix above. Comparing the last message id catches a new message arriving
 * in a full page; the length check still catches loads, deletes and paging.
 */
export function messagesChanged<T extends { id: string }>(prev: T[], next: T[]): boolean {
  if (prev.length !== next.length) return true
  if (prev.length === 0) return false
  return prev[prev.length - 1].id !== next[next.length - 1].id
}
