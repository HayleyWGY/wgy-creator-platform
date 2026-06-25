'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { COMMUNITY_ROOMS } from '@/lib/constants'
import { CreatorPostCard, type CreatorPost } from '@/components/creator/creator-post-card'
import { Eyebrow } from '@/components/ui/eyebrow'
import { SectionHeader } from '@/components/ui/section-header'

function RoomsList() {
  const router = useRouter()
  return (
    <div className="flex flex-col gap-2">
      {COMMUNITY_ROOMS.map(room => (
        <div
          key={room.id}
          onClick={() => router.push(`/community/${room.id}`)}
          className="flex items-center gap-3 p-4 cursor-pointer active:opacity-80 transition-opacity"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)' }}
        >
          <div
            className="w-10 h-10 flex items-center justify-center text-lg flex-shrink-0"
            style={{ background: 'var(--surface-2)', borderRadius: 12 }}
          >
            {room.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-montserrat text-sm" style={{ fontWeight: 700, color: 'var(--text)' }}>{room.name}</p>
            <p className="text-xs truncate mt-0.5" style={{ fontWeight: 500, color: 'var(--text-muted)' }}>{room.description}</p>
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
    <div className="pb-20 min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div className="px-5 pt-6 pb-2">
        <Eyebrow style={{ marginBottom: 8 }}>Community</Eyebrow>
        <h2 className="text-heading-large" style={{ margin: 0 }}>The <em className="font-accent">collective</em></h2>
      </div>

      {/* Chat Rooms */}
      <div className="px-5 mt-4">
        <Eyebrow style={{ marginBottom: 12 }}>Chat Rooms</Eyebrow>
        <RoomsList />
      </div>

      {/* Creator Corner */}
      <div className="px-5 mt-7">
        <Eyebrow style={{ marginBottom: 10 }}>Creator Corner</Eyebrow>
        <div className="mb-3">
          <SectionHeader lead="From the" accent="community" seeAllHref="/community/creator-corner" />
        </div>

        {/* New post prompt */}
        <button
          onClick={() => router.push('/community/creator-corner/new')}
          className="w-full p-4 text-left mb-3 active:opacity-80 transition-opacity"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)' }}
        >
          <p className="font-montserrat text-sm" style={{ fontWeight: 500, color: 'var(--text-muted)' }}>
            Share something with the community...
          </p>
        </button>

        {/* Recent posts */}
        {postsLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2].map(i => (
              <div key={i} className="h-24 animate-pulse" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)' }} />
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
              <p className="text-center py-8 font-montserrat text-sm" style={{ fontWeight: 500, color: 'var(--text-muted)' }}>
                No posts yet. Be the first!
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
