'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { Send, Pin, MailPlus } from 'lucide-react'

interface DmThread {
  id: string
  creator: { id: string; firstName: string; lastName: string }
  messages: DmMessage[]
  isPinned?: boolean
  _count?: { messages: number }
}

interface DmMessage {
  id: string
  body: string
  imageUrl?: string | null
  createdAt: string
  sender?: { id: string; firstName?: string; lastName?: string; isAdmin?: boolean }
}

export default function AdminInboxPage() {
  const [threads, setThreads] = useState<DmThread[]>([])
  const [activeThread, setActiveThread] = useState<DmThread | null>(null)
  const [messages, setMessages] = useState<DmMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadThreads = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/dm/admin')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setThreads(data.threads || [])
    } catch (err) {
      console.error('Load threads error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMessages = useCallback(async () => {
    if (!activeThread?.id) return
    try {
      const res = await fetch(`/api/chat/dm/${activeThread.id}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setMessages(data.thread?.messages || [])
    } catch (err) {
      console.error('Load messages error:', err)
    }
  }, [activeThread?.id])

  // Load threads on mount and poll every 5s
  useEffect(() => {
    loadThreads()
    const interval = setInterval(loadThreads, 5000)
    return () => clearInterval(interval)
  }, [loadThreads])

  // Load messages when thread selected and poll every 3s
  useEffect(() => {
    if (!activeThread?.id) return
    loadMessages()
    const interval = setInterval(loadMessages, 3000)
    return () => clearInterval(interval)
  }, [activeThread?.id, loadMessages])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || !activeThread || sending) return
    setSending(true)
    const text = input.trim()
    setInput('')
    try {
      const res = await fetch('/api/chat/dm/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text, creatorId: activeThread.creator.id }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setMessages(prev => [...prev, data.message])
      setThreads(prev => prev.map(t =>
        t.id === activeThread.id ? { ...t, messages: [data.message] } : t
      ))
    } catch {
      setInput(text)
    } finally {
      setSending(false)
    }
  }

  const togglePin = async (thread: DmThread) => {
    await fetch('/api/chat/dm/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId: thread.id, action: thread.isPinned ? 'unpin' : 'pin' }),
    }).catch(() => {})
    loadThreads()
  }

  const markUnread = async (thread: DmThread) => {
    // Deselect first — keeping the thread open would immediately re-mark it read
    if (activeThread?.id === thread.id) {
      setActiveThread(null)
      setMessages([])
    }
    await fetch('/api/chat/dm/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId: thread.id, action: 'unread' }),
    }).catch(() => {})
    loadThreads()
  }

  const getAge = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>

      {/* LEFT: Thread list */}
      <div style={{ background: 'var(--surface)', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <p style={{ color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>INBOX</p>
          <p style={{ color: 'var(--text)', fontFamily: 'Montserrat, sans-serif', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.005em', fontSize: 24, margin: '4px 0 0' }}>Creator Messages</p>
          <p style={{ color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif', fontSize: 11, margin: '4px 0 0' }}>
            {threads.length} conversation{threads.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && (
            <div style={{ padding: 16 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: 64, background: 'var(--surface)', borderRadius: 8, marginBottom: 8 }} />
              ))}
            </div>
          )}
          {!loading && threads.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif', fontSize: 13 }}>No messages yet</p>
            </div>
          )}
          {threads.map(thread => {
            const lastMsg = thread.messages?.[0]
            const isActive = activeThread?.id === thread.id
            const initials = `${thread.creator.firstName[0]}${thread.creator.lastName[0]}`
            const unread = thread._count?.messages ?? 0
            return (
              <div
                key={thread.id}
                onClick={() => { setActiveThread(thread); setMessages([]) }}
                style={{
                  display: 'flex', gap: 10, padding: '14px 16px', cursor: 'pointer',
                  background: isActive ? 'rgba(228,220,209,0.08)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  transition: 'background 0.15s',
                }}
              >
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: 'var(--bg)', fontWeight: 700, fontSize: 13, fontFamily: 'Montserrat, sans-serif' }}>{initials}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'white', fontFamily: 'Montserrat, sans-serif', fontWeight: unread > 0 ? 700 : 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                      {thread.isPinned && <Pin size={11} color="var(--accent)" strokeWidth={2} style={{ flexShrink: 0 }} />}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {thread.creator.firstName} {thread.creator.lastName}
                      </span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {unread > 0 && (
                        <span style={{ background: 'var(--accent)', color: 'var(--bg)', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 9, borderRadius: 10, padding: '2px 6px' }}>
                          {unread}
                        </span>
                      )}
                      {lastMsg && (
                        <span style={{ color: 'var(--text-muted)', fontSize: 10, fontFamily: 'Montserrat, sans-serif' }}>
                          {getAge(lastMsg.createdAt)}
                        </span>
                      )}
                    </span>
                  </div>
                  {lastMsg && (
                    <p style={{ color: unread > 0 ? 'var(--text)' : 'var(--text-muted)', fontSize: 12, fontFamily: 'Montserrat, sans-serif', fontWeight: unread > 0 ? 600 : 400, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {lastMsg.sender?.isAdmin ? 'WGY: ' : ''}{lastMsg.body || '[image]'}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); togglePin(thread) }}
                      title={thread.isPinned ? 'Unpin conversation' : 'Pin to top'}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif', fontSize: 10, fontWeight: 600 }}
                    >
                      <Pin size={11} strokeWidth={1.8} />{thread.isPinned ? 'Unpin' : 'Pin'}
                    </button>
                    {unread === 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); markUnread(thread) }}
                        title="Mark as unread"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif', fontSize: 10, fontWeight: 600 }}
                      >
                        <MailPlus size={11} strokeWidth={1.8} />Mark unread
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* RIGHT: Conversation */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
        {!activeThread ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <p style={{ color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 16 }}>Select a conversation</p>
            <p style={{ color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif', fontSize: 13 }}>Choose a creator from the list</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'var(--bg)', fontWeight: 700, fontSize: 12, fontFamily: 'Montserrat, sans-serif' }}>
                  {activeThread.creator.firstName[0]}{activeThread.creator.lastName[0]}
                </span>
              </div>
              <p style={{ color: 'white', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 14, margin: 0 }}>
                {activeThread.creator.firstName} {activeThread.creator.lastName}
              </p>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <p style={{ color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif', fontSize: 13 }}>No messages yet</p>
                </div>
              )}
              {messages.map(msg => {
                const isAdmin = msg.sender?.isAdmin
                const initials = `${msg.sender?.firstName?.[0] || ''}${msg.sender?.lastName?.[0] || ''}`
                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: isAdmin ? 'row-reverse' : 'row', gap: 10, alignItems: 'flex-end' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: isAdmin ? '#9b7e56' : 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: 'var(--bg)', fontWeight: 700, fontSize: 10, fontFamily: 'Montserrat, sans-serif' }}>
                        {isAdmin ? 'WG' : initials}
                      </span>
                    </div>
                    <div style={{ maxWidth: '65%', display: 'flex', flexDirection: 'column', gap: 4, alignItems: isAdmin ? 'flex-end' : 'flex-start' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'Montserrat, sans-serif' }}>
                        {isAdmin ? 'WGY' : `${msg.sender?.firstName} ${msg.sender?.lastName}`} · {getAge(msg.createdAt)}
                      </span>
                      <div style={{ background: isAdmin ? '#9b7e56' : 'var(--surface)', borderRadius: isAdmin ? '12px 0 12px 12px' : '0 12px 12px 12px', padding: '10px 16px' }}>
                        <p style={{ color: 'white', fontFamily: 'Montserrat, sans-serif', fontSize: 13, lineHeight: 1.5, margin: 0, wordBreak: 'break-word' }}>
                          {msg.body}
                        </p>
                        {msg.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={msg.imageUrl} alt="Shared" style={{ maxWidth: '100%', borderRadius: 8, marginTop: 8 }} />
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* Reply input */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'var(--surface)', display: 'flex', gap: 12, alignItems: 'flex-end', flexShrink: 0 }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder={`Reply to ${activeThread.creator.firstName}...`}
                rows={2}
                style={{ flex: 1, background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 14px', color: 'white', fontFamily: 'Montserrat, sans-serif', fontSize: 13, resize: 'none', outline: 'none' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                style={{ width: 44, height: 44, borderRadius: '50%', background: input.trim() ? 'var(--accent)' : 'var(--surface-2)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: input.trim() ? 'pointer' : 'not-allowed', flexShrink: 0, transition: 'background 0.2s' }}
              >
                <Send size={18} color={input.trim() ? 'var(--bg)' : 'var(--text-muted)'} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
