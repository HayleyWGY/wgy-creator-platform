'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, Trash2, Pin } from 'lucide-react'

interface Author {
  id: string
  firstName: string
  lastName: string
  isAdmin: boolean
}

interface Message {
  id: string
  body: string
  imageUrl: string | null
  createdAt: string
  isDeleted: boolean
  author: Author
}

interface PinnedMessage {
  id: string
  body: string
  author: { firstName: string; lastName: string; isAdmin: boolean }
}

const ROOM_META: Record<string, { emoji: string; name: string }> = {
  'group-chat':      { emoji: '💬', name: 'Group Chat' },
  'social-links':    { emoji: '🔗', name: 'Social Links' },
  'affiliate-links': { emoji: '💰', name: 'Affiliate Links' },
  'creator-collabs': { emoji: '🤝', name: 'Creator Collabs' },
  'events-chat':     { emoji: '📅', name: 'Events Chat' },
}

function getAge(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function AdminRoomPage({ params }: { params: { slug: string } }) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [pinnedMessage, setPinnedMessage] = useState<PinnedMessage | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const meta = ROOM_META[params.slug] ?? { emoji: '💬', name: params.slug }

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat/rooms/${params.slug}/messages`)
      if (!res.ok) return
      const data = await res.json()
      setMessages(data.messages || [])
      setPinnedMessage(data.pinnedMessage || null)
    } catch {}
  }, [params.slug])

  useEffect(() => {
    loadMessages()
    const id = setInterval(loadMessages, 5000)
    return () => clearInterval(id)
  }, [loadMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || sending) return
    setSending(true)
    const text = input.trim()
    setInput('')
    try {
      const res = await fetch(`/api/chat/rooms/${params.slug}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      })
      if (res.ok) {
        const data = await res.json()
        setMessages(prev => [...prev, data.message])
      }
    } catch {
      setInput(text)
    } finally {
      setSending(false)
    }
  }

  const handleDelete = async (msgId: string) => {
    if (!confirm('Delete this message?')) return
    await fetch(`/api/chat/rooms/${params.slug}/messages/${msgId}`, { method: 'DELETE' })
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isDeleted: true, body: '[deleted]' } : m))
  }

  const handlePin = async (messageId: string) => {
    await fetch(`/api/chat/rooms/${params.slug}/pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId }),
    })
    loadMessages()
  }

  const handleUnpin = async () => {
    await fetch(`/api/chat/rooms/${params.slug}/pin`, { method: 'DELETE' })
    loadMessages()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#222222' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', background: '#1a1a1a', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button
          onClick={() => router.push('/admin/community')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
        >
          <ArrowLeft size={18} color="#706b6b" />
        </button>
        <span style={{ fontSize: 20 }}>{meta.emoji}</span>
        <div>
          <p style={{ margin: 0, color: 'white', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 15 }}>{meta.name}</p>
          <p style={{ margin: 0, color: '#706b6b', fontFamily: 'Montserrat, sans-serif', fontSize: 11 }}>{messages.length} messages</p>
        </div>
      </div>

      {/* Pinned message banner */}
      {pinnedMessage && (
        <div style={{
          margin: '12px 24px 0',
          background: 'rgba(155,126,86,0.15)',
          border: '1px solid rgba(155,126,86,0.3)',
          borderRadius: 10,
          padding: '10px 14px',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>📌</span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 3px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.10em', color: '#9b7e56' }}>
              PINNED MESSAGE
            </p>
            <p style={{ margin: 0, fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: '#c8c3bc', lineHeight: 1.5 }}>
              {pinnedMessage.body}
            </p>
          </div>
          <button
            onClick={handleUnpin}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9b7e56', fontFamily: 'Montserrat, sans-serif', fontSize: 11, fontWeight: 600, flexShrink: 0, padding: '2px 0' }}
          >
            Unpin
          </button>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ color: '#706b6b', fontFamily: 'Montserrat, sans-serif', fontSize: 13 }}>No messages yet</p>
          </div>
        )}
        {messages.map(msg => {
          const isAdmin = msg.author?.isAdmin
          const initials = `${msg.author?.firstName?.[0] || ''}${msg.author?.lastName?.[0] || ''}`
          const isPinned = pinnedMessage?.id === msg.id
          return (
            <div key={msg.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: isAdmin ? '#9b7e56' : '#e4dcd1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: '#222', fontWeight: 700, fontSize: 10, fontFamily: 'Montserrat, sans-serif' }}>
                  {isAdmin ? 'WG' : initials}
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                  <span style={{ color: isAdmin ? '#9b7e56' : 'white', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 12 }}>
                    {isAdmin ? 'WGY' : `${msg.author?.firstName} ${msg.author?.lastName}`}
                  </span>
                  <span style={{ color: '#706b6b', fontFamily: 'Montserrat, sans-serif', fontSize: 10 }}>
                    {getAge(msg.createdAt)}
                  </span>
                  {isPinned && (
                    <span style={{ color: '#9b7e56', fontFamily: 'Montserrat, sans-serif', fontSize: 9, fontWeight: 700 }}>📌 PINNED</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ background: '#2a2a2a', borderRadius: '0 12px 12px 12px', padding: '8px 14px', maxWidth: 600 }}>
                    <p style={{ color: msg.isDeleted ? '#706b6b' : 'white', fontFamily: 'Montserrat, sans-serif', fontSize: 13, lineHeight: 1.5, margin: 0, fontStyle: msg.isDeleted ? 'italic' : 'normal' }}>
                      {msg.body}
                    </p>
                    {msg.imageUrl && !msg.isDeleted && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={msg.imageUrl} alt="Shared" style={{ maxWidth: 300, borderRadius: 8, marginTop: 8, display: 'block' }} />
                    )}
                  </div>
                  {!msg.isDeleted && (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => isPinned ? handleUnpin() : handlePin(msg.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, opacity: isPinned ? 1 : 0.4, flexShrink: 0 }}
                        title={isPinned ? 'Unpin message' : 'Pin message'}
                      >
                        <Pin size={14} color="#9b7e56" />
                      </button>
                      <button
                        onClick={() => handleDelete(msg.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, opacity: 0.4, flexShrink: 0 }}
                        title="Delete message"
                      >
                        <Trash2 size={14} color="#C0392B" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Send as WGY */}
      <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', background: '#1a1a1a', display: 'flex', gap: 12, alignItems: 'flex-end', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#9b7e56', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#222', fontWeight: 700, fontSize: 9, fontFamily: 'Montserrat, sans-serif' }}>WG</span>
          </div>
          <span style={{ color: '#9b7e56', fontFamily: 'Montserrat, sans-serif', fontSize: 11, fontWeight: 600 }}>Sending as WGY</span>
        </div>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Send a message to this room..."
          rows={2}
          style={{ flex: 1, background: '#2a2a2a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 14px', color: 'white', fontFamily: 'Montserrat, sans-serif', fontSize: 13, resize: 'none', outline: 'none' }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          style={{ width: 44, height: 44, borderRadius: '50%', background: input.trim() ? '#e4dcd1' : '#333', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: input.trim() ? 'pointer' : 'not-allowed', flexShrink: 0, transition: 'background 0.2s' }}
        >
          <Send size={18} color={input.trim() ? '#222' : '#706b6b'} />
        </button>
      </div>
    </div>
  )
}
