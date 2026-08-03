/**
 * Human-readable "time ago" string from an ISO date string. The single source
 * of truth for relative timestamps across the app (previously duplicated ~12
 * times with small inconsistencies).
 *
 *   < 1 min   -> "just now"
 *   < 60 min  -> "5m ago"
 *   < 24 h    -> "3h ago"
 *   otherwise -> "8d ago"
 *
 * Options let a caller switch to an absolute calendar date once an item is old
 * enough — used by the admin Creators (7 days) and Settings (30 days, +year)
 * lists, which prefer "3 Jul" to "60d ago". Without options it stays relative
 * forever.
 */
export function getAge(
  date: string,
  opts?: { absoluteAfterDays?: number; withYear?: boolean },
): string {
  const d = new Date(date)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)

  if (opts?.absoluteAfterDays !== undefined && days >= opts.absoluteAfterDays) {
    return d.toLocaleDateString('en-GB', opts.withYear
      ? { day: 'numeric', month: 'short', year: 'numeric' }
      : { day: 'numeric', month: 'short' })
  }

  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

/**
 * Converts a YouTube or Vimeo watch URL to an embeddable iframe src.
 * Returns null if the URL is not a recognised video host.
 * Already-embedded /embed/ URLs are returned unchanged.
 */
export function getEmbedUrl(url: string): string | null {
  if (!url) return null
  if (url.includes("/embed/")) return url

  const youtubeMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/
  )
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}?rel=0&modestbranding=1`
  }

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`

  return null
}
