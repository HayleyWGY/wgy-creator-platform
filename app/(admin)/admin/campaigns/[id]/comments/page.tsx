'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Send, CornerDownRight, Trash2 } from 'lucide-react'

interface Author {
  id: string
  firstName: string
  lastName: string
  profileImageUrl: string | null
  isAdmin: boolean
}

interface CampaignComment {
  id: string
  body: string
  createdAt: string
  author: Author
  replies?: CampaignComment[]
}

function getAge(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function AdminCampaignCommentsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [comments, setComments] = useState<CampaignComment[]>([])
  const [campaignTitle, setCampaignTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null)
  const [sending, setSending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      const [cRes, campRes] = await Promise.all([
        fetch(`/api/campaigns/${id}/comments`),
        fetch(`/api/campaigns/${id}`),
      ])
      const cData = await cRes.json()
      const campData = await campRes.json()
      setComments(cData.comments || [])
      setCampaignTitle(campData.campaign?.title || 'Campaign')
    } catch {
      // keep previous
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const total = comments.reduce((n, c) => n + 1 + (c.replies?.length || 0), 0)

  async function send() {
    if (!input.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/campaigns/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: input.trim(), parentId: replyingTo?.id }),
      })
      if (res.ok) {
        setInput('')
        setReplyingTo(null)
        load()
      }
    } finally {
      setSending(false)
    }
  }

  async function remove(commentId: string) {
    if (!confirm('Delete this comment?')) return
    const res = await fetch(`/api/campaigns/${id}/comments/${commentId}`, { method: 'DELETE' })
    if (res.ok) load()
  }

  function startReply(c: CampaignComment) {
    setReplyingTo({ id: c.id, name: c.author.isAdmin ? 'WGY' : c.author.firstName })
    inputRef.current?.focus()
  }

  function Bubble({ c, isReply }: { c: CampaignComment; isReply?: boolean }) {
    const initials = c.author.isAdmin ? 'WG' : `${c.author.firstName[0]}${c.author.lastName[0]}`
    return (
      <div style={{ display: 'flex', gap: 10, marginLeft: isReply ? 40 : 0 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: c.author.isAdmin ? '#9b7e56' : 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
          {c.author.profileImageUrl && !c.author.isAdmin ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.author.profileImageUrl} alt={initials} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 10, fontWeight: 700, color: c.author.isAdmin ? '#fff' : 'var(--text)', fontFamily: 'Montserrat, sans-serif' }}>{initials}</span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: c.author.isAdmin ? '#9b7e56' : 'var(--text)', fontFamily: 'Montserrat, sans-serif' }}>
              {c.author.isAdmin ? 'WGY' : `${c.author.firstName} ${c.author.lastName}`}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif' }}>{getAge(c.createdAt)}</span>
          </div>
          <p style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-muted)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'Montserrat, sans-serif' }}>{c.body}</p>
          <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
            <button onClick={() => startReply(c)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--accent)', fontSize: 11, fontWeight: 600, fontFamily: 'Montserrat, sans-serif' }}>
              <CornerDownRight size={11} /> Reply
            </button>
            <button onClick={() => remove(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, fontFamily: 'Montserrat, sans-serif' }}>
              <Trash2 size={11} /> Delete
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '32px 32px 20px' }}>
        <button
          onClick={() => router.push('/admin/campaigns')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16 }}
        >
          <ArrowLeft size={15} color="var(--text-muted)" />
          <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: 'var(--text-muted)' }}>Back to Campaigns</span>
        </button>
        <p className="font-montserrat font-bold uppercase" style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--text-muted)' }}>Campaign Comments</p>
        <h1 className="admin-title" style={{ fontSize: 28, marginTop: 4 }}>{campaignTitle}</h1>
        <p className="font-montserrat" style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{total} comment{total === 1 ? '' : 's'}</p>
      </div>

      <div style={{ flex: 1, padding: '0 32px 140px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 720 }}>
        {loading && <p className="font-montserrat" style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading...</p>}
        {!loading && comments.length === 0 && (
          <p className="font-montserrat" style={{ fontSize: 13, color: 'var(--text-muted)' }}>No comments on this campaign yet.</p>
        )}
        {comments.map(c => (
          <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Bubble c={c} />
            {c.replies?.map(r => <Bubble key={r.id} c={r} isReply />)}
          </div>
        ))}
      </div>

      {/* Composer — posts as WGY */}
      <div style={{ position: 'fixed', bottom: 0, left: 240, right: 0, background: 'var(--surface)', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '14px 32px' }}>
        {replyingTo && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="font-montserrat" style={{ fontSize: 11, color: 'var(--accent)' }}>Replying to {replyingTo.name}</span>
            <button onClick={() => setReplyingTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11, fontFamily: 'Montserrat, sans-serif' }}>Cancel</button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', maxWidth: 720 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#9b7e56', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', fontFamily: 'Montserrat, sans-serif' }}>WG</span>
          </div>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') send() }}
            placeholder={replyingTo ? `Reply as WGY...` : 'Comment as WGY...'}
            style={{ flex: 1, height: 44, background: 'var(--surface-2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-pill)', padding: '0 16px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'Montserrat, sans-serif' }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || sending}
            style={{ width: 44, height: 44, borderRadius: '50%', background: input.trim() ? 'var(--accent)' : 'var(--surface-2)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: input.trim() ? 'pointer' : 'not-allowed', flexShrink: 0 }}
          >
            <Send size={17} color={input.trim() ? 'var(--bg)' : 'var(--text-muted)'} />
          </button>
        </div>
      </div>

      <style>{`input::placeholder { color: var(--text-muted); }`}</style>
    </div>
  )
}
