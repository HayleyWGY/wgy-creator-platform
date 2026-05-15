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
      className="bg-[#2a2a2a] rounded-xl p-4 cursor-pointer active:opacity-80 transition-opacity border border-white/5"
    >
      {/* Author row */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-[#e4dcd1] flex items-center justify-center flex-shrink-0 overflow-hidden">
          {post.author.profileImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.author.profileImageUrl}
              alt={initials}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-[#222222] font-bold text-[11px] font-montserrat">{initials}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-white font-montserrat font-semibold text-[12px]">
            {post.author.firstName} {post.author.lastName}
          </span>
          <span className="text-[#706b6b] text-[10px] ml-2 font-montserrat">{getAge(post.createdAt)}</span>
        </div>
        <button
          onClick={handleDelete}
          className="text-[#706b6b] text-[15px] px-1 hover:text-red-400 transition-colors"
        >
          ···
        </button>
      </div>

      {/* Post body */}
      <p className="text-[#c8c3bc] font-montserrat text-[13px] leading-relaxed">{preview}</p>

      {/* Image — only on detail page */}
      {!truncate && post.imageUrl && (
        <div className="mt-3 rounded-xl overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.imageUrl} alt="Post image" className="w-full object-cover max-h-64" />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1 text-[11px] font-montserrat transition-colors ${
            liked ? 'text-[#e4dcd1]' : 'text-[#706b6b]'
          }`}
        >
          ♥ {likesCount}
        </button>
        <span className="text-[#706b6b] text-[11px] font-montserrat">
          💬 {post.commentsCount}
        </span>
      </div>
    </div>
  )
}
