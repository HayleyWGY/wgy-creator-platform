import readingTime from "reading-time";

export function calculateReadingTime(html: string): number {
  // Strip HTML tags for word count
  const text = html.replace(/<[^>]+>/g, " ");
  const stats = readingTime(text);
  return Math.ceil(stats.minutes);
}
