'use client'
import { useEffect, useState } from 'react'
import { useChatContext, Channel, MessageList, MessageComposer, Window } from 'stream-chat-react'
import type { Channel as StreamChannel } from 'stream-chat'
import { COMMUNITY_ROOMS } from '@/lib/stream'

export default function StreamChatRoom({ roomId }: { roomId: string }) {
  const { client } = useChatContext()
  const [channel, setChannel]   = useState<StreamChannel | null>(null)
  const [loading, setLoading]   = useState(true)

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
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-[#e4dcd1] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!channel) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <p className="font-montserrat text-[#706b6b] text-sm">Could not connect to chat.</p>
      </div>
    )
  }

  return (
    <Channel channel={channel}>
      <Window>
        <MessageList />
        <MessageComposer />
      </Window>
    </Channel>
  )
}
