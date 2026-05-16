'use client'
import { useEffect, useState } from 'react'

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
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
    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e4dcd1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#222', fontFamily: 'Montserrat, sans-serif' }}>{initials}</span>
    </div>
  )
}

export default function AdminCommunityPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/creator-posts?limit=50')
      .then(r => r.json())
      .then(data => { setPosts(data.posts || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function deletePost(id: string) {
    if (!confirm('Delete this post?')) return
    await fetch(`/api/creator-posts/${id}`, { method: 'DELETE' })
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div style={{ padding: '32px' }}>
      {/* Header */}
      <p style={{ color: '#706b6b', fontFamily: 'Montserrat, sans-serif', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 4px' }}>
        COMMUNITY
      </p>
      <p style={{ color: 'white', fontFamily: 'Playfair Display, serif', fontStyle: 'italic', fontSize: 32, margin: '0 0 4px' }}>
        Creator Corner Posts
      </p>
      <p style={{ color: '#706b6b', fontFamily: 'Montserrat, sans-serif', fontSize: 13, margin: '0 0 24px' }}>
        All posts from creators. You can delete any post.
      </p>

      {/* Table */}
      <div style={{ background: '#2a2a2a', borderRadius: 12, overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{ background: '#1a1a1a', padding: '12px 20px', display: 'grid', gridTemplateColumns: '180px 1fr 80px 110px 80px', gap: 12, alignItems: 'center' }}>
          {['CREATOR', 'POST', 'IMAGE', 'DATE', 'ACTIONS'].map(label => (
            <span key={label} style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#706b6b' }}>
              {label}
            </span>
          ))}
        </div>

        {loading && (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ color: '#706b6b', fontFamily: 'Montserrat, sans-serif', fontSize: 13 }}>Loading...</p>
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ color: '#706b6b', fontFamily: 'Montserrat, sans-serif', fontSize: 13 }}>No posts yet</p>
          </div>
        )}

        {posts.map((post, i) => (
          <div
            key={post.id}
            style={{
              padding: '14px 20px',
              display: 'grid',
              gridTemplateColumns: '180px 1fr 80px 110px 80px',
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
            <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: '#c8c3bc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {post.body.length > 80 ? post.body.slice(0, 80) + '…' : post.body}
            </span>

            {/* Image */}
            {post.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.imageUrl} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', display: 'block' }} />
            ) : (
              <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: '#706b6b' }}>No image</span>
            )}

            {/* Date */}
            <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: '#706b6b' }}>
              {formatDate(post.createdAt)}
            </span>

            {/* Actions */}
            <button
              onClick={() => deletePost(post.id)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 11, color: '#C0392B', textAlign: 'left' }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
