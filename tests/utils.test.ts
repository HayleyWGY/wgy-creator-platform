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

describe('getAge (relative time — shared across the app)', () => {
  const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString()

  it('formats just-now, minutes, hours and days', () => {
    expect(getAge(iso(30 * 1000))).toBe('just now')        // < 1 min
    expect(getAge(iso(5 * 60_000))).toBe('5m ago')
    expect(getAge(iso(3 * 3_600_000))).toBe('3h ago')
    expect(getAge(iso(2 * 86_400_000))).toBe('2d ago')
  })

  it('stays relative forever without options', () => {
    expect(getAge(iso(400 * 86_400_000))).toBe('400d ago')
  })

  it('switches to a calendar date past absoluteAfterDays (Creators list: 7d)', () => {
    const d = new Date(Date.now() - 40 * 86_400_000)
    expect(getAge(d.toISOString(), { absoluteAfterDays: 7 })).toBe(
      d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    )
    // still relative when newer than the threshold
    expect(getAge(iso(3 * 86_400_000), { absoluteAfterDays: 7 })).toBe('3d ago')
  })

  it('includes the year with withYear (Settings list: 30d)', () => {
    const d = new Date(Date.now() - 60 * 86_400_000)
    expect(getAge(d.toISOString(), { absoluteAfterDays: 30, withYear: true })).toBe(
      d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    )
  })
})
