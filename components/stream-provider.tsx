'use client'
import { useEffect, useState, useRef } from 'react'
import { StreamChat } from 'stream-chat'
import { Chat } from 'stream-chat-react'

const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY!

interface StreamProviderProps {
  children: React.ReactNode
  userId: string
}

export default function StreamProvider({ children, userId }: StreamProviderProps) {
  const [client, setClient] = useState<StreamChat | null>(null)
  const clientRef = useRef<StreamChat | null>(null)

  useEffect(() => {
    if (!userId) return

    async function init() {
      try {
        const res = await fetch('/api/stream/token')
        if (!res.ok) return

        const { token, userId: uid, userName } = await res.json()

        const streamClient = StreamChat.getInstance(apiKey)

        if (streamClient.userID !== uid) {
          await streamClient.connectUser({ id: uid, name: userName }, token)
        }

        clientRef.current = streamClient
        setClient(streamClient)

        // Add user to all community channels
        await fetch('/api/stream/setup', { method: 'POST' })
      } catch (error) {
        console.error('Stream init error:', error)
      }
    }

    init()

    return () => {
      if (clientRef.current?.userID) {
        clientRef.current.disconnectUser()
        clientRef.current = null
        setClient(null)
      }
    }
  }, [userId])

  if (!client) {
    return <>{children}</>
  }

  return <Chat client={client}>{children}</Chat>
}
