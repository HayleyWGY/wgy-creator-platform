'use client'

import { ArrowLeft, MoreHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useChatContext, Channel, MessageList, MessageComposer, Window } from 'stream-chat-react'
import type { Channel as StreamChannel } from 'stream-chat'

const COMMUNITY_IDS = [
  'group-chat',
  'share-social-links',
  'affiliate-links',
  'creator-collabs',
  'events-chat',
]

export default function DMThreadPage() {
  const { data: session } = useSession()
  const { client } = useChatContext()
  const [channel, setChannel] = useState<StreamChannel | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!client || !session?.user?.id) return

    async function getOrCreateDMChannel() {
      try {
        // Ensure DM is set up server-side with both members
        await fetch('/api/stream/setup-dm', { method: 'POST' })

        // Query for channels this user is a member of
        const channels = await client.queryChannels(
          {
            type: 'messaging',
            members: { $eq: [session!.user.id] },
          },
          { last_message_at: -1 },
          { watch: true, state: true, message_limit: 30 },
        )

        // Filter to DM channels only (exclude community rooms)
        const dmChannels = channels.filter(ch => !COMMUNITY_IDS.includes(ch.id ?? ''))

        if (dmChannels.length > 0) {
          setChannel(dmChannels[0])
        } else {
          setChannel(null)
        }
      } catch (err) {
        console.error('DM channel error:', err)
      } finally {
        setLoading(false)
      }
    }

    getOrCreateDMChannel()
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
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-[#e4dcd1] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : channel ? (
          <Channel channel={channel}>
            <Window>
              <MessageList />
              <MessageComposer />
            </Window>
          </Channel>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <p className="font-montserrat text-[#706b6b] text-sm">No messages yet.</p>
            <p className="font-montserrat text-[#706b6b] text-xs">Send a message to start the conversation.</p>
          </div>
        )}
      </div>
    </div>
  )
}
