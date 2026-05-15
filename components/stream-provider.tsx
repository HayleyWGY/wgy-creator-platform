'use client'
import { useEffect, useState, useRef } from 'react'
import { StreamChat } from 'stream-chat'
import { Chat } from 'stream-chat-react'
import 'stream-chat-react/dist/css/v2/index.css'

interface Props {
  userId: string
  children: React.ReactNode
}

export default function StreamProvider({ userId, children }: Props) {
  const [client, setClient] = useState<StreamChat | null>(null)
  const connecting = useRef(false)

  useEffect(() => {
    if (!userId || connecting.current) return
    connecting.current = true

    const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY!

    async function connect() {
      try {
        const res = await fetch('/api/stream/token')
        if (!res.ok) return

        const { token, userId: uid, userName } = await res.json()

        const streamClient = new StreamChat(apiKey)
        await streamClient.connectUser({ id: uid, name: userName }, token)

        // Setup community channels server-side
        await fetch('/api/stream/setup', { method: 'POST' })

        setClient(streamClient)
      } catch (err) {
        console.error('Stream error:', err)
        connecting.current = false
      }
    }

    connect()

    return () => {
      if (client) {
        client.disconnectUser()
        setClient(null)
        connecting.current = false
      }
    }
  }, [userId])

  if (!client) return <>{children}</>

  return (
    <Chat client={client} theme="messaging dark">
      {children}
    </Chat>
  )
}
