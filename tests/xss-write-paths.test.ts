import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { sanitizeRichText } from '@/lib/sanitize'

/**
 * Guards the write paths into the two columns that are rendered with
 * dangerouslySetInnerHTML:
 *   Post.opportunityDescription / Post.body -> opportunities/[slug]
 *   PostContent.body                        -> learn/[id], about/[id]
 *
 * The CSP allows 'unsafe-inline' for scripts, so sanitising on write is the
 * only thing standing between a stored payload and execution in every
 * member's browser.
 */

const root = path.join(__dirname, '..')
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8')

// The exact payload from the report. Deliberately UNQUOTED — a previous
// regex-based sanitiser only matched on*="quoted" and let this through.
const PAYLOAD = '<img src=x onerror=alert(1)>'

describe('stored XSS — behaviour', () => {
  it('strips the executable part of the reported payload', () => {
    const out = sanitizeRichText(`<p>Great campaign</p>${PAYLOAD}`)
    // The security property: no event handler survives, so nothing executes.
    expect(out).not.toMatch(/onerror/i)
    expect(out).not.toMatch(/alert\(/)
    // `img` is an allowed tag, so the element itself remains — as an inert
    // broken image (`<img src="x" />`). That is harmless and expected;
    // stripping the handler is what defuses it.
    expect(out).toBe('<p>Great campaign</p><img src="x" />')
  })

  it('strips the unquoted-handler variants a denylist would miss', () => {
    for (const p of [
      '<img src=x onerror=alert(1)>',
      '<svg onload=alert(1)>',
      '<img src=x onerror=alert(1) >',
      '<a href=javascript:alert(1)>x</a>',
    ]) {
      const out = sanitizeRichText(p)
      expect(out).not.toMatch(/onerror|onload/i)
      expect(out.toLowerCase()).not.toContain('javascript:')
    }
  })
})

/**
 * Wiring guards. The behavioural tests above prove the sanitiser works; these
 * prove the write paths actually CALL it. Without them, someone could delete
 * the sanitise call and every test above would still pass.
 */
describe('stored XSS — write paths are wired', () => {
  it('campaign POST sanitises both rendered columns', () => {
    const src = read('app/api/campaigns/route.ts')
    expect(src).toContain('sanitizeRichText')
    // The sanitised value — not the raw input — must reach both columns.
    expect(src).toMatch(/body:\s*safeDescription/)
    expect(src).toMatch(/opportunityDescription:\s*safeDescription/)
    expect(src).not.toMatch(/opportunityDescription:\s*opportunityDescription/)
  })

  it('campaign PATCH sanitises both rendered columns', () => {
    const src = read('app/api/campaigns/[id]/route.ts')
    expect(src).toContain('sanitizeRichText')
    expect(src).toMatch(/data\.body\s*=\s*safeDescription/)
    expect(src).toMatch(/data\.opportunityDescription\s*=\s*safeDescription/)
  })

  it('content POST and PATCH sanitise body', () => {
    expect(read('app/api/content/route.ts')).toMatch(/body:\s*body\.body\s*\?\s*sanitizeRichText/)
    expect(read('app/api/content/[id]/route.ts')).toMatch(/body:\s*body\.body\s*\?\s*sanitizeRichText/)
  })

  it('migration scripts allowlist rather than denylist', () => {
    // Both write to rendered columns but cannot import the TS module, so they
    // duplicate the allowlist. A regex denylist here is a known bypass.
    for (const script of ['scripts/import-campaigns.js', 'scripts/import-learning-lounge.js']) {
      const src = read(script)
      expect(src, `${script} must use sanitize-html`).toContain("require('sanitize-html')")
      expect(src, `${script} must not denylist handlers with a regex`).not.toMatch(/replace\(\/\\son\\w\+=/)
    }
  })
})
