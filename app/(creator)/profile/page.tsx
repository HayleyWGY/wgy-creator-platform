'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Camera, X, Plus } from 'lucide-react'
import { WgyButton } from '@/components/ui/wgy-button'
import { ThemeToggle } from '@/components/ui/theme-toggle'

interface CreatorProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  bio: string | null
  profileImageUrl: string | null
  instagramHandle: string | null
  tiktokHandle: string | null
  youtubeUrl: string | null
  contentNiches: string[]
  membershipStatus: string
  membershipType: string
  joinedAt: string
  lastSeenAt: string
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  postcode: string | null
  country: string | null
}

interface SensitiveProfile {
  dateOfBirth: string | null
  address: string | null
  contactNumber: string | null
  gender: string | null
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="var(--accent)" stroke="none" />
    </svg>
  )
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="var(--accent)">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.19 8.19 0 0 0 4.79 1.52V6.75a4.85 4.85 0 0 1-1.02-.06z" />
    </svg>
  )
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="var(--accent)">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.54C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
      <polygon fill="var(--bg)" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" />
    </svg>
  )
}

function Avatar({ profile, size = 88 }: { profile: CreatorProfile; size?: number }) {
  if (profile.profileImageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.profileImageUrl}
        alt=""
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent)' }}
      />
    )
  }
  const initials = `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: 'var(--surface)',
      border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span className="font-montserrat font-semibold" style={{ fontSize: size * 0.23, color: 'var(--text)' }}>
        {initials}
      </span>
    </div>
  )
}

const NICHE_OPTIONS = [
  'Beauty', 'Fashion', 'Lifestyle', 'Fitness', 'Food', 'Travel',
  'Wellness', 'Parenting', 'Tech', 'Gaming', 'Music', 'Art',
  'Finance', 'Sustainability', 'Pets', 'Home & Interiors',
]

const GENDER_OPTIONS = ['Female', 'Male', 'Non-binary', 'Prefer not to say', 'Other']

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<CreatorProfile | null>(null)
  const [sensitive, setSensitive] = useState<SensitiveProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Edit form state
  const [form, setForm] = useState({
    firstName: '', lastName: '', bio: '',
    instagramHandle: '', tiktokHandle: '', youtubeUrl: '',
    contentNiches: [] as string[],
    addressLine1: '', addressLine2: '', city: '', postcode: '', country: '',
    dateOfBirth: '', address: '', contactNumber: '', gender: '',
  })
  const [nicheInput, setNicheInput] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/profile').then(r => r.json()),
      fetch('/api/profile/sensitive').then(r => r.json()),
    ]).then(([pData, sData]) => {
      if (pData.creator) setProfile(pData.creator)
      if (sData.creator) setSensitive(sData.creator)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  function openEdit() {
    if (!profile) return
    setForm({
      firstName: profile.firstName,
      lastName: profile.lastName,
      bio: profile.bio || '',
      instagramHandle: profile.instagramHandle || '',
      tiktokHandle: profile.tiktokHandle || '',
      youtubeUrl: profile.youtubeUrl || '',
      contentNiches: [...profile.contentNiches],
      addressLine1: profile.addressLine1 || '',
      addressLine2: profile.addressLine2 || '',
      city: profile.city || '',
      postcode: profile.postcode || '',
      country: profile.country || '',
      dateOfBirth: sensitive?.dateOfBirth ? sensitive.dateOfBirth.split('T')[0] : '',
      address: sensitive?.address || '',
      contactNumber: sensitive?.contactNumber || '',
      gender: sensitive?.gender || '',
    })
    setEditOpen(true)
  }

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    try {
      const { dateOfBirth, address, contactNumber, gender, ...publicFields } = form

      const [pRes, sRes] = await Promise.all([
        fetch('/api/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(publicFields),
        }),
        fetch('/api/profile/sensitive', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dateOfBirth: dateOfBirth || null, address: address || null, contactNumber: contactNumber || null, gender: gender || null }),
        }),
      ])

      const [pData, sData] = await Promise.all([pRes.json(), sRes.json()])
      if (pData.creator) setProfile(pData.creator)
      if (sData.creator) setSensitive(sData.creator)
      setEditOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/profile/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url && profile) {
        setProfile(prev => prev ? { ...prev, profileImageUrl: data.url } : prev)
      }
    } finally {
      setUploadingPhoto(false)
    }
  }

  function toggleNiche(niche: string) {
    setForm(prev => ({
      ...prev,
      contentNiches: prev.contentNiches.includes(niche)
        ? prev.contentNiches.filter(n => n !== niche)
        : [...prev.contentNiches, niche],
    }))
  }

  function addCustomNiche() {
    const val = nicheInput.trim()
    if (!val || form.contentNiches.includes(val)) return
    setForm(prev => ({ ...prev, contentNiches: [...prev.contentNiches, val] }))
    setNicheInput('')
  }

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div className="w-6 h-6 rounded-full animate-spin" style={{ border: '2px solid var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!profile) return null

  const displayName = `${profile.firstName} ${profile.lastName.charAt(0)}.`
  const locationParts = [profile.city, profile.country].filter(Boolean)
  const location = locationParts.length ? locationParts.join(', ') : null
  const joinedYear = new Date(profile.joinedAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Top profile section */}
      <div className="px-5 pt-8 pb-6 flex flex-col items-center text-center">
        {/* Avatar with upload overlay */}
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <Avatar profile={profile} size={88} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
            aria-label="Change photo"
            style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 28, height: 28, borderRadius: '50%',
              background: 'var(--pill-bg)', border: '2px solid var(--bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Camera size={13} style={{ color: 'var(--pill-text)' }} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handlePhotoUpload}
          />
        </div>

        <h1 className="font-montserrat" style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginTop: 12 }}>
          {displayName}
        </h1>

        <div className="mt-2">
          <span
            className="font-montserrat uppercase"
            style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', background: 'var(--beige)', color: '#111111', padding: '4px 10px', borderRadius: 'var(--radius-pill)' }}
          >
            WGY Creator
          </span>
        </div>

        {profile.bio && (
          <p className="font-montserrat mt-3" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 280 }}>
            {profile.bio}
          </p>
        )}

        {/* Social icons */}
        <div className="flex items-center mt-4" style={{ gap: 20 }}>
          {profile.instagramHandle && (
            <a href={`https://instagram.com/${profile.instagramHandle.replace('@', '')}`} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <InstagramIcon />
            </a>
          )}
          {profile.tiktokHandle && (
            <a href={`https://tiktok.com/${profile.tiktokHandle.replace('@', '')}`} target="_blank" rel="noopener noreferrer" aria-label="TikTok">
              <TikTokIcon />
            </a>
          )}
          {profile.youtubeUrl && (
            <a href={profile.youtubeUrl} target="_blank" rel="noopener noreferrer" aria-label="YouTube">
              <YouTubeIcon />
            </a>
          )}
          {!profile.instagramHandle && !profile.tiktokHandle && !profile.youtubeUrl && (
            <button onClick={openEdit} className="font-montserrat font-semibold" style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
              + Add social links
            </button>
          )}
        </div>
      </div>

      {/* Content Niches */}
      {profile.contentNiches.length > 0 && (
        <div className="px-5 mb-5">
          <p className="eyebrow" style={{ marginBottom: 12 }}>Content Niches</p>
          <div className="flex flex-wrap gap-2">
            {profile.contentNiches.map(n => (
              <span
                key={n}
                className="font-montserrat uppercase"
                style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', background: 'var(--surface-2)', color: 'var(--accent)', padding: '4px 10px', borderRadius: 'var(--radius-pill)' }}
              >
                {n}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mx-5 mb-5" style={{ height: 1, background: 'var(--border)' }} />

      {/* My Details */}
      <div className="px-5">
        <p className="eyebrow" style={{ marginBottom: 8 }}>My Details</p>
        <div>
          {[
            { label: 'Name', value: `${profile.firstName} ${profile.lastName}` },
            { label: 'Email', value: profile.email },
            ...(location ? [{ label: 'Location', value: location }] : []),
            { label: 'Member Since', value: joinedYear },
          ].map((row, i) => (
            <div key={i} className="flex flex-col py-[14px]" style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="font-montserrat uppercase mb-1" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                {row.label}
              </span>
              <span className="font-montserrat" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Appearance */}
      <div className="px-5 mt-6">
        <p className="eyebrow" style={{ marginBottom: 12 }}>Appearance</p>
        <div className="flex items-center justify-between">
          <span className="font-montserrat" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Theme</span>
          <ThemeToggle />
        </div>
      </div>

      {/* Buttons */}
      <div className="px-5 mt-8 flex flex-col gap-3">
        <WgyButton variant="secondary" fullWidth onClick={openEdit}>
          Edit Profile
        </WgyButton>
        <WgyButton variant="secondary" fullWidth onClick={() => router.push('/membership')}>
          Manage Membership
        </WgyButton>
        <button
          onClick={() => signOut({ callbackUrl: '/sign-in' })}
          className="w-full text-center font-montserrat font-normal mt-1"
          style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Sign Out
        </button>
      </div>

      {/* Edit Modal */}
      {editOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflowY: 'auto' }}>
          {/* Modal Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <p className="font-montserrat" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Edit Profile</p>
            <button onClick={() => setEditOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} aria-label="Close">
              <X size={18} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>

          <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Basic info */}
            <Section label="Basic Info">
              <Field label="First Name">
                <input value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} />
              </Field>
              <Field label="Last Name">
                <input value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} />
              </Field>
              <Field label="Bio">
                <textarea
                  value={form.bio}
                  onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                  rows={3}
                  placeholder="Tell us about yourself..."
                />
              </Field>
            </Section>

            {/* Social links */}
            <Section label="Social Links">
              <Field label="Instagram Handle">
                <input value={form.instagramHandle} onChange={e => setForm(p => ({ ...p, instagramHandle: e.target.value }))} placeholder="@handle" />
              </Field>
              <Field label="TikTok Handle">
                <input value={form.tiktokHandle} onChange={e => setForm(p => ({ ...p, tiktokHandle: e.target.value }))} placeholder="@handle" />
              </Field>
              <Field label="YouTube URL">
                <input value={form.youtubeUrl} onChange={e => setForm(p => ({ ...p, youtubeUrl: e.target.value }))} placeholder="https://youtube.com/..." />
              </Field>
            </Section>

            {/* Content niches */}
            <Section label="Content Niches">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {NICHE_OPTIONS.map(n => (
                  <button
                    key={n}
                    onClick={() => toggleNiche(n)}
                    style={{
                      padding: '5px 12px', borderRadius: 'var(--radius-pill)', fontSize: 11,
                      fontFamily: 'Montserrat, sans-serif', fontWeight: 600,
                      cursor: 'pointer', border: 'none',
                      background: form.contentNiches.includes(n) ? 'var(--pill-bg)' : 'var(--surface-2)',
                      color: form.contentNiches.includes(n) ? 'var(--pill-text)' : 'var(--text-muted)',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {/* Custom niche */}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input
                  value={nicheInput}
                  onChange={e => setNicheInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomNiche() } }}
                  placeholder="Other niche..."
                  style={{ flex: 1 }}
                />
                <button
                  onClick={addCustomNiche}
                  aria-label="Add niche"
                  style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--pill-bg)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                >
                  <Plus size={14} style={{ color: 'var(--pill-text)' }} />
                </button>
              </div>
              {/* Custom niches */}
              {form.contentNiches.filter(n => !NICHE_OPTIONS.includes(n)).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {form.contentNiches.filter(n => !NICHE_OPTIONS.includes(n)).map(n => (
                    <span key={n} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--beige)', color: '#111111', padding: '3px 10px', borderRadius: 'var(--radius-pill)', fontSize: 11, fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}>
                      {n}
                      <button onClick={() => toggleNiche(n)} aria-label={`Remove ${n}`} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                        <X size={10} color="#111111" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </Section>

            {/* Address */}
            <Section label="Address">
              <Field label="Address Line 1">
                <input value={form.addressLine1} onChange={e => setForm(p => ({ ...p, addressLine1: e.target.value }))} />
              </Field>
              <Field label="Address Line 2">
                <input value={form.addressLine2} onChange={e => setForm(p => ({ ...p, addressLine2: e.target.value }))} />
              </Field>
              <Field label="City">
                <input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
              </Field>
              <Field label="Postcode">
                <input value={form.postcode} onChange={e => setForm(p => ({ ...p, postcode: e.target.value }))} />
              </Field>
              <Field label="Country">
                <input value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} />
              </Field>
            </Section>

            {/* Personal (sensitive) */}
            <Section label="Personal Info">
              <Field label="Date of Birth">
                <input type="date" value={form.dateOfBirth} onChange={e => setForm(p => ({ ...p, dateOfBirth: e.target.value }))} />
              </Field>
              <Field label="Contact Number">
                <input type="tel" value={form.contactNumber} onChange={e => setForm(p => ({ ...p, contactNumber: e.target.value }))} />
              </Field>
              <Field label="Gender">
                <select value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}>
                  <option value="">Prefer not to say</option>
                  {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>
              <Field label="Full Address (for brand deliveries)">
                <textarea
                  value={form.address}
                  onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                  rows={2}
                  placeholder="Full delivery address..."
                />
              </Field>
            </Section>

            {/* Save */}
            <WgyButton
              variant="primary"
              fullWidth
              onClick={handleSave}
              disabled={saving}
              style={{ marginTop: 8, marginBottom: 24, opacity: saving ? 0.6 : 1, cursor: saving ? 'default' : 'pointer' }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </WgyButton>
          </div>
        </div>
      )}

      <style>{`
        input, textarea, select {
          width: 100%;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 10px 14px;
          color: var(--text);
          font-family: Montserrat, sans-serif;
          font-size: 13px;
          font-weight: 500;
          outline: none;
          resize: none;
          box-sizing: border-box;
        }
        select option { background: var(--surface); color: var(--text); }
        input::placeholder, textarea::placeholder { color: var(--text-muted); }
      `}</style>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow" style={{ marginBottom: 12 }}>{label}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-montserrat uppercase mb-1" style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
        {label}
      </p>
      {children}
    </div>
  )
}
