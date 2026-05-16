'use client'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export default function ChatRoomPage({ params }: { params: { roomId: string } }) {
  const router = useRouter()

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#222222' }}>
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
            alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <ArrowLeft size={16} />
        </button>
        <span style={{ color: 'white', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 14 }}>
          {params.roomId.replace(/-/g, ' ')}
        </span>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <p style={{ color: '#706b6b', fontFamily: 'Montserrat, sans-serif', fontSize: 14, textAlign: 'center' }}>
          Chat coming soon
        </p>
      </div>
    </div>
  )
}
