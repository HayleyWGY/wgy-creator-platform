'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, X } from 'lucide-react'
import { getAge } from '@/lib/utils'

interface Author {
  id: string
  firstName: string
  lastName: string
  profileImageUrl: string | null
}

interface Reply {
  id: string
  body: string
  createdAt: string
  author: Author
}

interface Comment {
  id: string
  body: string
  createdAt: string
  author: Author
  replies: Reply[]
}

interface Post {
  id: string
  body: string
  imageUrl: string | null
  likesCount: number
  commentsCount: number
  createdAt: string
  author: Author
}

function Avatar({ author, size = 28 }: { author: Author; size?: number }) {
  const initials = `${author.firstName[0]}${author.lastName[0]}`
  if (author.profileImageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={author.profileImageUrl}
        alt={initials}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: '#e4dcd1',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{ color: '#222222', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', fontSize: size * 0.35 }}>
        {initials}
      </span>
    </div>
  )
}

function highlightMentions(text: string) {
  const parts = text.split(/(@\w+)/g)
  return parts.map((part, i) =>
    part.startsWith('@')
      ? <strong key={i} style={{ color: '#e4dcd1' }}>{part}</strong>
      : <span key={i}>{part}</span>
  )
}

export default function PostDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string } | null>(null)
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set())

  useEffect(() => {
    Promise.all([
      fetch(`/api/creator-posts/${params.id}`).then(r => r.json()),
      fetch(`/api/creator-posts/${params.id}/comments`).then(r => r.json()),
    ]).then(([postData, commentData]) => {
      setPost(postData.post)
      setComments(commentData.comments || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [params.id])

  const handleStartReply = (c: Comment) => {
    setReplyingTo({ id: c.id, authorName: `${c.author.firstName} ${c.author.lastName}` })
    setComment(`@${c.author.firstName}${c.author.lastName.replace(/\s/g, '')} `)
  }

  const handleCancelReply = () => {
    setReplyingTo(null)
    setComment('')
  }

  const handleComment = async () => {
    if (!comment.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/creator-posts/${params.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: comment, parentId: replyingTo?.id || null }),
      })
      const data = await res.json()
      if (data.comment) {
        if (replyingTo) {
          // Add reply to parent comment
          setComments(prev => prev.map(c =>
            c.id === replyingTo.id
              ? { ...c, replies: [...(c.replies || []), data.comment] }
              : c
          ))
        } else {
          setComments(prev => [...prev, { ...data.comment, replies: [] }])
        }
        setComment('')
        setReplyingTo(null)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const toggleReplies = (commentId: string) => {
    setExpandedReplies(prev => {
      const next = new Set(prev)
      if (next.has(commentId)) next.delete(commentId)
      else next.add(commentId)
      return next
    })
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#222222]">
        <div className="w-6 h-6 border-2 border-[#e4dcd1] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!post) return null

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
          <Avatar author={post.author} size={40} />
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
          <span className="text-[#706b6b] text-[12px] font-montserrat">💬 {comments.length}</span>
        </div>
      </div>

      {/* Comments */}
      <div className="px-5 mt-6">
        <p className="font-montserrat font-bold uppercase text-[10px] tracking-[0.14em] text-[#706b6b] mb-4">
          COMMENTS
        </p>

        {comments.length === 0 && (
          <p className="text-[#706b6b] text-sm text-center py-4">No comments yet. Be the first!</p>
        )}

        <div className="flex flex-col gap-5">
          {comments.map(c => {
            const showAllReplies = expandedReplies.has(c.id)
            const replies = c.replies || []
            const visibleReplies = showAllReplies ? replies : replies.slice(0, 1)
            const hiddenCount = replies.length - 1

            return (
              <div key={c.id}>
                {/* Top-level comment */}
                <div className="flex gap-3">
                  <Avatar author={c.author} size={28} />
                  <div className="flex-1">
                    <div className="bg-[#2a2a2a] rounded-xl rounded-tl-none px-3 py-2">
                      <p className="text-white font-montserrat font-semibold text-[11px]">
                        {c.author.firstName} {c.author.lastName}
                      </p>
                      <p className="text-[#c8c3bc] font-montserrat text-[12px] mt-1 leading-relaxed">
                        {highlightMentions(c.body)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 mt-1 ml-1">
                      <span className="text-[#706b6b] font-montserrat text-[10px]">{getAge(c.createdAt)}</span>
                      <button
                        onClick={() => handleStartReply(c)}
                        className="text-[#706b6b] font-montserrat font-semibold text-[11px] hover:text-[#e4dcd1] transition-colors"
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                </div>

                {/* Replies */}
                {replies.length > 0 && (
                  <div style={{ marginLeft: 36, paddingLeft: 12, borderLeft: '2px solid rgba(228,220,209,0.1)', marginTop: 8 }}>
                    <div className="flex flex-col gap-3">
                      {visibleReplies.map(r => (
                        <div key={r.id} className="flex gap-2">
                          <Avatar author={r.author} size={24} />
                          <div className="flex-1">
                            <div className="bg-[#2a2a2a] rounded-xl rounded-tl-none px-3 py-2">
                              <p className="text-white font-montserrat font-semibold text-[10px]">
                                {r.author.firstName} {r.author.lastName}
                              </p>
                              <p className="text-[#c8c3bc] font-montserrat text-[11px] mt-0.5 leading-relaxed">
                                {highlightMentions(r.body)}
                              </p>
                            </div>
                            <span className="text-[#706b6b] font-montserrat text-[10px] ml-1 mt-0.5 block">
                              {getAge(r.createdAt)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {hiddenCount > 0 && (
                      <button
                        onClick={() => toggleReplies(c.id)}
                        className="font-montserrat font-semibold text-[11px] mt-2 block"
                        style={{ color: '#e4dcd1' }}
                      >
                        {showAllReplies ? 'Hide replies' : `View ${hiddenCount} more ${hiddenCount === 1 ? 'reply' : 'replies'}`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Fixed comment input */}
      <div
        style={{
          position: 'fixed',
          bottom: 64,
          left: 0,
          right: 0,
          background: '#222222',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          zIndex: 50,
        }}
      >
        {/* Replying-to indicator */}
        {replyingTo && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 16px', background: 'rgba(228,220,209,0.08)',
            borderRadius: '8px 8px 0 0',
          }}>
            <span style={{ color: '#e4dcd1', fontFamily: 'Montserrat, sans-serif', fontSize: 11 }}>
              @{replyingTo.authorName}
            </span>
            <button onClick={handleCancelReply}>
              <X size={14} color="#706b6b" />
            </button>
          </div>
        )}

        <div className="max-w-[390px] mx-auto flex gap-3 items-end w-full p-3">
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleComment()
              }
            }}
            placeholder={replyingTo ? `Reply to @${replyingTo.authorName}...` : 'Write a comment...'}
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
              width: 40, height: 40, borderRadius: '50%',
              background: comment.trim() ? '#e4dcd1' : '#333333',
              border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: comment.trim() ? 'pointer' : 'default', flexShrink: 0,
            }}
          >
            <Send size={16} color={comment.trim() ? '#222222' : '#706b6b'} />
          </button>
        </div>
      </div>
    </div>
  )
}
