'use client'
import { useEffect, useRef, useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Send, Trash2 } from 'lucide-react'
import { useChatPoll } from '@/lib/use-chat-poll'
import { COMMUNITY_ROOMS } from '@/lib/constants'

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
      width: 32, height: 32, borderRadius: '50%', background: author.isAdmin ? '#e4dcd1' : '#3a3a3a',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: author.isAdmin ? '#222' : '#fff', fontFamily: 'Montserrat, sans-serif' }}>
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
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#222222' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', background: '#1a1a1a',
        borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
      }}>
        <button
          onClick={() => router.back()}
          style={{
            width: 32, height: 32, borderRadius: '50%', background: '#2a2a2a',
            border: 'none', color: '#e4dcd1', display: 'flex',
            alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <ArrowLeft size={16} />
        </button>
        <span style={{ fontSize: 18 }}>{roomEmoji}</span>
        <span style={{ color: 'white', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 14 }}>
          {roomName}
        </span>
      </div>

      {/* Pinned message banner */}
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
            <p style={{ margin: 0, fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: '#c8c3bc', lineHeight: 1.5 }}>
              {pinnedMessage.body}
            </p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 0' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 48 }}>
            <p style={{ color: '#706b6b', fontFamily: 'Montserrat, sans-serif', fontSize: 14 }}>
              No messages yet — say hi!
            </p>
          </div>
        )}
        {grouped.map(group => (
          <div key={group.date}>
            <div style={{ textAlign: 'center', margin: '12px 0 8px' }}>
              <span style={{
                fontSize: 10, fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
                color: '#706b6b', textTransform: 'uppercase', letterSpacing: '0.1em',
              }}>
                {group.date}
              </span>
            </div>
            {group.messages.map(msg => {
              const isOwn = msg.author.id === session?.user?.id
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
                  <div style={{ maxWidth: '75%' }}>
                    {!isOwn && (
                      <p style={{
                        margin: '0 0 3px 2px', fontSize: 10,
                        fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
                        color: msg.author.isAdmin ? '#e4dcd1' : '#706b6b',
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                      }}>
                        {msg.author.firstName} {msg.author.lastName}
                        {msg.author.isAdmin && ' · WGY'}
                      </p>
                    )}
                    <div style={{
                      background: isOwn ? '#e4dcd1' : '#2a2a2a',
                      borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      padding: '10px 14px',
                    }}>
                      {msg.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={msg.imageUrl}
                          alt=""
                          style={{ width: '100%', borderRadius: 8, marginBottom: msg.body ? 8 : 0, display: 'block' }}
                        />
                      )}
                      {msg.body && (
                        <p style={{
                          margin: 0, fontSize: 14, lineHeight: 1.5,
                          fontFamily: 'Montserrat, sans-serif',
                          color: isOwn ? '#222' : '#fff',
                          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        }}>
                          {msg.body}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
                      <span style={{ fontSize: 10, color: '#706b6b', fontFamily: 'Montserrat, sans-serif' }}>
                        {formatTime(msg.createdAt)}
                      </span>
                      {(isOwn || session?.user?.isAdmin) && (
                        <button
                          onClick={() => deleteMessage(msg.id)}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#706b6b', display: 'flex' }}
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
          padding: '12px 16px', background: '#1a1a1a',
          borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
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
            flex: 1, background: '#2a2a2a', border: 'none', borderRadius: 20,
            padding: '10px 16px', color: 'white', fontSize: 14, resize: 'none',
            fontFamily: 'Montserrat, sans-serif', outline: 'none', maxHeight: 120,
            lineHeight: 1.5,
          }}
        />
        <button
          type="submit"
          disabled={!body.trim() || sending}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: body.trim() ? '#e4dcd1' : '#2a2a2a',
            border: 'none', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: body.trim() ? 'pointer' : 'default',
            flexShrink: 0, transition: 'background 0.15s',
          }}
        >
          <Send size={16} color={body.trim() ? '#222' : '#706b6b'} />
        </button>
      </form>
    </div>
  )
}
