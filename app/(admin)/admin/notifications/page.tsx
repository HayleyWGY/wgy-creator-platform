'use client'
import { useEffect, useState } from 'react'
import { Send } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/admin-page-header'

interface SentAnnouncement {
  title: string
  description: string
  createdAt: string
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [recent, setRecent] = useState<SentAnnouncement[]>([])

  function loadRecent() {
    fetch('/api/admin/notifications')
      .then(r => (r.ok ? r.json() : { recent: [] }))
      .then(d => setRecent(d.recent || []))
      .catch(() => {})
  }

  useEffect(() => { loadRecent() }, [])

  async function handleSend() {
    if (!title.trim() || !description.trim() || sending) return
    if (!confirm(`Send this notification to ALL active creators?\n\n"${title}"\n${description}`)) return

    setSending(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to send')
        return
      }
      setResult(`Sent to ${data.recipients} creator${data.recipients === 1 ? '' : 's'} ✓`)
      setTitle('')
      setDescription('')
      loadRecent()
    } finally {
      setSending(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '12px 14px', color: 'var(--text)', fontSize: 13,
    fontFamily: 'Montserrat, sans-serif', fontWeight: 500, outline: 'none', resize: 'none',
  }

  return (
    <div style={{ padding: 32, maxWidth: 720 }}>
      <AdminPageHeader
        eyebrow="Notifications"
        title="Send an"
        accent="announcement"
        subtitle="Goes to every active creator's notification bell instantly. When the app is wrapped for the app stores and push is connected, these will also hit lock screens."
      />

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: 24 }}>
        <label className="eyebrow" style={{ display: 'block', marginBottom: 8 }}>Title</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Flash sale this weekend 🎉"
          maxLength={80}
          style={{ ...inputStyle, background: 'var(--surface-2)' }}
        />

        <label className="eyebrow" style={{ display: 'block', margin: '18px 0 8px' }}>Message</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Keep it short and friendly — this is what creators see under the title."
          rows={3}
          maxLength={240}
          style={{ ...inputStyle, background: 'var(--surface-2)' }}
        />
        <p className="font-montserrat" style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right', marginTop: 4 }}>
          {description.length}/240
        </p>

        {error && <p className="font-montserrat" style={{ fontSize: 12, color: 'var(--error)', marginTop: 10 }}>{error}</p>}
        {result && <p className="font-montserrat" style={{ fontSize: 12, fontWeight: 600, color: 'var(--success)', marginTop: 10 }}>{result}</p>}

        <button
          onClick={handleSend}
          disabled={sending || !title.trim() || !description.trim()}
          className="font-montserrat uppercase"
          style={{
            marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'var(--pill-bg)', color: 'var(--pill-text)', border: 'none',
            borderRadius: 'var(--radius-pill)', padding: '12px 24px', fontSize: 12,
            fontWeight: 800, letterSpacing: '0.09em', cursor: 'pointer',
            opacity: sending || !title.trim() || !description.trim() ? 0.5 : 1,
          }}
        >
          <Send size={14} />
          {sending ? 'Sending…' : 'Send to all creators'}
        </button>
      </div>

      {/* Recent sends */}
      <div style={{ marginTop: 32 }}>
        <p className="eyebrow" style={{ marginBottom: 12 }}>Recently sent</p>
        {recent.length === 0 && (
          <p className="font-montserrat" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>
            Nothing sent yet.
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recent.map((r, i) => (
            <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
                <p className="font-montserrat" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{r.title}</p>
                <span className="font-montserrat" style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{formatWhen(r.createdAt)}</span>
              </div>
              <p className="font-montserrat" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', margin: '4px 0 0' }}>{r.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
