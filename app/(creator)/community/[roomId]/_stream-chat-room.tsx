'use client'
import { createContext, useContext, useEffect, useState, useRef } from 'react'
import {
  useChatContext,
  useMessageContext,
  useDeleteHandler,
  ComponentProvider,
  Channel,
  MessageList,
  MessageUI,
} from 'stream-chat-react'
import type { MessageUIComponentProps } from 'stream-chat-react'
import type { Channel as StreamChannel } from 'stream-chat'
import { COMMUNITY_ROOMS } from '@/lib/stream'
import { Send, Trash2 } from 'lucide-react'

// ─── isAdmin context so AdminMessage has a stable component reference ─────────
const AdminCtx = createContext(false)

function AdminMessage(props: MessageUIComponentProps) {
  const isAdmin = useContext(AdminCtx)
  const { message } = useMessageContext('AdminMessage')
  const handleDelete = useDeleteHandler(message)
  const isDeleted = message.type === 'deleted' || !!message.deleted_at

  return (
    <div className="relative group">
      <MessageUI {...props} />
      {isAdmin && !isDeleted && (
        <button
          onClick={() => handleDelete()}
          title="Delete message"
          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded-full bg-[#1a1a1a]/80 hover:bg-red-900/80"
        >
          <Trash2 size={11} color="#888" />
        </button>
      )}
    </div>
  )
}

// ─── Custom input — native HTML, calls channel.sendMessage directly ───────────
function ChatInput({
  channel,
  isAdmin,
}: {
  channel: StreamChannel
  isAdmin: boolean
}) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed) return

    if (!isAdmin && /@everyone|@all|@channel/i.test(trimmed)) {
      setError('Only WGY admins can use @everyone.')
      setTimeout(() => setError(''), 3000)
      return
    }

    try {
      await channel.sendMessage({ text: trimmed })
      setText('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
        textareaRef.current.focus()
      }
    } catch (err) {
      console.error('Send error:', err)
    }
  }

  return (
    <div
      style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: '#2a2a2a',
        padding: '10px 16px',
        flexShrink: 0,
      }}
    >
      {error && (
        <p className="text-red-400 font-montserrat mb-2" style={{ fontSize: '11px' }}>
          {error}
        </p>
      )}
      <div className="flex items-end gap-3">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder="Write a message..."
          rows={1}
          className="flex-1 resize-none font-montserrat outline-none"
          style={{
            background: '#333333',
            color: '#ffffff',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.08)',
            fontSize: '13px',
            padding: '10px 14px',
            minHeight: '40px',
            maxHeight: '120px',
            lineHeight: '1.4',
          }}
          onInput={e => {
            const el = e.currentTarget
            el.style.height = 'auto'
            el.style.height = Math.min(el.scrollHeight, 120) + 'px'
          }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full disabled:opacity-30 transition-opacity"
          style={{ background: '#e4dcd1' }}
        >
          <Send size={15} color="#222222" />
        </button>
      </div>
    </div>
  )
}

// ─── Main chat room ────────────────────────────────────────────────────────────
export default function StreamChatRoom({
  roomId,
  isAdmin,
}: {
  roomId: string
  isAdmin: boolean
}) {
  const { client } = useChatContext()
  const [channel, setChannel] = useState<StreamChannel | null>(null)
  const [loading, setLoading] = useState(true)

  const room = COMMUNITY_ROOMS.find(r => r.id === roomId)

  useEffect(() => {
    if (!client || !room) return
    let mounted = true

    async function joinRoom() {
      try {
        const ch = client.channel('messaging', roomId)
        await ch.watch()
        await ch.markRead()
        if (mounted) setChannel(ch)
      } catch (err) {
        console.error('Room join error:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    joinRoom()

    return () => {
      mounted = false
      channel?.stopWatching()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, roomId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-[#e4dcd1] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!channel) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="font-montserrat text-[#706b6b] text-sm">Could not connect to chat.</p>
      </div>
    )
  }

  return (
    <AdminCtx.Provider value={isAdmin}>
      <Channel channel={channel}>
        <ComponentProvider value={{ Message: AdminMessage }}>
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto" style={{ background: '#222222' }}>
              <MessageList />
            </div>
            <ChatInput channel={channel} isAdmin={isAdmin} />
          </div>
        </ComponentProvider>
      </Channel>
    </AdminCtx.Provider>
  )
}
