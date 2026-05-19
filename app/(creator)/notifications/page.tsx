'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, MessageCircle, Heart, Megaphone } from 'lucide-react'

interface Notification {
  id: string
  type: string
  title: string
  description: string
  referenceId: string | null
  isRead: boolean
  createdAt: string
}

function getAge(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function getIcon(type: string) {
  switch (type) {
    case 'comment':
    case 'reply':
    case 'dm':
      return MessageCircle
    case 'like':
      return Heart
    case 'campaign':
      return Megaphone
    default:
      return Bell
  }
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then(data => {
        setNotifications(data.notifications || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function handleClick(notif: Notification) {
    if ((notif.type === 'comment' || notif.type === 'reply') && notif.referenceId) {
      router.push(`/community/creator-corner/${notif.referenceId}`)
    } else if (notif.type === 'dm') {
      router.push('/messages/wgy')
    } else if (notif.type === 'campaign' && notif.referenceId) {
      router.push(`/opportunities/${notif.referenceId}`)
    }
  }

  return (
    <div>
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-page-heading text-white">Notifications</h1>
      </div>

      {loading && (
        <div className="px-5 flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-[#2a2a2a] rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && notifications.length === 0 && (
        <div className="flex flex-col items-center" style={{ padding: '60px 20px' }}>
          <div
            className="flex items-center justify-center"
            style={{ width: 64, height: 64, borderRadius: '50%', background: '#2a2a2a' }}
          >
            <Bell size={28} color="#706b6b" strokeWidth={1.5} />
          </div>
          <p className="font-playfair italic font-normal text-white text-center" style={{ fontSize: 18, marginTop: 16 }}>
            No notifications yet
          </p>
          <p className="font-montserrat font-normal text-center" style={{ fontSize: 13, color: '#706b6b', marginTop: 6 }}>
            You are all caught up!
          </p>
        </div>
      )}

      {!loading && notifications.length > 0 && (
        <div>
          {notifications.map((n, i) => {
            const Icon = getIcon(n.type)
            return (
              <div key={n.id}>
                <div
                  className="flex gap-3 px-5 py-[14px] cursor-pointer"
                  style={{
                    background: '#222222',
                    borderLeft: n.isRead ? '2px solid transparent' : '2px solid #e4dcd1',
                  }}
                  onClick={() => handleClick(n)}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-none"
                    style={{ background: '#2a2a2a' }}
                  >
                    <Icon size={16} color={n.isRead ? '#706b6b' : '#e4dcd1'} strokeWidth={1.5} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className="font-montserrat font-semibold"
                      style={{ fontSize: 13, color: n.isRead ? '#706b6b' : 'white' }}
                    >
                      {n.title}
                    </p>
                    <p
                      className="font-montserrat font-normal mt-[2px]"
                      style={{ fontSize: 12, color: '#706b6b' }}
                    >
                      {n.description}
                    </p>
                  </div>

                  <span className="font-montserrat font-normal flex-none" style={{ fontSize: 10, color: '#706b6b' }}>
                    {getAge(n.createdAt)}
                  </span>
                </div>

                {i < notifications.length - 1 && (
                  <div className="mx-5" style={{ height: 1, background: 'rgba(255,255,255,0.04)' }} />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
