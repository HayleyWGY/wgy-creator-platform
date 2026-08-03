// ─── External URLs ────────────────────────────────────────────────────────────
export const ASA_GUIDELINES_URL = 'https://www.asa.org.uk'

// ─── Navigation ───────────────────────────────────────────────────────────────
// Used by BottomNav — icons are mapped locally in the component since
// lucide-react components aren't JSON-serialisable.
export const NAV_ITEMS = [
  { label: 'Home',          href: '/home' },
  { label: 'Opps',          href: '/opportunities' },
  { label: 'Chats',         href: '/community' },
  { label: 'Learn',         href: '/learn' },
  { label: 'About',         href: '/about' },
] as const

// ─── Campaign / Opportunity filters ──────────────────────────────────────────
export const OPPORTUNITY_FILTERS = [
  'All',
  'PR / Gifted',
  'Paid',
  'TikTok',
  'App Partners',
  'Events',
] as const

// ─── Community rooms ──────────────────────────────────────────────────────────
// Community room definitions — used by community page and chat room pages.
export const COMMUNITY_ROOMS = [
  { id: 'group-chat',      name: 'Group Chat',                 emoji: '💬', description: 'General chat for all WGY creators' },
  { id: 'social-links',    name: 'Share Your Social Links',    emoji: '🔗', description: 'Drop your Instagram, TikTok and YouTube links' },
  { id: 'affiliate-links', name: 'Affiliate Links',            emoji: '💰', description: 'Share your affiliate codes and links' },
  { id: 'creator-collabs', name: 'Looking for Creator Collabs',emoji: '👀', description: 'Find other creators to collaborate with' },
  { id: 'events-chat',     name: 'Events Chat',                emoji: '🎪', description: 'Upcoming WGY events and meetups' },
  { id: 'creator-corner',  name: 'The Creator Corner',         emoji: '⭐', description: 'Posts and updates from the community' },
] as const

// ─── Learning content type styles ────────────────────────────────────────────
// Content-type labels used by the learn/home/search pages. (The old
// CONTENT_TYPE_BG / CONTENT_TYPE_PILL maps were superseded by per-page styles
// and removed as dead code.)
export const CONTENT_TYPE_LABEL: Record<string, string> = {
  blog_post:       'BLOG',
  workbook:        'WORKBOOK',
  video:           'VIDEO',
  course:          'COURSE',
  industry_update: 'INDUSTRY UPDATE',
}

