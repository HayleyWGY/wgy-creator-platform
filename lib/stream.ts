import { StreamChat } from 'stream-chat'

// Server-side client (API routes only)
// Never import this in client components
let serverClient: StreamChat | null = null

export function getStreamServerClient() {
  if (!serverClient) {
    serverClient = new StreamChat(
      process.env.NEXT_PUBLIC_STREAM_API_KEY!,
      process.env.STREAM_API_SECRET!
    )
  }
  return serverClient
}

// Community chat rooms
// Creator Corner is NOT a chat room —
// it is a separate posts feed
export const COMMUNITY_ROOMS = [
  {
    id: 'group-chat',
    name: 'Group Chat',
    emoji: '💬',
    description: 'General chat for all WGY creators',
  },
  {
    id: 'share-social-links',
    name: 'Share Your Social Links',
    emoji: '🔗',
    description: 'Share your Instagram, TikTok and YouTube',
  },
  {
    id: 'affiliate-links',
    name: 'Affiliate Links',
    emoji: '💰',
    description: 'Share your affiliate codes and links',
  },
  {
    id: 'creator-collabs',
    name: 'Looking for Creator Collabs',
    emoji: '👀',
    description: 'Find other creators to collaborate with',
  },
  {
    id: 'events-chat',
    name: 'Events Chat',
    emoji: '🎪',
    description: 'Chat about upcoming WGY events',
  },
] as const

export type CommunityRoom = typeof COMMUNITY_ROOMS[number]

// IDs to exclude when querying DM channels
export const COMMUNITY_ROOM_IDS = COMMUNITY_ROOMS.map(r => r.id)
