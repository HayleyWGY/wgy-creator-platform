'use client'
import { useCallback, useEffect, useRef, useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Send, ImageIcon, Trash2 } from 'lucide-react'
import { useChatPoll } from '@/lib/use-chat-poll'
import { useRealtimePing } from '@/lib/use-realtime-ping'
import { messagesChanged } from '@/lib/chat-pagination'
import { ChatBubble } from '@/components/ui/chat-bubble'

interface MessageSender {
  id: string
  firstName: string
  lastName: string
  profileImageUrl: string | null
  isAdmin: boolean
}

interface DmMessage {
  id: string
  body: string
  imageUrl: string | null
  createdAt: string
  isRead: boolean
  sender: MessageSender
}

interface DmThread {
  id: string
  messages: DmMessage[]
}

function Avatar({ sender }: { sender: MessageSender }) {
  if (sender.profileImageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={sender.profileImageUrl}
        alt=""
        style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    )
  }
  const initials = `${sender.firstName[0]}${sender.lastName[0]}`
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      background: sender.isAdmin ? 'var(--beige)' : 'var(--surface-2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: sender.isAdmin ? '#111111' : 'var(--text)', fontFamily: 'Montserrat, sans-serif' }}>
        {initials}
      </span>
    </div>
  )
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function DMPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [thread, setThread] = useState<DmThread | null>(null)
  const [messages, setMessages] = useState<DmMessage[]>([])
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Initial load
  useEffect(() => {
    fetch('/api/chat/dm')
      .then(r => r.json())
      .then(d => {
        setThread(d.thread)
        setMessages(d.thread?.messages || [])
      })
  }, [])

  const refetch = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/dm', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      if (!data.thread) return
      setThread(data.thread)
      setMessages(prev => (messagesChanged(prev, data.thread.messages) ? data.thread.messages : prev))
    } catch {}
  }, [])

  // Realtime ping on this thread is the primary delivery path; the poll
  // below is a slow safety net for blocked/dropped websockets.
  useRealtimePing(thread ? `dm:${thread.id}` : null, refetch)
  useChatPoll<{ thread: DmThread }>(
    '/api/chat/dm',
    (data) => {
      if (!data.thread) return
      setThread(data.thread)
      setMessages(prev => (messagesChanged(prev, data.thread.messages) ? data.thread.messages : prev))
    },
    30000,
    true,
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(e: FormEvent) {
    e.preventDefault()
    if (!body.trim() || sending) return
    setSending(true)
    const text = body.trim()
    setBody('')

    try {
      const res = await fetch('/api/chat/dm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      })
      if (res.ok) {
        const { message } = await res.json()
        setMessages(prev => [...prev, message])
      }
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  async function uploadImage(file: File) {
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/upload-image', { method: 'POST', body: form })
      if (!res.ok) return
      const { url } = await res.json()

      const msgRes = await fetch('/api/chat/dm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: '', imageUrl: url }),
      })
      if (msgRes.ok) {
        const { message } = await msgRes.json()
        setMessages(prev => [...prev, message])
      }
    } finally {
      setUploading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(e as unknown as FormEvent)
    }
  }

  async function deleteMessage(id: string) {
    if (!thread) return
    await fetch(`/api/chat/dm/${thread.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: id }),
    })
    setMessages(prev => prev.filter(m => m.id !== id))
  }

  // Group by date
  const grouped: { date: string; messages: DmMessage[] }[] = []
  for (const msg of messages) {
    const d = formatDate(msg.createdAt)
    if (!grouped.length || grouped[grouped.length - 1].date !== d) {
      grouped.push({ date: d, messages: [msg] })
    } else {
      grouped[grouped.length - 1].messages.push(msg)
    }
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', background: 'var(--surface)',
        borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <button
          onClick={() => router.back()}
          aria-label="Back"
          style={{
            width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-2)',
            border: 'none', color: 'var(--accent)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <ArrowLeft size={16} />
        </button>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--beige)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#111111', fontFamily: 'Montserrat, sans-serif' }}>WG</span>
        </div>
        <div>
          <p style={{ color: 'var(--text)', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 14, margin: 0 }}>
            WGY LTD
          </p>
          <p style={{ color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif', fontSize: 11, margin: 0 }}>
            We Got You Agency
          </p>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 0' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 48 }}>
            <p style={{ color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif', fontSize: 14 }}>
              No messages yet. Say hi to the WGY team!
            </p>
          </div>
        )}
        {grouped.map(group => (
          <div key={group.date}>
            <div style={{ textAlign: 'center', margin: '12px 0 8px' }}>
              <span style={{
                fontSize: 10, fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
                color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em',
              }}>
                {group.date}
              </span>
            </div>
            {group.messages.map(msg => {
              const isOwn = msg.sender.id === session?.user?.id
              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    marginBottom: 12, flexDirection: isOwn ? 'row-reverse' : 'row',
                  }}
                >
                  {!isOwn && <Avatar sender={msg.sender} />}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                    <ChatBubble
                      variant={isOwn ? 'sent' : 'received'}
                      author={isOwn ? undefined : 'WGY'}
                      isWgy={!isOwn}
                    >
                      {msg.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={msg.imageUrl}
                          alt=""
                          style={{ width: '100%', borderRadius: 8, marginBottom: msg.body ? 8 : 0, display: 'block' }}
                        />
                      )}
                      {msg.body && (
                        <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.body}</span>
                      )}
                    </ChatBubble>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif' }}>
                        {formatTime(msg.createdAt)}
                        {isOwn && msg.isRead && ' · Read'}
                      </span>
                      {isOwn && (
                        <button
                          onClick={() => deleteMessage(msg.id)}
                          aria-label="Delete message"
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
                        >
                          <Trash2 size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={sendMessage}
        style={{
          display: 'flex', alignItems: 'flex-end', gap: 8,
          padding: '12px 16px', background: 'var(--surface)',
          borderTop: '1px solid var(--border)', flexShrink: 0,
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) uploadImage(file)
            e.target.value = ''
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          aria-label="Attach image"
          style={{
            width: 40, height: 40, borderRadius: '50%', background: 'var(--surface-2)',
            border: 'none', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
          }}
        >
          <ImageIcon size={16} style={{ color: uploading ? 'var(--accent)' : 'var(--text-muted)' }} />
        </button>
        <textarea
          ref={inputRef}
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message WGY..."
          rows={1}
          style={{
            flex: 1, background: 'var(--surface-2)', border: 'none', borderRadius: 20,
            padding: '10px 16px', color: 'var(--text)', fontSize: 14, resize: 'none',
            fontFamily: 'Montserrat, sans-serif', outline: 'none', maxHeight: 120, lineHeight: 1.5,
          }}
        />
        <button
          type="submit"
          disabled={!body.trim() || sending}
          aria-label="Send"
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: body.trim() ? 'var(--pill-bg)' : 'var(--surface-2)',
            border: 'none', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: body.trim() ? 'pointer' : 'default',
            flexShrink: 0, transition: 'background 0.15s',
          }}
        >
          <Send size={16} style={{ color: body.trim() ? 'var(--pill-text)' : 'var(--text-muted)' }} />
        </button>
      </form>
      <style>{`textarea::placeholder { color: var(--text-muted); }`}</style>
    </div>
  )
}
