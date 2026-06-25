'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trash2 } from 'lucide-react'

interface Author {
  id: string
  firstName: string
  lastName: string
  profileImageUrl: string | null
}

interface Comment {
  id: string
  body: string
  createdAt: string
  author: Author
}

interface Post {
  id: string
  body: string
  imageUrl: string | null
  likesCount: number
  commentsCount: number
  createdAt: string
  author: Author
  comments: Comment[]
}

function getAge(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function AdminPostDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/creator-posts/${params.id}`)
      .then(r => r.json())
      .then(d => { setPost(d.post); setLoading(false) })
      .catch(() => setLoading(false))
  }, [params.id])

  const handleDeletePost = async () => {
    if (!post || !confirm('Delete this post? This cannot be undone.')) return
    await fetch(`/api/creator-posts/${post.id}`, { method: 'DELETE' })
    router.push('/admin/community')
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!post || !confirm('Delete this comment?')) return
    await fetch(`/api/creator-posts/${post.id}/comments/${commentId}`, { method: 'DELETE' })
    setPost(prev => prev ? {
      ...prev,
      comments: prev.comments.filter(c => c.id !== commentId),
      commentsCount: prev.commentsCount - 1,
    } : prev)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
        <div style={{ width: 24, height: 24, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  if (!post) return null

  const initials = `${post.author.firstName[0]}${post.author.lastName[0]}`

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Main content */}
      <div style={{ padding: 32, overflowY: 'auto' }}>
        {/* Back */}
        <button
          onClick={() => router.push('/admin/community')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 24 }}
        >
          <ArrowLeft size={16} color="var(--text-muted)" />
          <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: 'var(--text-muted)' }}>Back to Community</span>
        </button>

        {/* Post */}
        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 24, marginBottom: 24, border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
              {post.author.profileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.author.profileImageUrl} alt={initials} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--bg)', fontFamily: 'Montserrat, sans-serif' }}>{initials}</span>
              )}
            </div>
            <div>
              <p style={{ margin: 0, color: 'white', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 14 }}>
                {post.author.firstName} {post.author.lastName}
              </p>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif', fontSize: 11 }}>{getAge(post.createdAt)}</p>
            </div>
          </div>

          <p style={{ color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>
            {post.body}
          </p>

          {post.imageUrl && (
            <div style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.imageUrl} alt="Post image" style={{ width: '100%', display: 'block' }} />
            </div>
          )}

          <div style={{ display: 'flex', gap: 16, padding: '12px 0 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif', fontSize: 12 }}>♥ {post.likesCount}</span>
            <span style={{ color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif', fontSize: 12 }}>💬 {post.comments?.length || 0}</span>
          </div>
        </div>

        {/* Comments */}
        <p style={{ color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 16px' }}>
          COMMENTS ({post.comments?.length || 0})
        </p>

        {post.comments?.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>No comments yet</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {post.comments?.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--bg)', fontFamily: 'Montserrat, sans-serif' }}>
                  {c.author.firstName[0]}{c.author.lastName[0]}
                </span>
              </div>
              <div style={{ flex: 1, background: 'var(--surface)', borderRadius: '0 10px 10px 10px', padding: '10px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <div>
                    <span style={{ color: 'white', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 12 }}>
                      {c.author.firstName} {c.author.lastName}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif', fontSize: 10, marginLeft: 8 }}>
                      {getAge(c.createdAt)}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteComment(c.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, opacity: 0.5 }}
                    title="Delete comment"
                  >
                    <Trash2 size={13} color="#C0392B" />
                  </button>
                </div>
                <p style={{ color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif', fontSize: 12, lineHeight: 1.5, margin: 0 }}>
                  {c.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sidebar */}
      <div style={{ background: 'var(--surface)', borderLeft: '1px solid rgba(255,255,255,0.06)', padding: 24 }}>
        <p style={{ color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 16px' }}>
          MODERATION
        </p>

        <button
          onClick={handleDeletePost}
          style={{ width: '100%', background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.3)', borderRadius: 8, padding: '10px 16px', color: '#C0392B', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 13, cursor: 'pointer', textAlign: 'center' }}
        >
          Delete Post
        </button>

        <div style={{ marginTop: 24 }}>
          <p style={{ color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 12px' }}>
            POST INFO
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif', fontSize: 10 }}>Author</p>
              <p style={{ margin: '2px 0 0', color: 'white', fontFamily: 'Montserrat, sans-serif', fontSize: 13 }}>
                {post.author.firstName} {post.author.lastName}
              </p>
            </div>
            <div>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif', fontSize: 10 }}>Posted</p>
              <p style={{ margin: '2px 0 0', color: 'white', fontFamily: 'Montserrat, sans-serif', fontSize: 13 }}>
                {new Date(post.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif', fontSize: 10 }}>Likes</p>
              <p style={{ margin: '2px 0 0', color: 'white', fontFamily: 'Montserrat, sans-serif', fontSize: 13 }}>{post.likesCount}</p>
            </div>
            <div>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif', fontSize: 10 }}>Comments</p>
              <p style={{ margin: '2px 0 0', color: 'white', fontFamily: 'Montserrat, sans-serif', fontSize: 13 }}>{post.comments?.length || 0}</p>
            </div>
            <div>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif', fontSize: 10 }}>Has image</p>
              <p style={{ margin: '2px 0 0', color: 'white', fontFamily: 'Montserrat, sans-serif', fontSize: 13 }}>{post.imageUrl ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
