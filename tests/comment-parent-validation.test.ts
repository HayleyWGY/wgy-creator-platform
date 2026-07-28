import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

/**
 * Both comment routes accept a client-supplied parentId. The creator-posts
 * route wrote it with zero validation, so a reply could be planted into
 * another post's thread (parentId into post B, postId = your post A): it
 * rendered under a stranger's comment, drifted counts, and fired a fabricated
 * notification. A non-existent parentId 500'd on the foreign key.
 *
 * The campaigns route validated parent ownership but had no depth cap, so a
 * reply-to-a-reply was stored yet never rendered (the GET is one level deep).
 *
 * These are source-wiring guards: both routes need a live session + DB, so the
 * property that matters — that the validation is present and correct in both —
 * is asserted structurally, in both files, so they can't silently diverge again.
 */

const read = (rel: string) =>
  fs
    .readFileSync(path.join(__dirname, '..', rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

const ROUTES = {
  'creator-posts': 'app/api/creator-posts/[id]/comments/route.ts',
  campaigns: 'app/api/campaigns/[id]/comments/route.ts',
}

for (const [label, rel] of Object.entries(ROUTES)) {
  describe(`${label} comments — parent validation`, () => {
    const src = read(rel)

    it('scopes the parent lookup to THIS post (rejects cross-post parents)', () => {
      // The parent must be fetched with postId bound to this route's post/
      // campaign — not looked up by id alone.
      expect(src).toMatch(/findFirst\(\{\s*where:\s*\{\s*id:\s*parentId,\s*postId:/)
    })

    it('404s when the parent is not found', () => {
      expect(src).toMatch(/Parent comment not found[\s\S]*?status:\s*404/)
    })

    it('caps depth — the parent must itself be top-level', () => {
      expect(src).toMatch(/parentId !== null/)
      expect(src).toMatch(/reply to a top-level comment/)
    })

    it('writes only a validated parent id, never the raw body value', () => {
      // The fix: parentId comes from the validated `parent`, so the old
      // `parentId: parentId || null` (raw passthrough) must be gone.
      expect(src).toMatch(/parentId:\s*parent\?\.id\s*\?\?\s*null/)
      expect(src).not.toMatch(/parentId:\s*parentId\s*\|\|\s*null/)
    })
  })
}

describe('creator-posts comments — the specific regressions in the report', () => {
  const src = read(ROUTES['creator-posts'])

  it('verifies the post exists before writing (no FK 500 on a bogus id)', () => {
    expect(src).toMatch(/creatorPost\.findUnique[\s\S]*?Post not found[\s\S]*?status:\s*404/)
  })

  it('makes notifications fire-and-forget (a notify failure no longer 500s a saved comment)', () => {
    // Every notification create is followed by .catch — matching campaigns.
    const withCatch = src.match(/notification\.create\([\s\S]*?\)\.catch\(/g) ?? []
    const total = src.match(/notification\.create\(/g) ?? []
    expect(total.length).toBeGreaterThanOrEqual(2)
    // No notification create is left un-caught.
    expect(withCatch.length).toBe(total.length)
  })
})
