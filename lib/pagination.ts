/**
 * Safe parsing of client-supplied pagination parameters.
 *
 * A value from a query string is attacker-controlled: it can be absent, a
 * non-number, negative, or absurdly large. Passed straight to Prisma's `take`
 * or `skip` each of those is a bug — NaN throws an unhandled 500, and a huge
 * `take` pulls the whole table through a max:1 connection pool, which is a
 * one-request denial of service. These helpers collapse every bad input to a
 * safe value so the query is always bounded.
 */

/**
 * Parse a `limit`/`take` parameter. Anything invalid (missing, NaN, ≤ 0,
 * non-integer) becomes the default; anything above the max is capped.
 */
export function clampLimit(
  raw: string | null | undefined,
  { def, max }: { def: number; max: number },
): number {
  const n = Number.parseInt(raw ?? '', 10)
  if (!Number.isFinite(n) || n <= 0) return def
  return Math.min(n, max)
}

/**
 * Parse a 1-based `page` parameter. Anything invalid becomes page 1. There is
 * no upper cap — a page past the end simply returns no rows, which is cheap;
 * the cost is bounded by the page size, not the page number.
 */
export function parsePage(raw: string | null | undefined): number {
  const n = Number.parseInt(raw ?? '', 10)
  if (!Number.isFinite(n) || n < 1) return 1
  return n
}
