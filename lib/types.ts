// ─── Domain Interfaces ───────────────────────────────────────────────────────
// Phase 2: These will be derived from Prisma-generated types once the DB is
// connected. For now they serve as the single source of truth for data shapes
// used across components and API routes.

export interface Creator {
  id: string
  firstName: string
  lastName: string
  email: string
  bio?: string | null
  avatarUrl?: string | null
  instagramHandle?: string | null
  tiktokHandle?: string | null
  youtubeUrl?: string | null
  location?: string | null
  memberSince?: Date
  membershipStatus: 'active' | 'payment_failed' | 'cancelled'
  createdAt: Date
}

export interface Tag {
  id: string
  label: string
}

export interface CreatorTag {
  creatorId: string
  tagId: string
  tag: Tag
}

export interface Post {
  id: string
  creatorId: string
  sectionId: string
  body: string
  createdAt: Date
  creator?: Creator
  tags?: Tag[]
  // TODO Phase 2: populated via Prisma _count include
  likesCount?: number
  commentsCount?: number
}

export interface Comment {
  id: string
  postId: string
  creatorId: string
  body: string
  createdAt: Date
  creator?: Creator
}

export interface Notification {
  id: string
  creatorId: string
  type: 'new_campaign' | 'new_comment' | 'new_message' | 'membership'
  title: string
  description: string
  read: boolean
  createdAt: Date
}

export interface Campaign {
  id: string
  slug: string
  brandName: string
  brandInitials: string
  brandLogoUrl?: string | null
  coverImageUrl?: string | null
  coverImageBg?: string
  campaignType: string
  title: string
  brandDescription?: string | null
  brandWebsite?: string | null
  brandInstagram?: string | null
  brandTikTok?: string | null
  opportunityDescription?: string | null
  deliverables?: string[]
  applyLinkUrl: string
  spotsRemaining?: number | null
  likesCount: number
  commentsCount: number
  createdAt: Date
}
