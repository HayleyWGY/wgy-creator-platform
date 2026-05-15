'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus } from 'lucide-react'
import { CreatorPostCard, type CreatorPost } from '@/components/creator/creator-post-card'

export default function CreatorCornerPage() {
  const router = useRouter()
  const [posts, setPosts]   = useState<CreatorPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/creator-posts?limit=50')
      .then(r => r.json())
      .then(d => { setPosts(d.posts || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="pb-20 min-h-screen bg-[#222222]">

      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-4">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-[#2a2a2a]"
        >
          <ArrowLeft size={16} color="#e4dcd1" />
        </button>
        <h1 className="text-page-heading text-white flex-1">Creator Corner</h1>
        <button
          onClick={() => router.push('/community/creator-corner/new')}
          className="w-9 h-9 rounded-full bg-[#e4dcd1] flex items-center justify-center"
        >
          <Plus size={18} color="#222222" />
        </button>
      </div>

      {/* Posts */}
      <div className="px-5 flex flex-col gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-[#2a2a2a] rounded-xl animate-pulse" />
          ))
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-playfair italic text-white text-lg">No posts yet</p>
            <p className="text-[#706b6b] text-sm mt-2">Be the first to share something!</p>
          </div>
        ) : (
          posts.map(post => (
            <CreatorPostCard
              key={post.id}
              post={post}
              truncate={true}
              onDeleted={() => setPosts(prev => prev.filter(p => p.id !== post.id))}
            />
          ))
        )}
      </div>
    </div>
  )
}
