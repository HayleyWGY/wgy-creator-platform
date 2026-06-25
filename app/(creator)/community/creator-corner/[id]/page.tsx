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
      width: size, height: size, borderRadius: '50%', background: 'var(--beige)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{ color: '#111111', fontWeight: 800, fontFamily: 'Montserrat, sans-serif', fontSize: size * 0.35 }}>
        {initials}
      </span>
    </div>
  )
}

function highlightMentions(text: string) {
  const parts = text.split(/(@\w+)/g)
  return parts.map((part, i) =>
    part.startsWith('@')
      ? <strong key={i} style={{ color: 'var(--accent)' }}>{part}</strong>
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
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="w-6 h-6 rounded-full animate-spin" style={{ border: '2px solid var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!post) return null

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', paddingBottom: 160 }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center rounded-full"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          aria-label="Back"
        >
          <ArrowLeft size={16} style={{ color: 'var(--accent)' }} />
        </button>
        <p className="font-montserrat text-sm" style={{ fontWeight: 700, color: 'var(--text)' }}>Creator Corner</p>
      </div>

      {/* Post */}
      <div className="px-5 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <Avatar author={post.author} size={40} />
          <div>
            <p className="font-montserrat text-sm" style={{ fontWeight: 700, color: 'var(--text)' }}>
              {post.author.firstName} {post.author.lastName}
            </p>
            <p className="text-xs" style={{ fontWeight: 500, color: 'var(--text-muted)' }}>{getAge(post.createdAt)}</p>
          </div>
        </div>

        <p className="font-montserrat text-[14px]" style={{ fontWeight: 500, color: 'var(--text)', lineHeight: 1.6 }}>{post.body}</p>

        {post.imageUrl && (
          <div className="mt-4 overflow-hidden" style={{ borderRadius: 'var(--radius-card)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.imageUrl} alt="Post image" className="w-full object-cover" />
          </div>
        )}

        <div className="flex gap-4 mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <span className="text-[12px] font-montserrat" style={{ fontWeight: 600, color: 'var(--text-muted)' }}>♥ {post.likesCount}</span>
          <span className="text-[12px] font-montserrat" style={{ fontWeight: 600, color: 'var(--text-muted)' }}>💬 {comments.length}</span>
        </div>
      </div>

      {/* Comments */}
      <div className="px-5 mt-6">
        <p className="eyebrow" style={{ marginBottom: 16 }}>Comments</p>

        {comments.length === 0 && (
          <p className="text-sm text-center py-4" style={{ fontWeight: 500, color: 'var(--text-muted)' }}>No comments yet. Be the first!</p>
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
                    <div className="px-3 py-2" style={{ background: 'var(--surface)', borderRadius: '4px 12px 12px 12px' }}>
                      <p className="font-montserrat text-[11px]" style={{ fontWeight: 700, color: 'var(--text)' }}>
                        {c.author.firstName} {c.author.lastName}
                      </p>
                      <p className="font-montserrat text-[12px] mt-1" style={{ fontWeight: 500, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                        {highlightMentions(c.body)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 mt-1 ml-1">
                      <span className="font-montserrat text-[10px]" style={{ color: 'var(--text-muted)' }}>{getAge(c.createdAt)}</span>
                      <button
                        onClick={() => handleStartReply(c)}
                        className="font-montserrat text-[11px] transition-colors"
                        style={{ fontWeight: 700, color: 'var(--text-muted)' }}
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                </div>

                {/* Replies */}
                {replies.length > 0 && (
                  <div style={{ marginLeft: 36, paddingLeft: 12, borderLeft: '2px solid var(--border)', marginTop: 8 }}>
                    <div className="flex flex-col gap-3">
                      {visibleReplies.map(r => (
                        <div key={r.id} className="flex gap-2">
                          <Avatar author={r.author} size={24} />
                          <div className="flex-1">
                            <div className="px-3 py-2" style={{ background: 'var(--surface)', borderRadius: '4px 12px 12px 12px' }}>
                              <p className="font-montserrat text-[10px]" style={{ fontWeight: 700, color: 'var(--text)' }}>
                                {r.author.firstName} {r.author.lastName}
                              </p>
                              <p className="font-montserrat text-[11px] mt-0.5" style={{ fontWeight: 500, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                                {highlightMentions(r.body)}
                              </p>
                            </div>
                            <span className="font-montserrat text-[10px] ml-1 mt-0.5 block" style={{ color: 'var(--text-muted)' }}>
                              {getAge(r.createdAt)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {hiddenCount > 0 && (
                      <button
                        onClick={() => toggleReplies(c.id)}
                        className="font-montserrat text-[11px] mt-2 block"
                        style={{ fontWeight: 700, color: 'var(--accent)' }}
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
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          zIndex: 50,
        }}
      >
        {/* Replying-to indicator */}
        {replyingTo && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 16px', background: 'var(--surface-2)',
            borderRadius: '8px 8px 0 0',
          }}>
            <span style={{ color: 'var(--accent)', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 11 }}>
              @{replyingTo.authorName}
            </span>
            <button onClick={handleCancelReply} aria-label="Cancel reply">
              <X size={14} style={{ color: 'var(--text-muted)' }} />
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
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '10px 14px',
              color: 'var(--text)',
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 500,
              fontSize: 13,
              resize: 'none',
              outline: 'none',
              minHeight: 42,
            }}
          />
          <button
            onClick={handleComment}
            disabled={!comment.trim() || submitting}
            aria-label="Send comment"
            style={{
              width: 40, height: 40, borderRadius: '50%',
              background: comment.trim() ? 'var(--pill-bg)' : 'var(--surface-2)',
              border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: comment.trim() ? 'pointer' : 'default', flexShrink: 0,
            }}
          >
            <Send size={16} style={{ color: comment.trim() ? 'var(--pill-text)' : 'var(--text-muted)' }} />
          </button>
        </div>
        <style>{`textarea::placeholder { color: var(--text-muted); }`}</style>
      </div>
    </div>
  )
}
