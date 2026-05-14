// ─── External URLs ────────────────────────────────────────────────────────────
export const WGY_WEBSITE_URL    = 'https://wegotyouagency.com'
export const ASA_GUIDELINES_URL = 'https://www.asa.org.uk'

// ─── Navigation ───────────────────────────────────────────────────────────────
// Used by BottomNav — icons are mapped locally in the component since
// lucide-react components aren't JSON-serialisable.
export const NAV_ITEMS = [
  { label: 'Home',          href: '/home' },
  { label: 'Opportunities', href: '/opportunities' },
  { label: 'Community',     href: '/community' },
  { label: 'Learn',         href: '/learn' },
  { label: 'Profile',       href: '/profile' },
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
// Channel IDs must stay in sync with Stream Chat channel configuration.
// See lib/stream.ts for the StreamChat client.
export const COMMUNITY_ROOMS = [
  { id: 'group-chat',      name: 'Group Chat',                 emoji: '💬', memberCount: 830 },
  { id: 'social-links',    name: 'Share Your Social Links',     emoji: '🔗' },
  { id: 'affiliate-links', name: 'Affiliate Links',             emoji: '💰' },
  { id: 'creator-collabs', name: 'Looking for Creator Collabs', emoji: '👀' },
  { id: 'events-chat',     name: 'Events Chat',                 emoji: '🎪' },
  { id: 'creator-corner',  name: 'The Creator Corner',          emoji: '⭐' },
] as const

// ─── Learning content type styles ────────────────────────────────────────────
// Single source of truth used by learn/page.tsx, learn/[id]/page.tsx, and home/page.tsx
export const CONTENT_TYPE_BG: Record<string, string> = {
  blog_post:       '#8b6f5e',
  workbook:        '#4a5e4a',
  video:           '#3d3550',
  course:          '#222222',
  industry_update: '#706b6b',
}

export const CONTENT_TYPE_LABEL: Record<string, string> = {
  blog_post:       'BLOG',
  workbook:        'WORKBOOK',
  video:           'VIDEO',
  course:          'COURSE',
  industry_update: 'INDUSTRY UPDATE',
}

export const CONTENT_TYPE_PILL: Record<string, {
  bg: string
  text: string
  border?: string
  label: string
}> = {
  blog_post:       { bg: '#8b6f5e', text: '#e4dcd1', label: 'BLOG' },
  workbook:        { bg: '#4a5e4a', text: '#e4dcd1', label: 'WORKBOOK' },
  video:           { bg: '#3d3550', text: '#e4dcd1', label: 'VIDEO' },
  course:          { bg: '#222222', text: '#e4dcd1', border: '1px solid rgba(228,220,209,0.2)', label: 'COURSE' },
  industry_update: { bg: '#706b6b', text: '#e4dcd1', label: 'INDUSTRY UPDATE' },
}
