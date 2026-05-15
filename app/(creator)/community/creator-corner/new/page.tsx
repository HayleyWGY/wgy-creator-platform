'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Image as ImageIcon } from 'lucide-react'

export default function NewPostPage() {
  const router = useRouter()
  const [body, setBody]           = useState('')
  const [imageUrl, setImageUrl]   = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState('')

  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'creator-posts')

      const res  = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) setImageUrl(data.url)
      else setError('Image upload failed')
    } catch {
      setError('Image upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async () => {
    if (!body.trim()) return
    if (wordCount > 1000) { setError('Post must be 1000 words or less'); return }

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/creator-posts', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ body, imageUrl: imageUrl || null }),
      })
      if (!res.ok) throw new Error()
      router.push('/community/creator-corner')
    } catch {
      setError('Failed to post. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#222222] pb-10">

      {/* Header */}
      <div
        className="flex items-center justify-between px-5 pt-4 pb-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-[#2a2a2a]"
        >
          <ArrowLeft size={16} color="#e4dcd1" />
        </button>
        <p className="text-white font-montserrat font-semibold text-sm">New Post</p>
        <button
          onClick={handleSubmit}
          disabled={!body.trim() || wordCount > 1000 || submitting}
          className="text-[#e4dcd1] font-montserrat font-semibold text-sm disabled:opacity-40 transition-opacity"
        >
          {submitting ? 'Posting...' : 'Post'}
        </button>
      </div>

      <div className="px-5 pt-4">
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Share something with the WGY community..."
          className="w-full bg-transparent text-white font-montserrat text-[14px] leading-relaxed focus:outline-none resize-none"
          style={{ color: '#ffffff', minHeight: '200px' }}
          rows={10}
          autoFocus
        />

        <p className={`text-right text-[11px] font-montserrat mt-2 ${
          wordCount > 1000 ? 'text-red-400' : wordCount > 900 ? 'text-[#9b7e56]' : 'text-[#706b6b]'
        }`}>
          {wordCount} / 1000 words
        </p>

        {imageUrl && (
          <div className="mt-4 relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="Post image" className="w-full rounded-xl object-cover max-h-64" />
            <button
              onClick={() => setImageUrl('')}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {!imageUrl && (
          <div className="mt-4">
            <label className="flex items-center gap-2 text-[#706b6b] font-montserrat text-sm cursor-pointer hover:text-[#e4dcd1] transition-colors">
              <ImageIcon size={18} />
              {uploading ? 'Uploading...' : 'Add image'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={uploading}
              />
            </label>
          </div>
        )}

        {error && (
          <p className="text-red-400 font-montserrat text-[12px] mt-3">{error}</p>
        )}
      </div>
    </div>
  )
}
