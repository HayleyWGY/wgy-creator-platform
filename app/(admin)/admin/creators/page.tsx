'use client'

import { useCallback, useEffect, useState } from 'react'
import { Search, X, MessageSquare } from 'lucide-react'

interface Tag {
  id: string
  name: string
  colour: string
}

interface Creator {
  id: string
  firstName: string
  lastName: string
  email: string
  profileImageUrl: string | null
  membershipStatus: string
  membershipType: string
  joinedAt: string
  lastSeenAt: string
  instagramHandle: string | null
  tiktokHandle: string | null
  youtubeUrl: string | null
  tags: { tag: Tag }[]
}

interface CreatorDetail extends Creator {
  bio: string | null
  contentNiches: string[]
  stripeCustomerId: string | null
  stripeSubId: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  postcode: string | null
  country: string | null
  dateOfBirth: string | null
  address: string | null
  contactNumber: string | null
  gender: string | null
  age: number | null
}

function getAge(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function formatJoined(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

function StatusPill({ status }: { status: string }) {
  if (status === 'active') {
    return (
      <span className="font-montserrat font-semibold uppercase" style={{ fontSize: 9, letterSpacing: '0.10em', background: 'var(--accent)', color: 'var(--bg)', padding: '3px 10px', borderRadius: 20 }}>
        Active
      </span>
    )
  }
  if (status === 'free') {
    return (
      <span className="font-montserrat font-semibold uppercase" style={{ fontSize: 9, letterSpacing: '0.10em', background: 'rgba(228,220,209,0.15)', color: 'var(--accent)', padding: '3px 10px', borderRadius: 20 }}>
        Free
      </span>
    )
  }
  if (status === 'payment_failed') {
    return (
      <span className="font-montserrat font-semibold uppercase" style={{ fontSize: 9, letterSpacing: '0.10em', background: 'rgba(192,57,43,0.15)', color: '#C0392B', padding: '3px 10px', borderRadius: 20 }}>
        Failed
      </span>
    )
  }
  return (
    <span className="font-montserrat font-semibold uppercase" style={{ fontSize: 9, letterSpacing: '0.10em', background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)', padding: '3px 10px', borderRadius: 20 }}>
      {status}
    </span>
  )
}

function CreatorAvatar({ creator, size = 32 }: { creator: Creator; size?: number }) {
  const initials = `${creator.firstName[0]}${creator.lastName[0]}`
  if (creator.profileImageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={creator.profileImageUrl} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    )
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span className="font-montserrat font-bold" style={{ fontSize: size * 0.3, color: 'var(--bg)' }}>{initials}</span>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
      <span className="font-montserrat font-normal uppercase" style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--text-muted)', flexShrink: 0 }}>
        {label}
      </span>
      <span className="font-montserrat font-normal" style={{ fontSize: 13, color: value ? 'var(--text)' : 'var(--surface-2)', textAlign: 'right' }}>
        {value || 'Not provided'}
      </span>
    </div>
  )
}

function CreatorPanel({ creatorId, onClose }: { creatorId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<CreatorDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingEmail, setEditingEmail] = useState(false)
  const [emailValue, setEmailValue] = useState('')
  const [emailError, setEmailError] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [reinstateForm, setReinstateForm] = useState({ email: '', firstName: '', lastName: '' })
  const [reinstateResult, setReinstateResult] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function loadDetail() {
    fetch(`/api/admin/creators/${creatorId}`)
      .then(r => r.json())
      .then(data => {
        setDetail(data.creator)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    loadDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creatorId])

  async function saveEmail() {
    if (busy || !emailValue.trim()) return
    setBusy(true)
    setEmailError('')
    try {
      const res = await fetch(`/api/admin/creators/${creatorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailValue }),
      })
      const data = await res.json()
      if (!res.ok) {
        setEmailError(data.error || 'Failed to update email')
        return
      }
      setEditingEmail(false)
      loadDetail()
    } finally {
      setBusy(false)
    }
  }

  async function addTag() {
    const name = tagInput.trim()
    if (!name || busy) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/creators/${creatorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addTagName: name }),
      })
      if (res.ok) {
        setTagInput('')
        loadDetail()
      }
    } finally {
      setBusy(false)
    }
  }

  async function removeTag(tagId: string) {
    if (busy) return
    setBusy(true)
    try {
      await fetch(`/api/admin/creators/${creatorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ removeTagId: tagId }),
      })
      loadDetail()
    } finally {
      setBusy(false)
    }
  }

  async function reinstate() {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/creators/${creatorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reinstate: reinstateForm }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Failed to reinstate account')
        return
      }
      setReinstateResult(data.tempPassword)
      loadDetail()
    } finally {
      setBusy(false)
    }
  }

  const isDeletedAccount = detail?.email?.startsWith('deleted-') && detail?.email?.endsWith('@deleted.wegotyouagency.com')

  const fullAddress = detail
    ? [detail.addressLine1, detail.addressLine2, detail.city, detail.postcode, detail.country].filter(Boolean).join(', ') || null
    : null

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 49 }} />
      <div style={{ position: 'fixed', right: 0, top: 0, width: 480, height: '100vh', background: 'var(--surface)', borderLeft: '1px solid rgba(255,255,255,0.08)', zIndex: 50, overflowY: 'auto', padding: 24 }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <X size={18} color="var(--text-muted)" strokeWidth={1.5} />
        </button>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
            <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : detail ? (
          <>
            <p className="font-montserrat font-bold uppercase" style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--accent)' }}>
              Creator Profile
            </p>
            <h2 className="admin-title" style={{ fontSize: 24, marginTop: 8 }}>
              {detail.firstName} {detail.lastName}
            </h2>

            <div style={{ marginTop: 20, display: 'flex', gap: 16, alignItems: 'center' }}>
              <CreatorAvatar creator={detail} size={56} />
              <div style={{ flex: 1, minWidth: 0 }}>
                {editingEmail ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      value={emailValue}
                      onChange={e => setEmailValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEmail() }}
                      style={{ flex: 1, minWidth: 160, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', color: 'var(--text)', fontSize: 12, fontFamily: 'Montserrat, sans-serif', outline: 'none' }}
                    />
                    <button onClick={saveEmail} disabled={busy} className="font-montserrat font-semibold" style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>Save</button>
                    <button onClick={() => { setEditingEmail(false); setEmailError('') }} className="font-montserrat" style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                  </div>
                ) : (
                  <p className="font-montserrat font-normal" style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{detail.email}</span>
                    <button
                      onClick={() => { setEmailValue(detail.email); setEditingEmail(true) }}
                      className="font-montserrat font-semibold"
                      style={{ fontSize: 10, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}
                    >
                      Edit
                    </button>
                  </p>
                )}
                {emailError && (
                  <p className="font-montserrat" style={{ fontSize: 11, color: '#C0392B', marginTop: 4 }}>{emailError}</p>
                )}
                <p className="font-montserrat font-normal" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Joined {formatJoined(detail.joinedAt)}</p>
                <p className="font-montserrat font-normal" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Last seen: {getAge(detail.lastSeenAt)}</p>
              </div>
              <StatusPill status={detail.membershipStatus} />
            </div>

            {detail.bio && (
              <p className="font-montserrat font-normal" style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 14 }}>
                {detail.bio}
              </p>
            )}

            {/* Content niches */}
            {detail.contentNiches?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <p className="font-montserrat font-bold uppercase" style={{ fontSize: 10, letterSpacing: '0.10em', color: '#9b7e56', marginBottom: 8 }}>Content Niches</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {detail.contentNiches.map(n => (
                    <span key={n} className="font-montserrat font-semibold uppercase" style={{ fontSize: 9, letterSpacing: '0.08em', background: 'rgba(228,220,209,0.12)', color: 'var(--accent)', padding: '3px 10px', borderRadius: 20 }}>
                      {n}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Detail rows */}
            <div style={{ marginTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <DetailRow label="Membership" value={`${detail.membershipType === 'paid' ? 'Paid · £25/month' : 'Free'}${detail.membershipStatus !== 'active' ? ` (${detail.membershipStatus})` : ''}`} />
              <DetailRow label="Instagram" value={detail.instagramHandle} />
              <DetailRow label="TikTok" value={detail.tiktokHandle} />
              <DetailRow label="YouTube" value={detail.youtubeUrl} />
              <DetailRow label="Location" value={fullAddress} />
            </div>

            {/* Sensitive section */}
            <div style={{ marginTop: 20 }}>
              <p className="font-montserrat font-bold uppercase" style={{ fontSize: 10, letterSpacing: '0.10em', color: '#9b7e56', marginBottom: 4 }}>
                Sensitive (Admin Only)
              </p>
              <div style={{ borderTop: '1px solid rgba(155,126,86,0.2)' }}>
                <DetailRow
                  label="Date of Birth"
                  value={detail.dateOfBirth
                    ? `${new Date(detail.dateOfBirth).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}${detail.age !== null ? ` (${detail.age})` : ''}`
                    : null}
                />
                <DetailRow label="Gender" value={detail.gender} />
                <DetailRow label="Contact Number" value={detail.contactNumber} />
                <DetailRow label="Delivery Address" value={detail.address} />
              </div>
            </div>

            {/* Campaign tags — creators see these as "My Collabs" */}
            <div style={{ marginTop: 20 }}>
              <p className="font-montserrat font-bold uppercase" style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--accent)', marginBottom: 10 }}>
                Campaign Tags
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {detail.tags.length === 0 && (
                  <span className="font-montserrat font-normal" style={{ fontSize: 12, color: 'var(--text-muted)' }}>No tags yet</span>
                )}
                {detail.tags.map(({ tag }) => (
                  <span
                    key={tag.id}
                    className="font-montserrat font-semibold uppercase"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, letterSpacing: '0.06em', background: tag.colour + '22', color: tag.colour, padding: '4px 10px', borderRadius: 20, border: `1px solid ${tag.colour}44` }}
                  >
                    {tag.name}
                    <button
                      onClick={() => removeTag(tag.id)}
                      aria-label={`Remove ${tag.name}`}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'inherit', opacity: 0.7 }}
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addTag() }}
                  placeholder="Add tag (e.g. brand name)…"
                  style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', color: 'var(--text)', fontSize: 12, fontFamily: 'Montserrat, sans-serif', outline: 'none' }}
                />
                <button
                  onClick={addTag}
                  disabled={busy || !tagInput.trim()}
                  className="font-montserrat font-semibold"
                  style={{ fontSize: 11, color: 'var(--pill-text)', background: 'var(--pill-bg)', border: 'none', borderRadius: 6, padding: '0 14px', cursor: 'pointer', opacity: !tagInput.trim() ? 0.5 : 1 }}
                >
                  Add
                </button>
              </div>
            </div>

            {/* Reinstate deleted account */}
            {isDeletedAccount && (
              <div style={{ marginTop: 20, background: 'rgba(228,220,209,0.06)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
                <p className="font-montserrat font-bold uppercase" style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--accent)', marginBottom: 6 }}>
                  Reinstate Deleted Account
                </p>
                <p className="font-montserrat" style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 12 }}>
                  This account was deleted by the creator — personal details were erased and cannot be recovered.
                  Re-enter their email and name to reactivate; a temporary password will be generated for you to pass on.
                </p>
                {reinstateResult ? (
                  <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 12 }}>
                    <p className="font-montserrat font-semibold" style={{ fontSize: 12, color: 'var(--text)' }}>Account reinstated ✓</p>
                    <p className="font-montserrat" style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                      Temporary password (share securely — shown once):
                    </p>
                    <p className="font-montserrat font-bold" style={{ fontSize: 14, color: 'var(--accent)', marginTop: 4, userSelect: 'all' }}>{reinstateResult}</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input
                      value={reinstateForm.email}
                      onChange={e => setReinstateForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="Email"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', color: 'var(--text)', fontSize: 12, fontFamily: 'Montserrat, sans-serif', outline: 'none' }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        value={reinstateForm.firstName}
                        onChange={e => setReinstateForm(p => ({ ...p, firstName: e.target.value }))}
                        placeholder="First name"
                        style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', color: 'var(--text)', fontSize: 12, fontFamily: 'Montserrat, sans-serif', outline: 'none' }}
                      />
                      <input
                        value={reinstateForm.lastName}
                        onChange={e => setReinstateForm(p => ({ ...p, lastName: e.target.value }))}
                        placeholder="Last name"
                        style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', color: 'var(--text)', fontSize: 12, fontFamily: 'Montserrat, sans-serif', outline: 'none' }}
                      />
                    </div>
                    <button
                      onClick={reinstate}
                      disabled={busy || !reinstateForm.email.trim() || !reinstateForm.firstName.trim() || !reinstateForm.lastName.trim()}
                      className="font-montserrat font-semibold"
                      style={{ height: 36, background: 'var(--pill-bg)', color: 'var(--pill-text)', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', opacity: (!reinstateForm.email.trim() || !reinstateForm.firstName.trim() || !reinstateForm.lastName.trim()) ? 0.5 : 1 }}
                    >
                      {busy ? 'Reinstating…' : 'Reinstate Account'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div style={{ marginTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="font-montserrat font-semibold" style={{ width: '100%', height: 40, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'var(--accent)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <MessageSquare size={15} strokeWidth={1.5} />
                Send Direct Message
              </button>
              <button className="font-montserrat font-semibold" style={{ width: '100%', height: 40, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'var(--accent)', fontSize: 12, cursor: 'pointer' }}>
                Send to Mass DM List
              </button>
              <button className="font-montserrat font-semibold" style={{ width: '100%', height: 40, background: 'rgba(192,57,43,0.1)', border: 'none', borderRadius: 8, color: '#C0392B', fontSize: 12, cursor: 'pointer' }}>
                Suspend Account
              </button>
            </div>
          </>
        ) : (
          <p className="font-montserrat font-normal" style={{ color: 'var(--text-muted)', fontSize: 13 }}>Could not load creator details.</p>
        )}
      </div>
    </>
  )
}

export default function CreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [panelCreatorId, setPanelCreatorId] = useState<string | null>(null)

  const fetchCreators = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (search) params.set('q', search)
    if (status) params.set('status', status)
    try {
      const res = await fetch(`/api/admin/creators?${params}`)
      const data = await res.json()
      setCreators(data.creators || [])
      setTotal(data.total || 0)
    } finally {
      setLoading(false)
    }
  }, [page, search, status])

  useEffect(() => { fetchCreators() }, [fetchCreators])

  const pageSize = 20
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div>
      {/* Header */}
      <div style={{ padding: '32px 32px 24px' }}>
        <p className="font-montserrat font-bold uppercase" style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--text-muted)' }}>Creators</p>
        <h1 className="admin-title" style={{ fontSize: 32, marginTop: 4 }}>Creator Management</h1>
      </div>

      {/* Action row */}
      <div style={{ padding: '0 32px 20px', display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search creators..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="font-montserrat font-normal"
            style={{ width: '100%', height: 44, background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, paddingLeft: 36, paddingRight: 16, color: 'var(--text)', fontSize: 13, outline: 'none', caretColor: 'var(--accent)' }}
          />
        </div>
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1) }}
          className="font-montserrat font-normal"
          style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '0 14px', height: 44, color: status ? 'var(--accent)' : 'var(--text-muted)', fontSize: 13, outline: 'none', cursor: 'pointer' }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="free">Free</option>
          <option value="payment_failed">Payment Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ padding: '0 32px 32px' }}>
        <div style={{ background: 'var(--surface)', borderRadius: 12, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ background: 'var(--surface)', padding: '12px 20px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr 1fr', gap: 12 }}>
            {['Name', 'Status', 'Joined', 'Tags', 'Actions'].map(col => (
              <span key={col} className="font-montserrat font-bold uppercase" style={{ fontSize: 10, letterSpacing: '0.10em', color: 'var(--text-muted)' }}>{col}</span>
            ))}
          </div>

          {loading && (
            <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
              <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && creators.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <p className="font-montserrat font-normal" style={{ color: 'var(--text-muted)', fontSize: 13 }}>No creators found</p>
            </div>
          )}

          {!loading && creators.map((creator, i) => (
            <div
              key={creator.id}
              style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr 1fr', gap: 12, alignItems: 'center', borderBottom: i < creators.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', cursor: 'default' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
            >
              {/* Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CreatorAvatar creator={creator} size={32} />
                <div>
                  <p className="font-montserrat font-medium" style={{ fontSize: 13, color: 'var(--text)' }}>{creator.firstName} {creator.lastName}</p>
                  <p className="font-montserrat font-normal" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{creator.email}</p>
                </div>
              </div>

              <StatusPill status={creator.membershipStatus} />

              <p className="font-montserrat font-normal" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatJoined(creator.joinedAt)}</p>

              {/* Tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {creator.tags.slice(0, 2).map(({ tag }) => (
                  <span
                    key={tag.id}
                    className="font-montserrat font-semibold uppercase"
                    style={{ fontSize: 9, letterSpacing: '0.08em', background: tag.colour + '22', color: tag.colour, padding: '3px 8px', borderRadius: 20, border: `1px solid ${tag.colour}44` }}
                  >
                    {tag.name}
                  </span>
                ))}
                {creator.tags.length > 2 && (
                  <span className="font-montserrat font-normal" style={{ fontSize: 9, color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.1)', padding: '3px 8px', borderRadius: 20 }}>
                    +{creator.tags.length - 2}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setPanelCreatorId(creator.id)}
                  className="font-montserrat font-semibold"
                  style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  View
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
          <p className="font-montserrat font-normal" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {loading ? '...' : `Showing ${((page - 1) * pageSize) + 1}–${Math.min(page * pageSize, total)} of ${total} creators`}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="font-montserrat font-normal"
              style={{ fontSize: 12, color: page === 1 ? 'var(--surface-2)' : 'var(--text-muted)', background: 'none', border: 'none', cursor: page === 1 ? 'default' : 'pointer' }}
            >
              ← Previous
            </button>
            <span className="font-montserrat font-semibold" style={{ fontSize: 12, color: 'var(--accent)', background: 'rgba(228,220,209,0.1)', padding: '4px 10px', borderRadius: 6 }}>
              {page}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="font-montserrat font-normal"
              style={{ fontSize: 12, color: page >= totalPages ? 'var(--surface-2)' : 'var(--text-muted)', background: 'none', border: 'none', cursor: page >= totalPages ? 'default' : 'pointer' }}
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {panelCreatorId && (
        <CreatorPanel creatorId={panelCreatorId} onClose={() => setPanelCreatorId(null)} />
      )}

      <style>{`input::placeholder { color: var(--text-muted); } select option { background: var(--surface); }`}</style>
    </div>
  )
}
