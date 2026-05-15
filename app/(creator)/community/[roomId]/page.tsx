'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useChatContext, Channel, MessageList, MessageComposer, Window } from 'stream-chat-react'
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
    // client is undefined until StreamProvider connects — wait for it
    if (!client || !room) {
      // If there's no room, bail; otherwise keep waiting for client
      if (!room) setLoading(false)
      return
    }

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
          setError(err instanceof Error ? err.message : 'Failed to load chat')
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
    <div
      style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: '#222222',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          background: '#222222',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: '#2a2a2a',
            border: 'none',
            color: '#e4dcd1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={16} />
        </button>
        <span style={{ fontSize: 20 }}>{room.emoji}</span>
        <span
          style={{
            color: 'white',
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 600,
            fontSize: 14,
            flex: 1,
          }}
        >
          {room.name}
        </span>
        {session?.user?.isAdmin && (
          <span
            style={{
              fontSize: 10,
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#706b6b',
            }}
          >
            Moderator
          </span>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              width: 24,
              height: 24,
              border: '2px solid #e4dcd1',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            gap: 12,
          }}
        >
          <p
            style={{
              color: '#706b6b',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: 14,
              textAlign: 'center',
            }}
          >
            Could not load chat room.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              background: '#e4dcd1',
              color: '#222222',
              border: 'none',
              borderRadius: 8,
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Stream Chat UI */}
      {channel && !loading && !error && (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Channel channel={channel}>
            <Window>
              <MessageList />
              <MessageComposer />
            </Window>
          </Channel>
        </div>
      )}
    </div>
  )
}
