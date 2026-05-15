'use client'
import { useRouter } from 'next/navigation'
import { COMMUNITY_ROOMS } from '@/lib/stream'
import { ArrowLeft } from 'lucide-react'
import { useSession } from 'next-auth/react'

// Stream Chat components — imported dynamically to ensure client-only usage
import dynamic from 'next/dynamic'

const StreamChatRoom = dynamic(() => import('./_stream-chat-room'), { ssr: false })

export default function ChatRoomPage({ params }: { params: { roomId: string } }) {
  const { data: session } = useSession()
  const router = useRouter()

  const room = COMMUNITY_ROOMS.find(r => r.id === params.roomId)

  if (!room) {
    router.push('/community')
    return null
  }

  return (
    <div className="flex flex-col bg-[#222222]" style={{ height: 'calc(100vh - 56px)' }}>

      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-[#2a2a2a]"
        >
          <ArrowLeft size={16} color="#e4dcd1" />
        </button>
        <span className="text-xl">{room.emoji}</span>
        <p className="text-white font-montserrat font-semibold text-sm flex-1">{room.name}</p>
        {session?.user?.isAdmin && (
          <span className="text-[10px] font-montserrat font-bold uppercase tracking-wider text-[#706b6b]">
            Moderator
          </span>
        )}
      </div>

      {/* Stream Chat UI */}
      <div className="flex-1 overflow-hidden">
        <StreamChatRoom roomId={params.roomId} isAdmin={!!session?.user?.isAdmin} />
      </div>
    </div>
  )
}
