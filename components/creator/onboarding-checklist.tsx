'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Circle, ChevronRight } from 'lucide-react'

interface ChecklistItems {
  photo: boolean
  socials: boolean
  address: boolean
  saidHi: boolean
  applied: boolean
}

const STEPS: { key: keyof ChecklistItems; label: string; href: string }[] = [
  { key: 'photo',   label: 'Add your photo',                   href: '/profile' },
  { key: 'socials', label: 'Add your socials',                 href: '/profile' },
  { key: 'address', label: 'Add your delivery address',        href: '/profile' },
  { key: 'saidHi',  label: 'Say hi in Group Chat',             href: '/community/group-chat' },
  { key: 'applied', label: 'Apply to your first opportunity',  href: '/opportunities' },
]

/**
 * New-member checklist — shown on Home until every item is done, then
 * disappears for good. Items tick themselves automatically from real
 * data (photo uploaded, socials saved, address on file, first group-chat
 * message, first Apply tap) — nothing to administer.
 */
export function OnboardingChecklist() {
  const router = useRouter()
  const [items, setItems] = useState<ChecklistItems | null>(null)
  const [complete, setComplete] = useState(true) // assume done until we know — avoids flash

  useEffect(() => {
    fetch('/api/profile/checklist')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d) return
        setItems(d.items)
        setComplete(d.complete)
      })
      .catch(() => {})
  }, [])

  if (complete || !items) return null

  const doneCount = Object.values(items).filter(Boolean).length

  return (
    <div className="mx-5 mt-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: '18px 18px 10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <p className="eyebrow" style={{ margin: 0 }}>Getting started</p>
        <span className="font-montserrat" style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
          {doneCount} of {STEPS.length}
        </span>
      </div>
      <p className="font-montserrat" style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', margin: '0 0 10px' }}>
        Welcome to <em className="font-accent" style={{ fontWeight: 500 }}>WGY</em>
      </p>

      {/* Progress bar */}
      <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden', marginBottom: 6 }}>
        <div style={{ height: '100%', width: `${(doneCount / STEPS.length) * 100}%`, background: 'var(--accent)', borderRadius: 999, transition: 'width .3s ease' }} />
      </div>

      {STEPS.map(step => {
        const done = items[step.key]
        return (
          <button
            key={step.key}
            onClick={() => { if (!done) router.push(step.href) }}
            className="w-full flex items-center gap-3 text-left"
            style={{ padding: '11px 0', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: done ? 'default' : 'pointer' }}
          >
            {done ? (
              <CheckCircle2 size={18} strokeWidth={2} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            ) : (
              <Circle size={18} strokeWidth={1.5} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            )}
            <span
              className="font-montserrat flex-1"
              style={{ fontSize: 13, fontWeight: done ? 500 : 600, color: done ? 'var(--text-muted)' : 'var(--text)', textDecoration: done ? 'line-through' : 'none' }}
            >
              {step.label}
            </span>
            {!done && <ChevronRight size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
          </button>
        )
      })}
      <div style={{ height: 4 }} />
    </div>
  )
}
