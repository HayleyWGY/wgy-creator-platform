'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useChatContext, Channel, MessageList, MessageInput, Window } from 'stream-chat-react'
import type { Channel as StreamChannel } from 'stream-chat'
import { COMMUNITY_ROOMS } from '@/lib/stream'
import { ArrowLeft } from 'lucide-react'

export default function ChatRoomPage({ params }: { params: { roomId: string } }) {
  const { client } = useChatContext()
  const { data: session } = useSession()
  const router = useRouter()
  const [channel, setChannel] = useState<StreamChannel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const room = COMMUNITY_ROOMS.find(r => r.id === params.roomId)

  useEffect(() => {
    if (!client || !room) return
    let mounted = true

    async function join() {
      try {
        const ch = client!.channel('messaging', params.roomId)
        await ch.watch()
        await ch.markRead()
        if (mounted) {
          setChannel(ch)
          setLoading(false)
        }
      } catch (err: unknown) {
        console.error('Join error:', err)
        if (mounted) {
          setError('Could not load chat')
          setLoading(false)
        }
      }
    }

    join()
    return () => { mounted = false }
  }, [client, params.roomId, room])

  if (!room) {
    router.push('/community')
    return null
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
            alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
          }}
        >
          <ArrowLeft size={16} />
        </button>
        <span style={{ fontSize: 18 }}>{room.emoji}</span>
        <span style={{ color: 'white', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 14 }}>
          {room.name}
        </span>
        {session?.user?.isAdmin && (
          <span style={{
            marginLeft: 'auto', color: '#706b6b', fontFamily: 'Montserrat, sans-serif',
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
          }}>
            Moderator
          </span>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#222222' }}>
          <div style={{
            width: 24, height: 24, border: '2px solid #e4dcd1',
            borderTopColor: 'transparent', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 }}>
          <p style={{ color: '#706b6b', fontFamily: 'Montserrat, sans-serif', fontSize: 14, textAlign: 'center' }}>
            Could not load chat room.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '8px 20px', background: '#e4dcd1', color: '#222222', border: 'none', borderRadius: 8, fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Stream Chat */}
      {channel && !loading && !error && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Channel channel={channel}>
            <Window>
              <MessageList />
              <MessageInput additionalTextareaProps={{ placeholder: `Message ${room.name}...` }} />
            </Window>
          </Channel>
        </div>
      )}
    </div>
  )
}
