'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAge } from '@/lib/utils'

export interface CreatorPost {
  id: string
  body: string
  imageUrl: string | null
  likesCount: number
  commentsCount: number
  createdAt: string
  author: {
    id: string
    firstName: string
    lastName: string
    profileImageUrl: string | null
  }
}

interface CreatorPostCardProps {
  post: CreatorPost
  onDeleted?: () => void
  truncate?: boolean
}

export function CreatorPostCard({ post, onDeleted, truncate = true }: CreatorPostCardProps) {
  const router = useRouter()
  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(post.likesCount)

  const initials = `${post.author.firstName[0]}${post.author.lastName[0]}`

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const res  = await fetch(`/api/creator-posts/${post.id}/like`, { method: 'POST' })
    const data = await res.json()
    setLiked(data.liked)
    setLikesCount(prev => data.liked ? prev + 1 : prev - 1)
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this post?')) return
    await fetch(`/api/creator-posts/${post.id}`, { method: 'DELETE' })
    onDeleted?.()
  }

  const preview = truncate && post.body.length > 180
    ? post.body.slice(0, 180) + '...'
    : post.body

  return (
    <div
      onClick={() => router.push(`/community/creator-corner/${post.id}`)}
      className="cursor-pointer active:opacity-80 transition-opacity"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: 18 }}
    >
      {/* Author row */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
        >
          {post.author.profileImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.author.profileImageUrl}
              alt={initials}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="font-montserrat text-[11px]" style={{ fontWeight: 800, color: 'var(--text)' }}>{initials}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-montserrat text-[12px]" style={{ fontWeight: 700, color: 'var(--text)' }}>
            {post.author.firstName} {post.author.lastName}
          </span>
          <span className="text-[10px] ml-2 font-montserrat" style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{getAge(post.createdAt)}</span>
        </div>
        <button
          onClick={handleDelete}
          aria-label="Post options"
          className="text-[15px] px-1 transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          ···
        </button>
      </div>

      {/* Post body */}
      <p className="font-montserrat text-[13px]" style={{ fontWeight: 500, color: 'var(--text-muted)', lineHeight: 1.6 }}>{preview}</p>

      {/* Image — shown on community feed and detail page, not on home page */}
      {post.imageUrl && (
        <div style={{ marginTop: 10, borderRadius: 12, overflow: 'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.imageUrl}
            alt="Post image"
            style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
        <button
          onClick={handleLike}
          className="flex items-center gap-1 text-[12px] font-montserrat transition-colors"
          style={{ fontWeight: 600, color: liked ? 'var(--accent)' : 'var(--text-muted)' }}
        >
          ♥ {likesCount}
        </button>
        <span className="text-[12px] font-montserrat" style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
          💬 {post.commentsCount}
        </span>
      </div>
    </div>
  )
}
