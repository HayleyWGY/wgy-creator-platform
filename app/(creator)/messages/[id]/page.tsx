'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useChatContext, Channel, MessageList, MessageComposer, Window } from 'stream-chat-react'
import type { Channel as StreamChannel } from 'stream-chat'
import { ArrowLeft } from 'lucide-react'

export default function DMPage() {
  const { client } = useChatContext()
  const { data: session } = useSession()
  const router = useRouter()
  const [channel, setChannel] = useState<StreamChannel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // client is undefined until StreamProvider connects — wait for it
    if (!client || !session?.user?.id) return

    let mounted = true

    async function setupAndLoad() {
      try {
        const setupRes = await fetch('/api/stream/setup-dm', { method: 'POST' })
        if (!setupRes.ok) throw new Error('DM setup failed')

        const { channelId } = await setupRes.json()

        const ch = client!.channel('messaging', channelId)
        await ch.watch()

        if (mounted) {
          setChannel(ch)
          setLoading(false)
        }
      } catch (err: unknown) {
        console.error('DM load error:', err)
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Could not connect')
          setLoading(false)
        }
      }
    }

    setupAndLoad()

    return () => { mounted = false }
  }, [client, session])

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
          }}
        >
          <ArrowLeft size={16} />
        </button>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: '#e4dcd1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              color: '#222222',
              fontWeight: 700,
              fontSize: 12,
              fontFamily: 'Montserrat, sans-serif',
            }}
          >
            WG
          </span>
        </div>
        <div>
          <p
            style={{
              color: 'white',
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 600,
              fontSize: 14,
              margin: 0,
            }}
          >
            WGY LTD
          </p>
          <p
            style={{
              color: '#27AE60',
              fontSize: 11,
              fontFamily: 'Montserrat, sans-serif',
              margin: 0,
            }}
          >
            Online
          </p>
        </div>
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
            Could not connect to messages.
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

      {/* Stream Chat */}
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
