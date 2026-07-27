import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { clampLimit, parsePage } from '@/lib/pagination'

/**
 * One request could pull the whole database: /api/creator-posts?limit=999999
 * had no upper bound and its likes include was unbounded, so a single call
 * pulled every post AND every like row through a max:1 pool. ?limit=abc was
 * NaN, which Prisma rejects as an unhandled 500.
 */

describe('clampLimit — the four cases from the ticket', () => {
  const opts = { def: 20, max: 50 }

  it('limit=999999 is capped at the max', () => {
    expect(clampLimit('999999', opts)).toBe(50)
  })

  it('limit=abc falls back to the default (no NaN reaches Prisma)', () => {
    expect(clampLimit('abc', opts)).toBe(20)
    expect(Number.isNaN(clampLimit('abc', opts))).toBe(false)
  })

  it('limit=-1 falls back to the default (no negative take)', () => {
    expect(clampLimit('-1', opts)).toBe(20)
  })

  it('limit absent falls back to the default', () => {
    expect(clampLimit(null, opts)).toBe(20)
    expect(clampLimit(undefined, opts)).toBe(20)
    expect(clampLimit('', opts)).toBe(20)
  })

  it('a value within range passes through unchanged', () => {
    expect(clampLimit('35', opts)).toBe(35)
    expect(clampLimit('50', opts)).toBe(50)
    expect(clampLimit('1', opts)).toBe(1)
  })

  it('rejects zero, floats and junk suffixes to a safe integer', () => {
    expect(clampLimit('0', opts)).toBe(20)
    expect(clampLimit('12.9', opts)).toBe(12) // parseInt truncates; still bounded
    expect(clampLimit('20abc', opts)).toBe(20)
    expect(clampLimit('  ', opts)).toBe(20)
    expect(clampLimit('Infinity', opts)).toBe(20)
  })

  it('always returns a bounded positive integer, whatever the input', () => {
    for (const raw of ['999999', 'abc', '-1', '0', '', 'NaN', '1e9', '-0', '  7 ']) {
      const out = clampLimit(raw, opts)
      expect(Number.isInteger(out)).toBe(true)
      expect(out).toBeGreaterThan(0)
      expect(out).toBeLessThanOrEqual(50)
    }
  })
})

describe('parsePage', () => {
  it('collapses missing/NaN/negative/zero to page 1', () => {
    for (const raw of [null, undefined, '', 'abc', '-5', '0', 'NaN']) {
      expect(parsePage(raw)).toBe(1)
    }
  })

  it('passes a valid page through', () => {
    expect(parsePage('3')).toBe(3)
    expect(parsePage('100')).toBe(100)
  })

  it('never yields NaN — the bug it fixes', () => {
    // Math.max(1, parseInt('abc')) is NaN, which is exactly what reached
    // `skip` and 500'd. This must not.
    expect(Number.isNaN(parsePage('abc'))).toBe(false)
    expect(Number.isNaN(parsePage(null))).toBe(false)
  })
})

/**
 * Wiring: prove the routes use the safe parse and no longer carry the
 * unbounded include. Behavioural coverage of the query itself needs a live
 * NextAuth session, so these assert the source properties that make the fix
 * real.
 */
describe('routes apply the bounds', () => {
  const read = (p: string) =>
    fs
      .readFileSync(path.join(__dirname, '..', p), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')

  it('creator-posts list clamps the limit and no longer does an unbounded likes include', () => {
    const src = read('app/api/creator-posts/route.ts')
    expect(src).toMatch(/clampLimit\(/)
    expect(src).not.toMatch(/parseInt\(searchParams\.get\('limit'\)/)
    // The unbounded form is gone; the bounded per-user form is present.
    expect(src).not.toMatch(/likes:\s*\{\s*select:\s*\{\s*creatorId:\s*true\s*\}\s*\}/)
    expect(src).toMatch(/likes:\s*\{\s*where:\s*\{\s*creatorId:\s*session\.user\.id/)
    expect(src).toMatch(/likedByMe/)
  })

  it('creator-posts [id] bounds both includes', () => {
    const src = read('app/api/creator-posts/[id]/route.ts')
    // likes reshaped to the per-user lookup
    expect(src).not.toMatch(/likes:\s*\{\s*select:\s*\{\s*creatorId:\s*true\s*\}\s*\}/)
    expect(src).toMatch(/likes:\s*\{\s*where:\s*\{\s*creatorId:\s*session\.user\.id/)
    // comments now have a take bound
    const commentsBlock = src.slice(src.indexOf('comments:'), src.indexOf('likes:'))
    expect(commentsBlock).toMatch(/take:\s*\d+/)
  })

  it('admin page params go through parsePage, not bare parseInt', () => {
    for (const p of ['app/api/admin/audit/route.ts', 'app/api/admin/creators/route.ts']) {
      const src = read(p)
      expect(src, `${p} should use parsePage`).toMatch(/parsePage\(/)
      expect(src, `${p} should not bare-parseInt the page`).not.toMatch(
        /parseInt\(searchParams\.get\('page'\)/,
      )
    }
  })
})

describe('the client consumes likedByMe', () => {
  const card = fs.readFileSync(
    path.join(__dirname, '..', 'components/creator/creator-post-card.tsx'),
    'utf8',
  )

  it('seeds liked state from the server flag instead of hardcoding false', () => {
    expect(card).toMatch(/likedByMe\??:\s*boolean/)
    expect(card).toMatch(/useState\(post\.likedByMe/)
    expect(card).not.toMatch(/const \[liked, setLiked\] = useState\(false\)/)
  })
})
