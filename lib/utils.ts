import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns a human-readable "time ago" string from an ISO date string.
 * Used on campaign and opportunity cards.
 */
export function getAge(createdAt: string): string {
  const diff  = Date.now() - new Date(createdAt).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (days > 0)  return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins > 0)  return `${mins}m ago`
  return "Just now"
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
