'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { COMMUNITY_ROOMS } from '@/lib/constants'
import { CreatorPostCard, type CreatorPost } from '@/components/creator/creator-post-card'

function RoomsList() {
  const router = useRouter()
  return (
    <div className="flex flex-col gap-2">
      {COMMUNITY_ROOMS.map(room => (
        <div
          key={room.id}
          onClick={() => router.push(`/community/${room.id}`)}
          className="flex items-center gap-3 p-4 rounded-xl bg-[#2a2a2a] cursor-pointer active:opacity-80 transition-opacity"
        >
          <div className="w-10 h-10 rounded-xl bg-[#333333] flex items-center justify-center text-lg flex-shrink-0">
            {room.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-montserrat font-semibold text-sm">{room.name}</p>
            <p className="text-[#706b6b] text-xs truncate mt-0.5">{room.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function CommunityPage() {
  const router = useRouter()
  const [posts, setPosts]           = useState<CreatorPost[]>([])
  const [postsLoading, setPostsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/creator-posts?limit=10')
      .then(r => r.json())
      .then(d => { setPosts(d.posts || []); setPostsLoading(false) })
      .catch(() => setPostsLoading(false))
  }, [])

  return (
    <div className="pb-20 bg-[#222222] min-h-screen">

      {/* Header */}
      <div className="px-5 pt-4 pb-2">
        <h1 className="text-page-heading text-white">Community</h1>
      </div>

      {/* Chat Rooms */}
      <div className="px-5 mt-3">
        <p className="font-montserrat font-bold uppercase text-[10px] tracking-[0.14em] text-[#706b6b] mb-3">
          CHAT ROOMS
        </p>
        <RoomsList />
      </div>

      {/* Creator Corner */}
      <div className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <p className="font-montserrat font-bold uppercase text-[10px] tracking-[0.14em] text-[#e4dcd1]">
            CREATOR CORNER
          </p>
          <button
            onClick={() => router.push('/community/creator-corner')}
            className="text-[#e4dcd1] font-montserrat font-semibold text-[11px]"
          >
            View all →
          </button>
        </div>

        {/* New post prompt */}
        <button
          onClick={() => router.push('/community/creator-corner/new')}
          className="w-full p-4 rounded-xl bg-[#2a2a2a] text-left mb-3 border border-white/5 active:opacity-80 transition-opacity"
        >
          <p className="text-[#706b6b] font-montserrat text-sm">
            Share something with the community...
          </p>
        </button>

        {/* Recent posts */}
        {postsLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2].map(i => (
              <div key={i} className="h-24 bg-[#2a2a2a] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {posts.slice(0, 5).map(post => (
              <CreatorPostCard
                key={post.id}
                post={post}
                onDeleted={() => setPosts(prev => prev.filter(p => p.id !== post.id))}
              />
            ))}
            {posts.length === 0 && (
              <p className="text-center py-8 font-montserrat text-[#706b6b] text-sm">
                No posts yet. Be the first!
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
