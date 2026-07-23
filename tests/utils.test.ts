import { describe, it, expect } from 'vitest'
import { getEmbedUrl, getAge } from '@/lib/utils'

describe('getEmbedUrl (video embed conversion)', () => {
  it('converts a standard YouTube watch URL', () => {
    expect(getEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1',
    )
  })

  it('converts a youtu.be short URL', () => {
    expect(getEmbedUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1',
    )
  })

  it('converts a YouTube shorts URL', () => {
    expect(getEmbedUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toContain(
      '/embed/dQw4w9WgXcQ',
    )
  })

  it('converts a Vimeo URL', () => {
    expect(getEmbedUrl('https://vimeo.com/123456789')).toBe(
      'https://player.vimeo.com/video/123456789',
    )
  })

  it('returns an already-embedded URL unchanged', () => {
    const embed = 'https://www.youtube.com/embed/abc?rel=0'
    expect(getEmbedUrl(embed)).toBe(embed)
  })

  it('returns null for unrecognised or empty input', () => {
    expect(getEmbedUrl('https://example.com/not-a-video')).toBeNull()
    expect(getEmbedUrl('')).toBeNull()
  })
})

describe('getAge (relative time on cards)', () => {
  it('formats minutes, hours and days', () => {
    const now = Date.now()
    expect(getAge(new Date(now - 30 * 1000).toISOString())).toBe('Just now')
    expect(getAge(new Date(now - 5 * 60_000).toISOString())).toBe('5m ago')
    expect(getAge(new Date(now - 3 * 3_600_000).toISOString())).toBe('3h ago')
    expect(getAge(new Date(now - 2 * 86_400_000).toISOString())).toBe('2d ago')
  })
})
