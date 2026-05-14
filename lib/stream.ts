import { StreamChat } from 'stream-chat'
import { COMMUNITY_ROOMS } from '@/lib/constants'

// Stream Chat client — initialised server-side
// TODO Phase 2: Replace placeholder with real keys from .env
// Required: NEXT_PUBLIC_STREAM_API_KEY, STREAM_API_SECRET
export const streamClient = StreamChat.getInstance(
  process.env.NEXT_PUBLIC_STREAM_API_KEY || ''
)

// Channel naming convention:
// DM channels:        messaging_wgy_{creatorId}
// Community rooms:    community_{roomSlug}
export { COMMUNITY_ROOMS }
