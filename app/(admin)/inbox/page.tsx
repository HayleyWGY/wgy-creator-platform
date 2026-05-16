'use client'
import { useEffect, useState, useRef, FormEvent } from 'react'
import { useSession } from 'next-auth/react'
import { Send, ImageIcon, Trash2, Search } from 'lucide-react'
import { useChatPoll } from '@/lib/use-chat-poll'

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

interface ThreadDetail {
  id: string
  creator: Creator
  messages: DmMessageFull[]
}

function Avatar({ name, imageUrl, isAdmin }: { name: string; imageUrl: string | null; isAdmin?: boolean }) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageUrl} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    )
  }
  const initials = name.slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%',
      background: isAdmin ? '#e4dcd1' : '#3a3a3a',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: isAdmin ? '#222' : '#fff', fontFamily: 'Montserrat, sans-serif' }}>
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
  useSession()
  const [threads, setThreads] = useState<ThreadListItem[]>([])
  const [search, setSearch] = useState('')
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [activeThread, setActiveThread] = useState<ThreadDetail | null>(null)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Load thread list
  useChatPoll<{ threads: ThreadListItem[] }>(
    '/api/chat/dm/admin',
    (data) => setThreads(data.threads || []),
    3000,
    true,
  )

  // Load active thread
  useChatPoll<{ thread: ThreadDetail }>(
    activeThreadId ? `/api/chat/dm/${activeThreadId}` : '',
    (data) => {
      if (!data.thread) return
      setActiveThread(data.thread)
    },
    3000,
    !!activeThreadId,
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeThread?.messages])

  async function openThread(threadId: string) {
    setActiveThreadId(threadId)
    const res = await fetch(`/api/chat/dm/${threadId}`)
    if (res.ok) {
      const data = await res.json()
      setActiveThread(data.thread)
    }
  }

  async function sendMessage(e: FormEvent) {
    e.preventDefault()
    if (!body.trim() || sending || !activeThread) return
    setSending(true)
    const text = body.trim()
    setBody('')

    try {
      const res = await fetch('/api/chat/dm/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId: activeThread.creator.id, body: text }),
      })
      if (res.ok) {
        const { message } = await res.json()
        setActiveThread(prev => prev ? { ...prev, messages: [...prev.messages, message] } : prev)
      }
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  async function uploadImage(file: File) {
    if (!activeThread) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/upload-image', { method: 'POST', body: form })
      if (!res.ok) return
      const { url } = await res.json()

      const msgRes = await fetch('/api/chat/dm/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId: activeThread.creator.id, body: '', imageUrl: url }),
      })
      if (msgRes.ok) {
        const { message } = await msgRes.json()
        setActiveThread(prev => prev ? { ...prev, messages: [...prev.messages, message] } : prev)
      }
    } finally {
      setUploading(false)
    }
  }

  async function deleteMessage(messageId: string) {
    if (!activeThreadId) return
    await fetch(`/api/chat/dm/${activeThreadId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId }),
    })
    setActiveThread(prev => prev ? { ...prev, messages: prev.messages.filter(m => m.id !== messageId) } : prev)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(e as unknown as FormEvent)
    }
  }

  const filtered = threads.filter(t =>
    `${t.creator.firstName} ${t.creator.lastName} ${t.creator.email}`.toLowerCase().includes(search.toLowerCase())
  )

  // Group messages by date
  const grouped: { date: string; messages: DmMessageFull[] }[] = []
  for (const msg of activeThread?.messages ?? []) {
    const d = formatDate(msg.createdAt)
    if (!grouped.length || grouped[grouped.length - 1].date !== d) {
      grouped.push({ date: d, messages: [msg] })
    } else {
      grouped[grouped.length - 1].messages.push(msg)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#222222' }}>
      {/* Left panel — thread list */}
      <div style={{ width: 300, borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Header */}
        <div style={{ padding: '20px 16px 12px' }}>
          <p style={{ color: '#706b6b', fontFamily: 'Montserrat, sans-serif', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 4px' }}>
            INBOX
          </p>
          <p style={{ color: 'white', fontFamily: 'Playfair Display, serif', fontStyle: 'italic', fontSize: 22, margin: 0 }}>
            Creator Messages
          </p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', margin: '0 12px 8px' }}>
          <Search size={13} color="#706b6b" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search creators..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', background: '#2a2a2a', border: 'none', borderRadius: 8,
              padding: '8px 12px 8px 30px', color: 'white', fontSize: 12,
              fontFamily: 'Montserrat, sans-serif', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Thread list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 && (
            <p style={{ color: '#706b6b', fontFamily: 'Montserrat, sans-serif', fontSize: 12, padding: '16px', textAlign: 'center' }}>
              No conversations yet
            </p>
          )}
          {filtered.map(t => {
            const last = t.messages[0]
            const isActive = t.id === activeThreadId
            return (
              <button
                key={t.id}
                onClick={() => openThread(t.id)}
                style={{
                  width: '100%', display: 'flex', gap: 10, padding: '12px 16px', textAlign: 'left',
                  background: isActive ? '#2a2a2a' : 'transparent',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  border: 'none', cursor: 'pointer',
                  borderLeft: isActive ? '2px solid #e4dcd1' : '2px solid transparent',
                }}
              >
                <Avatar
                  name={`${t.creator.firstName}${t.creator.lastName}`}
                  imageUrl={t.creator.profileImageUrl}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'white', fontFamily: 'Montserrat, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.creator.firstName} {t.creator.lastName}
                    </p>
                    {last && (
                      <span style={{ fontSize: 10, color: '#706b6b', fontFamily: 'Montserrat, sans-serif', flexShrink: 0, marginLeft: 4 }}>
                        {formatTime(last.createdAt)}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#706b6b', fontFamily: 'Montserrat, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {last ? `${last.sender.isAdmin ? 'You' : last.sender.firstName}: ${last.body || '[image]'}` : t.creator.email}
                  </p>
                </div>
                {t._count.messages > 0 && (
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#e4dcd1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, alignSelf: 'center' }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#222', fontFamily: 'Montserrat, sans-serif' }}>
                      {t._count.messages > 9 ? '9+' : t._count.messages}
                    </span>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Right panel — conversation */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {!activeThread ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: '#706b6b', fontFamily: 'Montserrat, sans-serif', fontSize: 14 }}>
              Select a conversation
            </p>
          </div>
        ) : (
          <>
            {/* Conversation header */}
            <div style={{
              padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <Avatar
                name={`${activeThread.creator.firstName}${activeThread.creator.lastName}`}
                imageUrl={activeThread.creator.profileImageUrl}
              />
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'white', fontFamily: 'Montserrat, sans-serif' }}>
                  {activeThread.creator.firstName} {activeThread.creator.lastName}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: '#706b6b', fontFamily: 'Montserrat, sans-serif' }}>
                  {activeThread.creator.email}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 0' }}>
              {activeThread.messages.length === 0 && (
                <div style={{ textAlign: 'center', paddingTop: 48 }}>
                  <p style={{ color: '#706b6b', fontFamily: 'Montserrat, sans-serif', fontSize: 14 }}>
                    No messages yet — start the conversation!
                  </p>
                </div>
              )}
              {grouped.map(group => (
                <div key={group.date}>
                  <div style={{ textAlign: 'center', margin: '12px 0 8px' }}>
                    <span style={{ fontSize: 10, fontFamily: 'Montserrat, sans-serif', fontWeight: 700, color: '#706b6b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      {group.date}
                    </span>
                  </div>
                  {group.messages.map(msg => {
                    const isOwn = msg.sender.isAdmin
                    return (
                      <div key={msg.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12, flexDirection: isOwn ? 'row-reverse' : 'row' }}>
                        {!isOwn && (
                          <Avatar
                            name={`${msg.sender.firstName}${msg.sender.lastName}`}
                            imageUrl={msg.sender.profileImageUrl}
                          />
                        )}
                        <div style={{ maxWidth: '65%' }}>
                          {!isOwn && (
                            <p style={{ margin: '0 0 3px 2px', fontSize: 10, fontFamily: 'Montserrat, sans-serif', fontWeight: 700, color: '#706b6b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                              {msg.sender.firstName}
                            </p>
                          )}
                          <div style={{ background: isOwn ? '#e4dcd1' : '#2a2a2a', borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px', padding: '10px 14px' }}>
                            {msg.imageUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={msg.imageUrl} alt="" style={{ width: '100%', borderRadius: 8, marginBottom: msg.body ? 8 : 0, display: 'block' }} />
                            )}
                            {msg.body && (
                              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, fontFamily: 'Montserrat, sans-serif', color: isOwn ? '#222' : '#fff', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {msg.body}
                              </p>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
                            <span style={{ fontSize: 10, color: '#706b6b', fontFamily: 'Montserrat, sans-serif' }}>
                              {formatTime(msg.createdAt)}
                              {isOwn && msg.isRead && ' · Read'}
                            </span>
                            <button
                              onClick={() => deleteMessage(msg.id)}
                              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#706b6b', display: 'flex' }}
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
              onSubmit={sendMessage}
              style={{
                display: 'flex', alignItems: 'flex-end', gap: 8,
                padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
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
                style={{ width: 36, height: 36, borderRadius: '50%', background: '#2a2a2a', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
              >
                <ImageIcon size={14} color={uploading ? '#e4dcd1' : '#706b6b'} />
              </button>
              <textarea
                ref={inputRef}
                value={body}
                onChange={e => setBody(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${activeThread.creator.firstName}...`}
                rows={1}
                style={{ flex: 1, background: '#2a2a2a', border: 'none', borderRadius: 20, padding: '10px 16px', color: 'white', fontSize: 14, resize: 'none', fontFamily: 'Montserrat, sans-serif', outline: 'none', maxHeight: 120, lineHeight: 1.5 }}
              />
              <button
                type="submit"
                disabled={!body.trim() || sending}
                style={{ width: 36, height: 36, borderRadius: '50%', background: body.trim() ? '#e4dcd1' : '#2a2a2a', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: body.trim() ? 'pointer' : 'default', flexShrink: 0, transition: 'background 0.15s' }}
              >
                <Send size={14} color={body.trim() ? '#222' : '#706b6b'} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
