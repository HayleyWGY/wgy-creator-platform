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
})
