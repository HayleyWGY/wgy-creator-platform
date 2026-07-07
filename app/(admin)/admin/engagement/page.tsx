'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle, CornerDownRight } from 'lucide-react'

interface EngagementItem {
  id: string
  kind: 'community' | 'campaign'
  action: 'comment' | 'reply'
  authorName: string
  authorImage: string | null
  body: string
  context: string
  href: string
  createdAt: string
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

export default function EngagementPage() {
  const router = useRouter()
  const [items, setItems] = useState<EngagementItem[]>([])
  const [seenAt, setSeenAt] = useState<string>(new Date().toISOString())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/engagement')
      .then(r => r.json())
      .then(d => {
        setItems(d.items || [])
        setSeenAt(d.seenAt || new Date(0).toISOString())
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    // Opening the page marks everything seen (clears the sidebar badge)
    fetch('/api/admin/engagement', { method: 'POST' }).catch(() => {})
  }, [])

  return (
    <div>
      <div style={{ padding: '32px 32px 24px' }}>
        <p className="font-montserrat font-bold uppercase" style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--text-muted)' }}>Engagement</p>
        <h1 className="admin-title" style={{ fontSize: 32, marginTop: 4 }}>Comments &amp; Replies</h1>
        <p className="font-montserrat" style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, maxWidth: 560, lineHeight: 1.5 }}>
          Everything creators post on WGY campaigns and posts, and every reply to a WGY comment — newest first. Tap any item to open the thread and reply.
        </p>
      </div>

      <div style={{ padding: '0 32px 40px', maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading && <p className="font-montserrat" style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading...</p>}
        {!loading && items.length === 0 && (
          <p className="font-montserrat" style={{ fontSize: 13, color: 'var(--text-muted)' }}>No engagement yet — comments and replies on WGY content will appear here.</p>
        )}
        {items.map(item => {
          const isNew = new Date(item.createdAt) > new Date(seenAt)
          const initials = item.authorName.split(' ').map(s => s[0]).slice(0, 2).join('')
          return (
            <button
              key={`${item.kind}-${item.id}`}
              onClick={() => router.push(item.href)}
              style={{
                display: 'flex', gap: 12, alignItems: 'flex-start', textAlign: 'left',
                background: isNew ? 'rgba(228,220,209,0.06)' : 'var(--surface)',
                border: '1px solid rgba(255,255,255,0.06)', borderLeft: isNew ? '3px solid var(--accent)' : '3px solid transparent',
                borderRadius: 12, padding: '14px 16px', cursor: 'pointer', width: '100%',
              }}
            >
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                {item.authorImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.authorImage} alt={initials} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', fontFamily: 'Montserrat, sans-serif' }}>{initials}</span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  {item.action === 'reply'
                    ? <CornerDownRight size={12} color="var(--accent)" style={{ flexShrink: 0 }} />
                    : <MessageCircle size={12} color="var(--accent)" style={{ flexShrink: 0 }} />}
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'Montserrat, sans-serif' }}>{item.authorName}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif' }}>{item.context}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif', marginLeft: 'auto', flexShrink: 0 }}>{getAge(item.createdAt)}</span>
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0, fontFamily: 'Montserrat, sans-serif', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {item.body}
                </p>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif' }}>
                  {item.kind === 'campaign' ? 'Campaign' : 'Community'}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
