import { describe, it, expect } from 'vitest'
import { calculateReadingTime } from '@/lib/reading-time'

describe('calculateReadingTime', () => {
  it('returns at least 1 minute for short text', () => {
    expect(calculateReadingTime('<p>A few short words here.</p>')).toBeGreaterThanOrEqual(1)
  })

  it('scales up with length (rounds up to whole minutes)', () => {
    const longText = '<p>' + 'word '.repeat(600) + '</p>' // ~600 words
    const minutes = calculateReadingTime(longText)
    expect(minutes).toBeGreaterThanOrEqual(3) // ~200 wpm → ~3 min
  })

  it('ignores HTML tags when counting words', () => {
    const withTags = '<div><p><strong>' + 'word '.repeat(200) + '</strong></p></div>'
    const withoutTags = 'word '.repeat(200)
    expect(calculateReadingTime(withTags)).toBe(calculateReadingTime(withoutTags))
  })
})
