'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Send, Trash2 } from 'lucide-react'
import { getAge } from '@/lib/utils'

interface CommentAuthor {
  id: string
  firstName: string
  lastName: string
  profileImageUrl: string | null
  isAdmin: boolean
}

interface ContentComment {
  id: string
  body: string
  createdAt: string
  author: CommentAuthor
}

function Avatar({ author }: { author: CommentAuthor }) {
  if (author.profileImageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={author.profileImageUrl}
        alt=""
        style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    )
  }
  const initials = author.isAdmin ? 'WG' : `${author.firstName[0]}${author.lastName[0]}`
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%',
      background: author.isAdmin ? 'var(--beige)' : 'var(--surface-2)',
      border: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{ fontSize: 10, fontWeight: 800, color: author.isAdmin ? '#111111' : 'var(--text)', fontFamily: 'Montserrat, sans-serif' }}>
        {initials}
      </span>
    </div>
  )
}

/**
 * Comments on Learning Lounge content — mirrors the community-post
 * comment pattern (avatar, name, time, delete own/admin, inline input).
 * Admin comments display as "WGY" with the gold voice accent, matching
 * messaging.
 */
export function ContentComments({ contentId }: { contentId: string }) {
  const { data: session } = useSession()
  const [comments, setComments] = useState<ContentComment[]>([])
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch(`/api/content/${contentId}/comments`)
      .then(r => (r.ok ? r.json() : { comments: [] }))
      .then(d => setComments(d.comments || []))
      .catch(() => {})
  }, [contentId])

  async function handleSubmit() {
    if (!body.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/content/${contentId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      if (res.ok) {
        const { comment } = await res.json()
        setComments(prev => [...prev, comment])
        setBody('')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(commentId: string) {
    if (!confirm('Delete this comment?')) return
    const res = await fetch(`/api/content/${contentId}/comments/${commentId}`, { method: 'DELETE' })
    if (res.ok) setComments(prev => prev.filter(c => c.id !== commentId))
  }

  return (
    <div style={{ padding: '8px 20px 32px' }}>
      <div style={{ height: 1, background: 'var(--border)', margin: '8px 0 20px' }} />
      <p className="eyebrow" style={{ marginBottom: 16 }}>
        Comments{comments.length > 0 ? ` (${comments.length})` : ''}
      </p>

      {comments.length === 0 && (
        <p className="font-montserrat" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 16 }}>
          No comments yet — share your thoughts!
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
        {comments.map(c => {
          const canDelete = c.author.id === session?.user?.id || session?.user?.isAdmin
          return (
            <div key={c.id} style={{ display: 'flex', gap: 10 }}>
              <Avatar author={c.author} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ background: 'var(--surface)', borderRadius: '4px 12px 12px 12px', padding: '9px 13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                    <span className="font-montserrat" style={{ fontSize: 11, fontWeight: 700, color: c.author.isAdmin ? 'var(--gold-wgy)' : 'var(--text)' }}>
                      {c.author.isAdmin ? 'WGY' : `${c.author.firstName} ${c.author.lastName}`}
                    </span>
                    {canDelete && (
                      <button onClick={() => handleDelete(c.id)} aria-label="Delete comment" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--text-muted)', opacity: 0.6 }}>
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                  <p className="font-montserrat" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', lineHeight: 1.6, margin: '3px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {c.body}
                  </p>
                </div>
                <span className="font-montserrat" style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4, marginTop: 3, display: 'block' }}>
                  {getAge(c.createdAt)}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit()
            }
          }}
          placeholder="Write a comment..."
          rows={1}
          style={{
            flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 20, padding: '10px 16px', color: 'var(--text)', fontSize: 13,
            fontWeight: 500, resize: 'none', fontFamily: 'Montserrat, sans-serif',
            outline: 'none', minHeight: 42, lineHeight: 1.5,
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!body.trim() || submitting}
          aria-label="Send comment"
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: body.trim() ? 'var(--pill-bg)' : 'var(--surface-2)',
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: body.trim() ? 'pointer' : 'default', flexShrink: 0,
          }}
        >
          <Send size={15} style={{ color: body.trim() ? 'var(--pill-text)' : 'var(--text-muted)' }} />
        </button>
      </div>
      <style>{`textarea::placeholder { color: var(--text-muted); }`}</style>
    </div>
  )
}
