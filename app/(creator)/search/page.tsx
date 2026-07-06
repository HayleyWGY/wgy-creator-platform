'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Search as SearchIcon, Briefcase, BookOpen } from 'lucide-react'
import { CONTENT_TYPE_LABEL } from '@/lib/constants'

interface CampaignHit {
  id: string
  slug: string
  title: string
  brandName: string | null
  campaignType: string | null
}

interface ContentHit {
  id: string
  title: string
  contentType: string
  section?: string
}

export default function SearchPage() {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [campaigns, setCampaigns] = useState<CampaignHit[]>([])
  const [content, setContent] = useState<ContentHit[]>([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  // Debounced search
  useEffect(() => {
    if (q.trim().length < 2) {
      setCampaigns([])
      setContent([])
      return
    }
    setSearching(true)
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q.trim())}`)
        .then(r => (r.ok ? r.json() : { campaigns: [], content: [] }))
        .then(d => {
          setCampaigns(d.campaigns || [])
          setContent(d.content || [])
        })
        .catch(() => {})
        .finally(() => setSearching(false))
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  const hasQuery = q.trim().length >= 2
  const noResults = hasQuery && !searching && campaigns.length === 0 && content.length === 0

  return (
    <div className="min-h-screen pb-20" style={{ background: 'var(--bg)' }}>
      {/* Header with input */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          aria-label="Back"
        >
          <ArrowLeft size={16} style={{ color: 'var(--accent)' }} />
        </button>
        <div className="flex-1 relative flex items-center">
          <SearchIcon size={15} className="absolute left-4" style={{ pointerEvents: 'none', color: 'var(--text-muted)' }} />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search drops and resources..."
            className="w-full font-montserrat outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: '10px 16px 10px 42px', color: 'var(--text)', fontSize: 14, fontWeight: 500, caretColor: 'var(--accent)' }}
          />
        </div>
      </div>

      <div className="px-5 pt-5">
        {!hasQuery && (
          <p className="font-montserrat text-center" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', paddingTop: 40 }}>
            Search opportunities and the Learning Lounge
          </p>
        )}

        {noResults && (
          <p className="font-montserrat text-center" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', paddingTop: 40 }}>
            No results for &ldquo;{q.trim()}&rdquo;
          </p>
        )}

        {campaigns.length > 0 && (
          <div className="mb-6">
            <p className="eyebrow" style={{ marginBottom: 10 }}>Opportunities</p>
            <div className="flex flex-col gap-2">
              {campaigns.map(c => (
                <Link
                  key={c.id}
                  href={`/opportunities/${c.slug}`}
                  className="flex items-center gap-3 p-3"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, textDecoration: 'none' }}
                >
                  <Briefcase size={16} strokeWidth={1.5} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <div className="min-w-0">
                    <p className="font-montserrat truncate" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{c.title}</p>
                    {c.brandName && (
                      <p className="font-montserrat" style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', margin: 0 }}>{c.brandName}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {content.length > 0 && (
          <div className="mb-6">
            <p className="eyebrow" style={{ marginBottom: 10 }}>Resources</p>
            <div className="flex flex-col gap-2">
              {content.map(item => (
                <Link
                  key={item.id}
                  href={["about", "faq", "updates"].includes(item.section ?? "") ? `/about/${item.id}` : `/learn/${item.id}`}
                  className="flex items-center gap-3 p-3"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, textDecoration: 'none' }}
                >
                  <BookOpen size={16} strokeWidth={1.5} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <div className="min-w-0">
                    <p className="font-montserrat truncate" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{item.title}</p>
                    <p className="font-montserrat" style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', margin: 0 }}>
                      {CONTENT_TYPE_LABEL[item.contentType] ?? item.contentType.replace(/_/g, ' ')}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
