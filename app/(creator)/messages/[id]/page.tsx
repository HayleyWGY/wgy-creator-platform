'use client'

import { ArrowLeft, MoreHorizontal, Send } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useChatContext, Channel, MessageList } from 'stream-chat-react'
import type { Channel as StreamChannel } from 'stream-chat'

// Custom input — calls channel.sendMessage directly, no Stream CSS conflicts
function DMInput({ channel }: { channel: StreamChannel }) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed) return
    try {
      await channel.sendMessage({ text: trimmed })
      setText('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
        textareaRef.current.focus()
      }
    } catch (err) {
      console.error('DM send error:', err)
    }
  }

  return (
    <div
      className="flex-shrink-0 flex items-end gap-3 px-4 py-3"
      style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: '#1c1c1c',
      }}
    >
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
          background: '#2a2a2a',
          color: '#ffffff',
          borderRadius: '20px',
          border: 'none',
          fontSize: '13px',
          padding: '10px 16px',
          minHeight: '40px',
          maxHeight: '100px',
          lineHeight: '1.4',
        }}
        onInput={e => {
          const el = e.currentTarget
          el.style.height = 'auto'
          el.style.height = Math.min(el.scrollHeight, 100) + 'px'
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
  )
}

export default function DMThreadPage() {
  const { data: session } = useSession()
  const { client } = useChatContext()
  const [channel, setChannel] = useState<StreamChannel | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!client || !session?.user?.id) return
    let mounted = true

    async function getOrCreateDMChannel() {
      try {
        const res = await fetch('/api/stream/setup-dm', { method: 'POST' })
        const { channelId } = await res.json()
        if (!channelId) throw new Error('No channel ID returned')

        const ch = client.channel('messaging', channelId)
        await ch.watch()
        await ch.markRead()
        if (mounted) setChannel(ch)
      } catch (err) {
        console.error('DM channel error:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    getOrCreateDMChannel()

    return () => {
      mounted = false
      channel?.stopWatching()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, session])

  return (
    <div className="flex flex-col bg-[#222222]" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: '#1c1c1c' }}
      >
        <Link href="/messages">
          <ArrowLeft size={18} color="#706b6b" strokeWidth={1.5} />
        </Link>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-none"
          style={{ background: '#e4dcd1' }}
        >
          <span className="font-montserrat font-bold" style={{ fontSize: '12px', color: '#222222' }}>
            WG
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-montserrat font-semibold text-white" style={{ fontSize: '13px' }}>
            WGY LTD
          </p>
          <p className="font-montserrat font-normal" style={{ fontSize: '10px', color: '#27AE60' }}>
            Online
          </p>
        </div>
        <MoreHorizontal size={20} color="#706b6b" strokeWidth={1.5} />
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="w-6 h-6 border-2 border-[#e4dcd1] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : channel ? (
          <Channel channel={channel}>
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto" style={{ background: '#222222' }}>
                <MessageList />
              </div>
              <DMInput channel={channel} />
            </div>
          </Channel>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 gap-2">
            <p className="font-montserrat text-[#706b6b] text-sm">Could not connect to messages.</p>
          </div>
        )}
      </div>
    </div>
  )
}
