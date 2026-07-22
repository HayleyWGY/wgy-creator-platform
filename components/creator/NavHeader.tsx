'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Bell, MessageCircle } from 'lucide-react'
import Link from 'next/link'

export function NavHeader() {
  const pathname = usePathname()
  const [unreadDMs, setUnreadDMs] = useState(false)
  const [unreadNotifs, setUnreadNotifs] = useState(0)

  useEffect(() => {
    async function checkUnread() {
      try {
        const [dmRes, notifRes] = await Promise.all([
          fetch('/api/chat/dm/unread'),
          fetch('/api/notifications/unread'),
        ])
        const dmData = await dmRes.json()
        const notifData = await notifRes.json()
        setUnreadDMs(dmData.hasUnread || false)
        setUnreadNotifs(notifData.unreadCount || 0)
      } catch {}
    }
    checkUnread()
  }, [pathname])

  // Clear DM badge when on messages page
  useEffect(() => {
    if (pathname.includes('/messages')) {
      setUnreadDMs(false)
      fetch('/api/chat/dm/mark-read', { method: 'POST' }).catch(() => {})
    }
  }, [pathname])

  // Clear notification badge when on notifications page
  useEffect(() => {
    if (pathname.includes('/notifications')) {
      setUnreadNotifs(0)
      fetch('/api/notifications/read', { method: 'POST' }).catch(() => {})
    }
  }, [pathname])

  return (
    <div className="flex items-center gap-4">
      <Link href="/messages" className="relative" aria-label="Messages">
        <MessageCircle size={20} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
        {unreadDMs && (
          <span
            className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
            style={{ background: 'var(--accent)' }}
          />
        )}
      </Link>
      <Link href="/notifications" className="relative" aria-label="Notifications">
        <Bell size={20} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
        {unreadNotifs > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[14px] h-[14px] rounded-full flex items-center justify-center px-0.5"
            style={{ background: 'var(--pill-bg)', fontSize: '8px', fontWeight: 700, color: 'var(--pill-text)', fontFamily: 'Montserrat, sans-serif' }}
          >
            {unreadNotifs > 9 ? '9+' : unreadNotifs}
          </span>
        )}
      </Link>
    </div>
  )
}
