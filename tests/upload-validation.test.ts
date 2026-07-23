import { describe, it, expect } from 'vitest'
import {
  validateImageUpload,
  buildUploadPath,
  MAX_IMAGE_BYTES,
} from '@/lib/upload-validation'

describe('validateImageUpload', () => {
  it('accepts the allowed image types and returns the correct extension', () => {
    expect(validateImageUpload('image/jpeg', 1000)).toEqual({ ok: true, ext: 'jpg' })
    expect(validateImageUpload('image/png', 1000)).toEqual({ ok: true, ext: 'png' })
    expect(validateImageUpload('image/webp', 1000)).toEqual({ ok: true, ext: 'webp' })
    expect(validateImageUpload('image/gif', 1000)).toEqual({ ok: true, ext: 'gif' })
  })

  it('rejects SVG (can carry scripts and is served from a public bucket)', () => {
    const res = validateImageUpload('image/svg+xml', 1000)
    expect(res.ok).toBe(false)
  })

  it('rejects non-image types', () => {
    expect(validateImageUpload('application/pdf', 1000).ok).toBe(false)
    expect(validateImageUpload('text/html', 1000).ok).toBe(false)
    expect(validateImageUpload('application/javascript', 1000).ok).toBe(false)
  })

  it('rejects missing or empty type', () => {
    expect(validateImageUpload(undefined, 1000).ok).toBe(false)
    expect(validateImageUpload(null, 1000).ok).toBe(false)
    expect(validateImageUpload('', 1000).ok).toBe(false)
  })

  it('rejects files over the 5MB limit', () => {
    const res = validateImageUpload('image/png', MAX_IMAGE_BYTES + 1)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toMatch(/5MB/)
  })

  it('accepts a file exactly at the limit', () => {
    expect(validateImageUpload('image/png', MAX_IMAGE_BYTES).ok).toBe(true)
  })

  it('rejects zero-size / missing size', () => {
    expect(validateImageUpload('image/png', 0).ok).toBe(false)
    expect(validateImageUpload('image/png', null).ok).toBe(false)
  })
})

describe('buildUploadPath', () => {
  it('uses the server-side prefix and the validated extension', () => {
    const path = buildUploadPath('creator-posts', 'jpg')
    expect(path.startsWith('creator-posts/')).toBe(true)
    expect(path.endsWith('.jpg')).toBe(true)
  })

  it('never incorporates a client filename', () => {
    const path = buildUploadPath('creator-posts', 'png')
    expect(path).not.toContain('..')
    expect(path).not.toContain('evil')
    // Only the generated segment plus extension
    expect(path).toMatch(/^creator-posts\/\d+-[a-z0-9]+\.png$/)
  })

  it('generates a unique path each call', () => {
    const a = buildUploadPath('creator-posts', 'png')
    const b = buildUploadPath('creator-posts', 'png')
    expect(a).not.toBe(b)
  })
})
