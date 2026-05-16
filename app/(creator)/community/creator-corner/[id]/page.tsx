'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send } from 'lucide-react'
import { getAge } from '@/lib/utils'

interface Author {
  id: string
  firstName: string
  lastName: string
  profileImageUrl: string | null
}

interface Comment {
  id: string
  body: string
  createdAt: string
  author: Author
}

interface Post {
  id: string
  body: string
  imageUrl: string | null
  likesCount: number
  commentsCount: number
  createdAt: string
  author: Author
  comments: Comment[]
}

export default function PostDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [post, setPost]           = useState<Post | null>(null)
  const [loading, setLoading]     = useState(true)
  const [comment, setComment]     = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch(`/api/creator-posts/${params.id}`)
      .then(r => r.json())
      .then(d => { setPost(d.post); setLoading(false) })
      .catch(() => setLoading(false))
  }, [params.id])

  const handleComment = async () => {
    if (!comment.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/creator-posts/${params.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: comment }),
      })
      const data = await res.json()
      if (data.comment) {
        setPost(prev => prev ? {
          ...prev,
          comments:      [...prev.comments, data.comment],
          commentsCount: prev.commentsCount + 1,
        } : prev)
        setComment('')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#222222]">
        <div className="w-6 h-6 border-2 border-[#e4dcd1] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!post) return null

  const initials = `${post.author.firstName[0]}${post.author.lastName[0]}`

  return (
    <div className="min-h-screen bg-[#222222]" style={{ paddingBottom: 160 }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-[#2a2a2a]"
        >
          <ArrowLeft size={16} color="#e4dcd1" />
        </button>
        <p className="text-white font-montserrat font-semibold text-sm">Creator Corner</p>
      </div>

      {/* Post */}
      <div className="px-5 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#e4dcd1] flex items-center justify-center overflow-hidden">
            {post.author.profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.author.profileImageUrl} alt={initials} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[#222222] font-bold font-montserrat text-sm">{initials}</span>
            )}
          </div>
          <div>
            <p className="text-white font-montserrat font-semibold text-sm">
              {post.author.firstName} {post.author.lastName}
            </p>
            <p className="text-[#706b6b] text-xs">{getAge(post.createdAt)}</p>
          </div>
        </div>

        <p className="text-[#c8c3bc] font-montserrat text-[14px] leading-relaxed">{post.body}</p>

        {post.imageUrl && (
          <div className="mt-4 rounded-xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.imageUrl} alt="Post image" className="w-full object-cover" />
          </div>
        )}

        <div className="flex gap-4 mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <span className="text-[#706b6b] text-[12px] font-montserrat">♥ {post.likesCount}</span>
          <span className="text-[#706b6b] text-[12px] font-montserrat">💬 {post.comments?.length || 0}</span>
        </div>
      </div>

      {/* Comments */}
      <div className="px-5 mt-6">
        <p className="font-montserrat font-bold uppercase text-[10px] tracking-[0.14em] text-[#706b6b] mb-4">
          COMMENTS
        </p>

        {post.comments?.length === 0 && (
          <p className="text-[#706b6b] text-sm text-center py-4">No comments yet. Be the first!</p>
        )}

        <div className="flex flex-col gap-4">
          {post.comments?.map(c => (
            <div key={c.id} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-[#e4dcd1] flex items-center justify-center flex-shrink-0">
                <span className="text-[#222222] font-bold font-montserrat text-[9px]">
                  {c.author.firstName[0]}{c.author.lastName[0]}
                </span>
              </div>
              <div className="flex-1 bg-[#2a2a2a] rounded-xl rounded-tl-none px-3 py-2">
                <p className="text-white font-montserrat font-semibold text-[11px]">
                  {c.author.firstName} {c.author.lastName}
                </p>
                <p className="text-[#c8c3bc] font-montserrat text-[12px] mt-1 leading-relaxed">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fixed comment input */}
      <div
        style={{
          position: 'fixed',
          bottom: 64,
          left: 0,
          right: 0,
          padding: '12px 16px',
          background: '#222222',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-end',
          zIndex: 50,
        }}
      >
        <div className="max-w-[390px] mx-auto flex gap-3 items-end w-full">
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleComment()
              }
            }}
            placeholder="Write a comment..."
            rows={1}
            style={{
              flex: 1,
              background: '#2a2a2a',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              padding: '10px 14px',
              color: 'white',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: 13,
              resize: 'none',
              outline: 'none',
              minHeight: 42,
            }}
          />
          <button
            onClick={handleComment}
            disabled={!comment.trim() || submitting}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: comment.trim() ? '#e4dcd1' : '#333333',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: comment.trim() ? 'pointer' : 'default',
              flexShrink: 0,
            }}
          >
            <Send size={16} color={comment.trim() ? '#222222' : '#706b6b'} />
          </button>
        </div>
      </div>
    </div>
  )
}
