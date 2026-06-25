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
    <div className="pb-20 min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-4">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center rounded-full"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          aria-label="Back"
        >
          <ArrowLeft size={16} style={{ color: 'var(--accent)' }} />
        </button>
        <h1 className="text-page-heading flex-1" style={{ margin: 0 }}>Creator Corner</h1>
        <button
          onClick={() => router.push('/community/creator-corner/new')}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'var(--pill-bg)' }}
          aria-label="New post"
        >
          <Plus size={18} style={{ color: 'var(--pill-text)' }} />
        </button>
      </div>

      {/* Posts */}
      <div className="px-5 flex flex-col gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)' }} />
          ))
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-montserrat" style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>No posts yet</p>
            <p className="text-sm mt-2" style={{ fontWeight: 500, color: 'var(--text-muted)' }}>Be the first to share something!</p>
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
