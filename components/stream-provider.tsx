'use client'
import { useEffect, useState, useRef } from 'react'
import { StreamChat } from 'stream-chat'
import { Chat } from 'stream-chat-react'

interface Props {
  userId: string
  children: React.ReactNode
}

export default function StreamProvider({ userId, children }: Props) {
  const [client, setClient] = useState<StreamChat | null>(null)
  const initialised = useRef(false)

  useEffect(() => {
    if (!userId || initialised.current) return
    initialised.current = true

    const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY!

    async function connect() {
      try {
        const res = await fetch('/api/stream/token')
        if (!res.ok) {
          console.error('Token fetch failed:', res.status)
          initialised.current = false
          return
        }

        const { token, userId: uid, userName } = await res.json()

        const sc = new StreamChat(apiKey)
        await sc.connectUser({ id: uid, name: userName }, token)

        // Add user to all community channels server-side
        await fetch('/api/stream/setup', { method: 'POST' })

        setClient(sc)
      } catch (err) {
        console.error('Stream connect error:', err)
        initialised.current = false
      }
    }

    connect()

    return () => {
      // Don't disconnect on effect cleanup — layout remounts frequently
      // The client persists across page navigations inside the layout
    }
  }, [userId])

  if (!client) return <>{children}</>

  return (
    <Chat client={client} theme="str-chat__theme-dark">
      {children}
    </Chat>
  )
}
