'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Author {
  id: string
  firstName: string
  lastName: string
  profileImageUrl: string | null
}

interface Post {
  id: string
  body: string
  imageUrl: string | null
  createdAt: string
  author: Author
  likesCount: number
  commentsCount: number
}

interface ChatRoom {
  id: string
  slug: string
  name: string
  emoji: string
  description: string | null
  _count: { messages: number }
  messages: { createdAt: string }[]
}

const ROOMS = [
  { slug: 'group-chat',      emoji: '💬', name: 'Group Chat' },
  { slug: 'social-links',    emoji: '🔗', name: 'Social Links' },
  { slug: 'affiliate-links', emoji: '💰', name: 'Affiliate Links' },
  { slug: 'creator-collabs', emoji: '🤝', name: 'Creator Collabs' },
  { slug: 'events-chat',     emoji: '📅', name: 'Events Chat' },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getAge(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function Avatar({ author }: { author: Author }) {
  const initials = `${author.firstName[0]}${author.lastName[0]}`
  if (author.profileImageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={author.profileImageUrl} alt={initials} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
    )
  }
  return (
    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--bg)', fontFamily: 'Montserrat, sans-serif' }}>{initials}</span>
    </div>
  )
}

export default function AdminCommunityPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [loadingRooms, setLoadingRooms] = useState(true)

  useEffect(() => {
    fetch('/api/creator-posts?limit=50')
      .then(r => r.json())
      .then(data => { setPosts(data.posts || []); setLoadingPosts(false) })
      .catch(() => setLoadingPosts(false))

    fetch('/api/chat/rooms')
      .then(r => r.json())
      .then(data => { setRooms(data.rooms || []); setLoadingRooms(false) })
      .catch(() => setLoadingRooms(false))
  }, [])

  async function deletePost(id: string) {
    if (!confirm('Delete this post?')) return
    await fetch(`/api/creator-posts/${id}`, { method: 'DELETE' })
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div style={{ padding: '32px', maxWidth: 1100 }}>
      {/* Header */}
      <p style={{ color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 4px' }}>
        COMMUNITY
      </p>
      <p style={{ color: 'white', fontFamily: 'Playfair Display, serif', fontStyle: 'italic', fontSize: 32, margin: '0 0 24px' }}>
        Community Overview
      </p>

      {/* Chat Rooms */}
      <p style={{ color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 12px' }}>
        CHAT ROOMS
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 40 }}>
        {(loadingRooms ? ROOMS : ROOMS).map(room => {
          const liveRoom = rooms.find(r => r.slug === room.slug)
          const lastMsg = liveRoom?.messages?.[0]
          return (
            <div
              key={room.slug}
              style={{ background: 'var(--surface)', borderRadius: 12, padding: '16px 18px', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
              onClick={() => router.push(`/admin/community/rooms/${room.slug}`)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>{room.emoji}</span>
                <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 14, color: 'white' }}>{room.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: 'var(--text-muted)' }}>
                  {liveRoom ? `${liveRoom._count?.messages ?? 0} messages` : loadingRooms ? '…' : '0 messages'}
                </span>
                {lastMsg && (
                  <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 10, color: 'var(--text-muted)' }}>
                    {getAge(lastMsg.createdAt)}
                  </span>
                )}
              </div>
              <div style={{ marginTop: 10 }}>
                <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: '#9b7e56' }}>View messages →</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Creator Corner Posts */}
      <p style={{ color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 12px' }}>
        CREATOR CORNER POSTS
      </p>
      <div style={{ background: 'var(--surface)', borderRadius: 12, overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{ background: 'var(--surface)', padding: '12px 20px', display: 'grid', gridTemplateColumns: '180px 1fr 60px 120px 160px', gap: 12, alignItems: 'center' }}>
          {['CREATOR', 'POST', 'IMG', 'DATE', 'ACTIONS'].map(label => (
            <span key={label} style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
              {label}
            </span>
          ))}
        </div>

        {loadingPosts && (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif', fontSize: 13 }}>Loading...</p>
          </div>
        )}

        {!loadingPosts && posts.length === 0 && (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif', fontSize: 13 }}>No posts yet</p>
          </div>
        )}

        {posts.map((post, i) => (
          <div
            key={post.id}
            style={{
              padding: '14px 20px',
              display: 'grid',
              gridTemplateColumns: '180px 1fr 60px 120px 160px',
              gap: 12,
              alignItems: 'center',
              borderBottom: i < posts.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}
          >
            {/* Creator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar author={post.author} />
              <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 500, fontSize: 13, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {post.author.firstName} {post.author.lastName}
              </span>
            </div>

            {/* Post body */}
            <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {post.body.length > 80 ? post.body.slice(0, 80) + '…' : post.body}
            </span>

            {/* Image */}
            {post.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.imageUrl} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', display: 'block' }} />
            ) : (
              <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: 'var(--text-muted)' }}>—</span>
            )}

            {/* Date */}
            <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: 'var(--text-muted)' }}>
              {formatDate(post.createdAt)}
            </span>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => router.push(`/admin/community/posts/${post.id}`)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 11, color: 'var(--accent)' }}
              >
                View
              </button>
              <button
                onClick={() => deletePost(post.id)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 11, color: '#C0392B' }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
