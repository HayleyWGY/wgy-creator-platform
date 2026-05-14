// ─── External URLs ────────────────────────────────────────────────────────────
export const WGY_WEBSITE_URL = 'https://wegotyouagency.com'
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

export const LEARN_FILTERS = [
  'All',
  'Videos',
  'Workbooks',
  'Articles',
  'Courses',
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
