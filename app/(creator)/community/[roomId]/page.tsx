'use client'
import { useCallback, useEffect, useRef, useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Send, Trash2, CornerUpLeft, X } from 'lucide-react'
import { useChatPoll, CHAT_POLL_INTERVAL_MS } from '@/lib/use-chat-poll'
import { useRealtimePing } from '@/lib/use-realtime-ping'
import { messagesChanged } from '@/lib/chat-pagination'
import { COMMUNITY_ROOMS } from '@/lib/constants'
import { ChatBubble } from '@/components/ui/chat-bubble'

interface MessageAuthor {
  id: string
  firstName: string
  lastName: string
  profileImageUrl: string | null
  isAdmin: boolean
}

interface MentionMember {
  id: string
  firstName: string
  lastName: string
  profileImageUrl?: string | null
}

interface ChatMessage {
  id: string
  body: string
  imageUrl: string | null
  createdAt: string
  author: MessageAuthor
  replyTo?: {
    id: string
    body: string
    isDeleted: boolean
    author: { firstName: string; lastName: string }
  } | null
  mentions?: { creator: { id: string; firstName: string; lastName: string } }[]
}

// Renders a message body with @mentions highlighted. Mentions are structured
// data from the server, so we highlight the exact "@First Last" the sender
// picked — no fragile guessing about which @words are real people.
function renderBody(msg: ChatMessage): React.ReactNode {
  const names = (msg.mentions ?? []).map(m => `${m.creator.firstName} ${m.creator.lastName}`)
  if (!names.length) return msg.body
  // Longest names first so "@Jo Ann Smith" wins over "@Jo".
  const escaped = names
    .sort((a, b) => b.length - a.length)
    .map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const re = new RegExp(`@(${escaped.join('|')})`, 'g')
  const parts = msg.body.split(re)
  // split with one capture group => [text, name, text, name, ...]
  return parts.map((part, i) =>
    i % 2 === 1
      ? <strong key={i} style={{ color: 'var(--accent)', fontWeight: 700 }}>@{part}</strong>
      : <span key={i}>{part}</span>,
  )
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s
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
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null)
  // @mention autocomplete: mentionQuery === null means the picker is closed.
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionResults, setMentionResults] = useState<MentionMember[]>([])
  // "First Last" -> creatorId for people picked in this composer. Sent on
  // submit only if their @name is still present in the text.
  const pickedMentions = useRef<Map<string, string>>(new Map())
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const slug = params.roomId

  const room = COMMUNITY_ROOMS.find(r => r.id === slug)
  const roomName = room?.name ?? slug.replace(/-/g, ' ')
  const roomEmoji = room?.emoji ?? '💬'

  const refetch = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat/rooms/${slug}/messages`, { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setMessages(prev => (messagesChanged(prev, data.messages) ? data.messages : prev))
      setPinnedMessage(data.pinnedMessage || null)
    } catch {}
  }, [slug])

  // Realtime is the primary delivery path; the poll is a slow safety net
  // for when the websocket is blocked or drops.
  useRealtimePing(`room:${slug}`, refetch)
  useChatPoll<{ messages: ChatMessage[]; pinnedMessage: typeof pinnedMessage }>(
    `/api/chat/rooms/${slug}/messages`,
    (data) => {
      setMessages(prev => (messagesChanged(prev, data.messages) ? data.messages : prev))
      setPinnedMessage(data.pinnedMessage || null)
    },
    CHAT_POLL_INTERVAL_MS,
    true,
  )

  // Scroll to bottom when messages load/update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Mark the room read whenever new messages are on screen — keeps the
  // unread badge on the community hub accurate.
  //
  // Keyed on the newest message id, NOT messages.length: the list is now a
  // fixed-size page, so once a room passes the page size the length never
  // changes and this effect would stop firing — leaving the unread badge
  // stuck on. Same root cause as the render bug this ticket fixes.
  const newestMessageId = messages.length ? messages[messages.length - 1].id : null
  useEffect(() => {
    if (!newestMessageId) return
    fetch(`/api/chat/rooms/${slug}/read`, { method: 'POST' }).catch(() => {})
  }, [slug, newestMessageId])

  // Detect an in-progress "@token" ending at the caret and open/close the picker.
  function onBodyChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setBody(val)
    const caret = e.target.selectionStart ?? val.length
    const before = val.slice(0, caret)
    const m = before.match(/(?:^|\s)@(\S{0,30})$/)
    setMentionQuery(m ? m[1] : null)
  }

  // Fetch matching members while the picker is open.
  useEffect(() => {
    if (mentionQuery === null) { setMentionResults([]); return }
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/chat/members?q=${encodeURIComponent(mentionQuery)}`)
        const data = await res.json()
        if (!cancelled) setMentionResults(data.members ?? [])
      } catch { if (!cancelled) setMentionResults([]) }
    }, 150)
    return () => { cancelled = true; clearTimeout(t) }
  }, [mentionQuery])

  function insertMention(member: MentionMember) {
    const name = `${member.firstName} ${member.lastName}`
    // Replace the trailing "@token" with the full "@First Last ".
    setBody(prev => prev.replace(/(^|\s)@(\S{0,30})$/, (_full, lead) => `${lead}@${name} `))
    pickedMentions.current.set(name, member.id)
    setMentionQuery(null)
    setMentionResults([])
    inputRef.current?.focus()
  }

  function scrollToMessage(id: string) {
    const el = document.getElementById(`msg-${id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.style.transition = 'background 0.2s'
      el.style.background = 'rgba(228,220,209,0.08)'
      setTimeout(() => { el.style.background = '' }, 900)
    }
  }

  async function sendMessage(e: FormEvent) {
    e.preventDefault()
    if (!body.trim() || sending) return
    setSending(true)
    const text = body.trim()
    // Only send mentions whose @name is still in the text (user may have deleted it).
    const mentions = Array.from(pickedMentions.current.entries())
      .filter(([name]) => text.includes(`@${name}`))
      .map(([, id]) => id)
    const replyToId = replyingTo?.id ?? null
    setBody('')
    setReplyingTo(null)
    setMentionQuery(null)

    try {
      const res = await fetch(`/api/chat/rooms/${slug}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text, replyToId, mentions }),
      })
      if (res.ok) {
        const { message } = await res.json()
        setMessages(prev => [...prev, message])
        pickedMentions.current.clear()
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
    // Pinned to the same viewport anchors as the sticky app header (56px)
    // and the fixed bottom nav (80px + safe area), so the chat always fills
    // the space between them exactly — no page scroll stealing the pinned
    // banner off-screen, and no dead gap under the composer when the mobile
    // browser's address bar changes the viewport height.
    <div style={{
      position: 'fixed',
      top: 56,
      bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: 390,
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg)',
    }}>
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

      {/* Pinned message banner — WGY emphasis (gold accent, per brand).
          Sticky (56px = app header height) with an opaque backing so it
          stays visible when the page shifts on scroll. */}
      {pinnedMessage && (
        <div style={{ position: 'sticky', top: 56, zIndex: 30, background: 'var(--bg)', padding: '0 16px 12px', flexShrink: 0 }}>
          <div style={{
            background: 'rgba(155,126,86,0.15)',
            border: '1px solid rgba(155,126,86,0.3)',
            borderRadius: 10,
            padding: '10px 14px',
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
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
        </div>
      )}

      {/* Messages — overscroll contained so hitting the top of the chat
          doesn't drag the whole page (and the pinned banner) upwards */}
      <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: '16px 16px 0' }}>
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
                  id={`msg-${msg.id}`}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    marginBottom: 12,
                    borderRadius: 8,
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
                      {/* Quoted reply preview — tap to jump to the original */}
                      {msg.replyTo && (
                        <button
                          onClick={() => scrollToMessage(msg.replyTo!.id)}
                          style={{
                            display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                            background: 'rgba(0,0,0,0.12)', borderLeft: '2px solid var(--accent)',
                            border: 'none', borderRadius: 6, padding: '5px 8px', marginBottom: 6,
                          }}
                        >
                          <span style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--accent)', fontFamily: 'Montserrat, sans-serif' }}>
                            {msg.replyTo.isDeleted ? 'Message' : `${msg.replyTo.author.firstName} ${msg.replyTo.author.lastName}`}
                          </span>
                          <span style={{ display: 'block', fontSize: 12, opacity: 0.85 }}>
                            {msg.replyTo.isDeleted ? 'This message was deleted' : truncate(msg.replyTo.body, 70)}
                          </span>
                        </button>
                      )}
                      {msg.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={msg.imageUrl}
                          alt=""
                          style={{ width: '100%', borderRadius: 8, marginBottom: msg.body ? 8 : 0, display: 'block' }}
                        />
                      )}
                      {msg.body && (
                        <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{renderBody(msg)}</span>
                      )}
                    </ChatBubble>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif' }}>
                        {formatTime(msg.createdAt)}
                      </span>
                      <button
                        onClick={() => { setReplyingTo(msg); inputRef.current?.focus() }}
                        aria-label="Reply"
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
                      >
                        <CornerUpLeft size={11} />
                      </button>
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

      {/* @mention picker — floats above the input while typing "@name" */}
      {mentionQuery !== null && mentionResults.length > 0 && (
        <div style={{ flexShrink: 0, background: 'var(--surface)', borderTop: '1px solid var(--border)', maxHeight: 180, overflowY: 'auto' }}>
          {mentionResults.map(m => (
            <button
              key={m.id}
              onClick={() => insertMention(m)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer' }}
            >
              <Avatar author={{ id: m.id, firstName: m.firstName, lastName: m.lastName, profileImageUrl: m.profileImageUrl ?? null, isAdmin: false }} />
              <span style={{ fontSize: 14, color: 'var(--text)', fontFamily: 'Montserrat, sans-serif' }}>{m.firstName} {m.lastName}</span>
            </button>
          ))}
        </div>
      )}

      {/* Replying-to banner */}
      {replyingTo && (
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
          <div style={{ flex: 1, minWidth: 0, borderLeft: '2px solid var(--accent)', paddingLeft: 8 }}>
            <span style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--accent)', fontFamily: 'Montserrat, sans-serif' }}>
              Replying to {replyingTo.author.firstName} {replyingTo.author.lastName}
            </span>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {replyingTo.body ? truncate(replyingTo.body, 60) : '📷 Image'}
            </span>
          </div>
          <button onClick={() => setReplyingTo(null)} aria-label="Cancel reply" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>
      )}

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
          onChange={onBodyChange}
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
