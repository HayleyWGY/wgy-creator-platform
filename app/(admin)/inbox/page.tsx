'use client'
import { useEffect, useRef, useState, FormEvent } from 'react'
import { Search, Send, ImageIcon, Trash2 } from 'lucide-react'

interface Creator {
  id: string
  firstName: string
  lastName: string
  profileImageUrl: string | null
  email: string
}

interface DmMessageSender {
  id: string
  firstName: string
  lastName: string
  isAdmin: boolean
}

interface ThreadListItem {
  id: string
  updatedAt: string
  creator: Creator
  messages: Array<{ body: string; createdAt: string; sender: DmMessageSender }>
  _count: { messages: number }
}

interface DmMessageFull {
  id: string
  body: string
  imageUrl: string | null
  createdAt: string
  isRead: boolean
  sender: {
    id: string
    firstName: string
    lastName: string
    profileImageUrl: string | null
    isAdmin: boolean
  }
}

function Avatar({ name, imageUrl, isWgy }: { name: string; imageUrl?: string | null; isWgy?: boolean }) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageUrl} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    )
  }
  const initials = isWgy ? 'WG' : name.slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%',
      background: isWgy ? '#9b7e56' : 'var(--accent)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--bg)', fontFamily: 'Montserrat, sans-serif' }}>
        {initials}
      </span>
    </div>
  )
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return d.toLocaleDateString('en-GB', { weekday: 'short' })
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
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

export default function AdminInboxPage() {
  const [threads, setThreads] = useState<ThreadListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeThread, setActiveThread] = useState<ThreadListItem | null>(null)
  const [messages, setMessages] = useState<DmMessageFull[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Load thread list on mount
  useEffect(() => {
    fetch('/api/chat/dm/admin')
      .then(r => r.json())
      .then(data => { setThreads(data.threads || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Poll thread list every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetch('/api/chat/dm/admin')
        .then(r => r.json())
        .then(data => setThreads(data.threads || []))
        .catch(() => {})
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Poll active thread messages every 3 seconds
  useEffect(() => {
    if (!activeThread) return
    const interval = setInterval(async () => {
      const res = await fetch(`/api/chat/dm/${activeThread.id}`)
      const data = await res.json()
      setMessages(data.thread?.messages || [])
    }, 3000)
    return () => clearInterval(interval)
  }, [activeThread])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadThread(thread: ThreadListItem) {
    setActiveThread(thread)
    setMessages([])
    const res = await fetch(`/api/chat/dm/${thread.id}`)
    const data = await res.json()
    setMessages(data.thread?.messages || [])
  }

  async function handleSend(e?: FormEvent) {
    e?.preventDefault()
    if (!input.trim() || sending || !activeThread) return
    setSending(true)
    const text = input.trim()
    setInput('')

    const res = await fetch('/api/chat/dm/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: text, creatorId: activeThread.creator.id }),
    })

    if (res.ok) {
      const data = await res.json()
      setMessages(prev => [...prev, data.message])
      setThreads(prev => prev.map(t =>
        t.id === activeThread.id ? { ...t, messages: [data.message] } : t
      ))
    }
    setSending(false)
    inputRef.current?.focus()
  }

  async function uploadImage(file: File) {
    if (!activeThread) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('bucket', 'creator-posts')
      const res = await fetch('/api/upload-supabase', { method: 'POST', body: form })
      if (!res.ok) return
      const { url } = await res.json()

      const msgRes = await fetch('/api/chat/dm/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: '', imageUrl: url, creatorId: activeThread.creator.id }),
      })
      if (msgRes.ok) {
        const data = await msgRes.json()
        setMessages(prev => [...prev, data.message])
      }
    } finally {
      setUploading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  async function deleteMessage(messageId: string) {
    if (!activeThread) return
    await fetch(`/api/chat/dm/${activeThread.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId }),
    })
    setMessages(prev => prev.filter(m => m.id !== messageId))
  }

  const filtered = threads.filter(t =>
    `${t.creator.firstName} ${t.creator.lastName} ${t.creator.email}`.toLowerCase().includes(search.toLowerCase())
  )

  // Group messages by date
  const grouped: { date: string; messages: DmMessageFull[] }[] = []
  for (const msg of messages) {
    const d = formatDate(msg.createdAt)
    if (!grouped.length || grouped[grouped.length - 1].date !== d) {
      grouped.push({ date: d, messages: [msg] })
    } else {
      grouped[grouped.length - 1].messages.push(msg)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>

      {/* ── Left panel ── */}
      <div style={{ width: 300, borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Header */}
        <div style={{ padding: '20px 16px 12px' }}>
          <p style={{ color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 4px' }}>
            INBOX
          </p>
          <p style={{ color: 'white', fontFamily: 'Playfair Display, serif', fontStyle: 'italic', fontSize: 22, margin: 0 }}>
            Creator Messages
          </p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', margin: '0 12px 8px' }}>
          <Search size={13} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search creators..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', background: 'var(--surface)', border: 'none', borderRadius: 8, padding: '8px 12px 8px 30px', color: 'white', fontSize: 12, fontFamily: 'Montserrat, sans-serif', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Thread list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && (
            <p style={{ color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif', fontSize: 12, padding: '16px', textAlign: 'center' }}>
              Loading...
            </p>
          )}
          {!loading && filtered.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif', fontSize: 12, padding: '16px', textAlign: 'center' }}>
              No conversations yet
            </p>
          )}
          {filtered.map(t => {
            const last = t.messages[0]
            const isActive = t.id === activeThread?.id
            return (
              <button
                key={t.id}
                onClick={() => loadThread(t)}
                style={{
                  width: '100%', display: 'flex', gap: 10, padding: '12px 16px', textAlign: 'left',
                  background: isActive ? 'var(--surface)' : 'transparent',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  border: 'none', cursor: 'pointer',
                  borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                  boxSizing: 'border-box',
                }}
              >
                <Avatar
                  name={`${t.creator.firstName[0]}${t.creator.lastName[0]}`}
                  imageUrl={t.creator.profileImageUrl}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'white', fontFamily: 'Montserrat, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.creator.firstName} {t.creator.lastName}
                    </p>
                    {last && (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif', flexShrink: 0, marginLeft: 4 }}>
                        {formatTime(last.createdAt)}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {last ? `${last.sender.isAdmin ? 'You' : last.sender.firstName}: ${last.body || '[image]'}` : t.creator.email}
                  </p>
                </div>
                {t._count.messages > 0 && (
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, alignSelf: 'center' }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--bg)', fontFamily: 'Montserrat, sans-serif' }}>
                      {t._count.messages > 9 ? '9+' : t._count.messages}
                    </span>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {!activeThread ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif', fontSize: 14 }}>
              Select a conversation
            </p>
          </div>
        ) : (
          <>
            {/* Conversation header */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar
                name={`${activeThread.creator.firstName[0]}${activeThread.creator.lastName[0]}`}
                imageUrl={activeThread.creator.profileImageUrl}
              />
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'white', fontFamily: 'Montserrat, sans-serif' }}>
                  {activeThread.creator.firstName} {activeThread.creator.lastName}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif' }}>
                  {activeThread.creator.email}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 0' }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', paddingTop: 48 }}>
                  <p style={{ color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif', fontSize: 14 }}>
                    No messages yet
                  </p>
                </div>
              )}
              {grouped.map(group => (
                <div key={group.date}>
                  <div style={{ textAlign: 'center', margin: '12px 0 8px' }}>
                    <span style={{ fontSize: 10, fontFamily: 'Montserrat, sans-serif', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      {group.date}
                    </span>
                  </div>
                  {group.messages.map(msg => {
                    const isOwn = msg.sender.isAdmin
                    return (
                      <div key={msg.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12, flexDirection: isOwn ? 'row-reverse' : 'row' }}>
                        {!isOwn && (
                          <Avatar
                            name={`${msg.sender.firstName[0]}${msg.sender.lastName[0]}`}
                            imageUrl={msg.sender.profileImageUrl}
                          />
                        )}
                        {isOwn && <Avatar name="WG" isWgy />}
                        <div style={{ maxWidth: '65%' }}>
                          <p style={{ margin: '0 0 3px', fontSize: 10, fontFamily: 'Montserrat, sans-serif', fontWeight: 700, color: isOwn ? '#9b7e56' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: isOwn ? 'right' : 'left' }}>
                            {isOwn ? 'WGY' : msg.sender.firstName}
                          </p>
                          <div style={{ background: isOwn ? 'var(--accent)' : 'var(--surface)', borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px', padding: '10px 14px' }}>
                            {msg.imageUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={msg.imageUrl} alt="" style={{ width: '100%', borderRadius: 8, marginBottom: msg.body ? 8 : 0, display: 'block' }} />
                            )}
                            {msg.body && (
                              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, fontFamily: 'Montserrat, sans-serif', color: isOwn ? 'var(--bg)' : 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {msg.body}
                              </p>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif' }}>
                              {formatTime(msg.createdAt)}{isOwn && msg.isRead && ' · Read'}
                            </span>
                            <button
                              onClick={() => deleteMessage(msg.id)}
                              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
                            >
                              <Trash2 size={10} />
                            </button>
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
              onSubmit={handleSend}
              style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}
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
                style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
              >
                <ImageIcon size={14} color={uploading ? 'var(--accent)' : 'var(--text-muted)'} />
              </button>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${activeThread.creator.firstName}...`}
                rows={1}
                style={{ flex: 1, background: 'var(--surface)', border: 'none', borderRadius: 20, padding: '10px 16px', color: 'white', fontSize: 14, resize: 'none', fontFamily: 'Montserrat, sans-serif', outline: 'none', maxHeight: 120, lineHeight: 1.5 }}
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                style={{ width: 36, height: 36, borderRadius: '50%', background: input.trim() ? 'var(--accent)' : 'var(--surface)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: input.trim() ? 'pointer' : 'default', flexShrink: 0, transition: 'background 0.15s' }}
              >
                <Send size={14} color={input.trim() ? 'var(--bg)' : 'var(--text-muted)'} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
