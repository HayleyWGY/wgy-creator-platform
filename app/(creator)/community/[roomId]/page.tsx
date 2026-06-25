'use client'
import { useEffect, useRef, useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Send, Trash2 } from 'lucide-react'
import { useChatPoll } from '@/lib/use-chat-poll'
import { COMMUNITY_ROOMS } from '@/lib/constants'
import { ChatBubble } from '@/components/ui/chat-bubble'

interface MessageAuthor {
  id: string
  firstName: string
  lastName: string
  profileImageUrl: string | null
  isAdmin: boolean
}

interface ChatMessage {
  id: string
  body: string
  imageUrl: string | null
  createdAt: string
  author: MessageAuthor
}

function Avatar({ author }: { author: MessageAuthor }) {
  if (author.profileImageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={author.profileImageUrl}
        alt=""
        style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    )
  }
  const initials = `${author.firstName[0]}${author.lastName[0]}`
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%', background: author.isAdmin ? 'var(--beige)' : 'var(--surface-2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: author.isAdmin ? '#111111' : 'var(--text)', fontFamily: 'Montserrat, sans-serif' }}>
        {initials}
      </span>
    </div>
  )
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
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

export default function ChatRoomPage({ params }: { params: { roomId: string } }) {
  const router = useRouter()
  const { data: session } = useSession()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [pinnedMessage, setPinnedMessage] = useState<{ id: string; body: string; author: { firstName: string; lastName: string; isAdmin: boolean } } | null>(null)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const slug = params.roomId

  const room = COMMUNITY_ROOMS.find(r => r.id === slug)
  const roomName = room?.name ?? slug.replace(/-/g, ' ')
  const roomEmoji = room?.emoji ?? '💬'

  useChatPoll<{ messages: ChatMessage[]; pinnedMessage: typeof pinnedMessage }>(
    `/api/chat/rooms/${slug}/messages`,
    (data) => {
      setMessages(prev => {
        if (prev.length === data.messages.length) return prev
        return data.messages
      })
      setPinnedMessage(data.pinnedMessage || null)
    },
    3000,
    true,
  )

  // Scroll to bottom when messages load/update
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
      const res = await fetch(`/api/chat/rooms/${slug}/messages`, {
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

  async function deleteMessage(id: string) {
    await fetch(`/api/chat/rooms/${slug}/messages/${id}`, { method: 'DELETE' })
    setMessages(prev => prev.filter(m => m.id !== id))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(e as unknown as FormEvent)
    }
  }

  // Group messages by date
  const grouped: { date: string; messages: ChatMessage[] }[] = []
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
        <span style={{ fontSize: 18 }}>{roomEmoji}</span>
        <span style={{ color: 'var(--text)', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 14 }}>
          {roomName}
        </span>
      </div>

      {/* Pinned message banner — WGY emphasis (gold accent, per brand) */}
      {pinnedMessage && (
        <div style={{
          margin: '0 16px 12px',
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
          <div>
            <p style={{ margin: '0 0 3px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.10em', color: '#9b7e56' }}>
              PINNED MESSAGE
            </p>
            <p style={{ margin: 0, fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {pinnedMessage.body}
            </p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 0' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 48 }}>
            <p style={{ color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif', fontSize: 14 }}>
              No messages yet — say hi!
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
              const isOwn = msg.author.id === session?.user?.id
              const authorLabel = `${msg.author.firstName} ${msg.author.lastName}${msg.author.isAdmin ? ' · WGY' : ''}`
              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    marginBottom: 12,
                    flexDirection: isOwn ? 'row-reverse' : 'row',
                  }}
                >
                  {!isOwn && <Avatar author={msg.author} />}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                    <ChatBubble
                      variant={isOwn ? 'sent' : 'received'}
                      author={isOwn ? undefined : authorLabel}
                      isWgy={msg.author.isAdmin}
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
                      </span>
                      {(isOwn || session?.user?.isAdmin) && (
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
        <textarea
          ref={inputRef}
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a message..."
          rows={1}
          style={{
            flex: 1, background: 'var(--surface-2)', border: 'none', borderRadius: 20,
            padding: '10px 16px', color: 'var(--text)', fontSize: 14, resize: 'none',
            fontFamily: 'Montserrat, sans-serif', outline: 'none', maxHeight: 120,
            lineHeight: 1.5,
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
