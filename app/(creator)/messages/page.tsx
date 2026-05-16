'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'

interface DmThread {
  id: string
  updatedAt: string
  messages: Array<{
    body: string
    createdAt: string
    sender: { firstName: string; isAdmin: boolean }
  }>
  _count: { messages: number }
}

export default function MessagesPage() {
  const router = useRouter()
  const [thread, setThread] = useState<DmThread | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/chat/dm')
      .then(r => r.json())
      .then(d => { setThread(d.thread); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const lastMessage = thread?.messages?.[thread.messages.length - 1]
  const unreadCount = thread?._count?.messages ?? 0

  function formatTime(iso: string) {
    const d = new Date(iso)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
    if (diffDays === 0) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return d.toLocaleDateString('en-GB', { weekday: 'short' })
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="pb-20 bg-[#222222] min-h-screen">
      {/* Header */}
      <div className="px-5 pt-4 pb-2">
        <h1 className="text-page-heading text-white">Messages</h1>
      </div>

      <div className="mt-2">
        {loading ? (
          <div className="mx-5 h-16 bg-[#2a2a2a] rounded-xl animate-pulse" />
        ) : (
          <button
            onClick={() => router.push('/messages/wgy')}
            className="w-full flex gap-3 px-5 py-[14px] text-left active:opacity-80 transition-opacity"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
          >
            {/* Avatar */}
            <div className="relative flex-none">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center"
                style={{ background: '#e4dcd1' }}
              >
                <span className="font-montserrat font-bold" style={{ fontSize: 14, color: '#222222' }}>
                  WG
                </span>
              </div>
              <span
                className="absolute bottom-0 right-0 w-3 h-3 rounded-full"
                style={{ background: '#27AE60', border: '2px solid #222222' }}
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="font-montserrat font-semibold text-white" style={{ fontSize: 13 }}>
                WGY LTD
              </p>
              <p className="font-montserrat font-normal mt-[2px] truncate" style={{ fontSize: 12, color: '#706b6b' }}>
                {lastMessage
                  ? `${lastMessage.sender.isAdmin ? 'WGY' : 'You'}: ${lastMessage.body || '[image]'}`
                  : 'Start a conversation with WGY'
                }
              </p>
            </div>

            {/* Right */}
            <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
              {lastMessage && (
                <span className="font-montserrat font-normal" style={{ fontSize: 10, color: '#706b6b' }}>
                  {formatTime(lastMessage.createdAt)}
                </span>
              )}
              {unreadCount > 0 && (
                <div
                  className="flex items-center justify-center"
                  style={{ minWidth: 20, height: 20, borderRadius: '50%', background: '#e4dcd1', padding: '0 4px' }}
                >
                  <span className="font-montserrat font-bold" style={{ fontSize: 9, color: '#222222' }}>
                    {unreadCount}
                  </span>
                </div>
              )}
            </div>
          </button>
        )}
      </div>

      {/* Footer note */}
      <div className="flex items-center justify-center gap-1.5 px-5 pt-6">
        <Lock size={12} color="#706b6b" strokeWidth={1.5} />
        <p className="font-montserrat font-normal" style={{ fontSize: 11, color: '#706b6b' }}>
          Messages are between you and WGY only
        </p>
      </div>
    </div>
  )
}
