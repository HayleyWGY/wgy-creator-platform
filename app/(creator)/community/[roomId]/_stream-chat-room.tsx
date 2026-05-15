'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  useChatContext,
  useMessageContext,
  useDeleteHandler,
  ComponentProvider,
  Channel,
  MessageList,
  MessageComposer,
  MessageUI,
  Window,
} from 'stream-chat-react'
import type { MessageUIComponentProps } from 'stream-chat-react'
import type { LocalMessage, Message, SendMessageOptions } from 'stream-chat'
import type { Channel as StreamChannel } from 'stream-chat'
import { COMMUNITY_ROOMS } from '@/lib/stream'
import { Trash2 } from 'lucide-react'

// ─── Context to pass isAdmin into the message component without useMemo trick ─
const AdminCtx = createContext(false)

// Module-level component — stable reference, no recreate-on-render issues
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
          className="
            absolute top-1 right-1
            opacity-0 group-hover:opacity-100
            transition-opacity
            w-6 h-6 flex items-center justify-center
            rounded-full bg-[#1a1a1a]/80
            hover:bg-red-900/80
          "
        >
          <Trash2 size={11} color="#888" />
        </button>
      )}
    </div>
  )
}

// Stable component overrides object — defined once at module level
const COMPONENT_OVERRIDES = { Message: AdminMessage }

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
  const [blockedMsg, setBlockedMsg] = useState('')

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

  // Intercept @everyone / @all / @channel for non-admins
  const overrideSubmitHandler = useCallback(
    async ({
      message,
    }: {
      cid: string
      localMessage: LocalMessage
      message: Message
      sendOptions: SendMessageOptions
    }) => {
      const text = message.text ?? ''
      const hasForbidden = /@everyone|@all|@channel/i.test(text)

      if (!isAdmin && hasForbidden) {
        setBlockedMsg('Only WGY admins can use @everyone in chat rooms.')
        setTimeout(() => setBlockedMsg(''), 3500)
        return
      }

      setBlockedMsg('')
      if (channel) {
        await channel.sendMessage(message)
      }
    },
    [channel, isAdmin],
  )

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
    <AdminCtx.Provider value={isAdmin}>
      <Channel channel={channel}>
        <ComponentProvider value={COMPONENT_OVERRIDES}>
          <Window>
            <MessageList />
            {blockedMsg && (
              <p className="px-4 py-2 text-xs font-montserrat text-red-400 bg-[#1a1a1a] border-t border-white/5">
                {blockedMsg}
              </p>
            )}
            <MessageComposer overrideSubmitHandler={overrideSubmitHandler} />
          </Window>
        </ComponentProvider>
      </Channel>
    </AdminCtx.Provider>
  )
}
