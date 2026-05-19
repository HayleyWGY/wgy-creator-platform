'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'

interface MembershipProfile {
  membershipStatus: string
  membershipType: string
  joinedAt: string
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === 'active'
  const isCancelled = status === 'cancelled'
  return (
    <span
      className="font-montserrat font-semibold uppercase"
      style={{
        fontSize: 10, letterSpacing: '0.10em', padding: '4px 12px', borderRadius: 20,
        background: isActive ? 'rgba(34,197,94,0.15)' : isCancelled ? 'rgba(239,68,68,0.15)' : 'rgba(234,179,8,0.15)',
        color: isActive ? '#4ade80' : isCancelled ? '#f87171' : '#facc15',
      }}
    >
      {status}
    </span>
  )
}

export default function MembershipPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<MembershipProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(data => {
        if (data.creator) setProfile(data.creator)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#222222' }}>
        <div className="w-6 h-6 border-2 border-[#e4dcd1] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isPaid = profile?.membershipType === 'paid'
  const isActive = profile?.membershipStatus === 'active'
  const joinedDate = profile?.joinedAt ? new Date(profile.joinedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

  return (
    <div style={{ minHeight: '100vh', background: '#222222', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={() => router.back()}
          style={{ width: 32, height: 32, borderRadius: '50%', background: '#2a2a2a', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft size={16} color="#e4dcd1" />
        </button>
        <p className="font-montserrat font-semibold text-white" style={{ fontSize: 14 }}>Membership</p>
      </div>

      <div className="px-5 pt-6">
        {/* Current plan card */}
        <div style={{ background: '#2a2a2a', borderRadius: 16, padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <p className="font-montserrat font-bold uppercase" style={{ fontSize: 10, letterSpacing: '0.12em', color: '#9b7e56', marginBottom: 6 }}>
                Current Plan
              </p>
              <p className="font-playfair italic font-normal text-white" style={{ fontSize: 22 }}>
                {isPaid ? 'WGY Creator' : 'Free Member'}
              </p>
            </div>
            {profile && <StatusBadge status={profile.membershipStatus} />}
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Row label="Plan Type" value={isPaid ? 'Paid Membership' : 'Free'} />
            <Row label="Member Since" value={joinedDate} />
            {isPaid && <Row label="Billing" value="£25 / month" />}
          </div>
        </div>

        {/* Benefits */}
        {isPaid && isActive && (
          <div style={{ marginBottom: 24 }}>
            <p className="font-montserrat font-bold uppercase mb-3" style={{ fontSize: 10, letterSpacing: '0.12em', color: '#706b6b' }}>
              Your Benefits
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                'Access to all brand campaigns',
                'Creator Corner community',
                'Exclusive content & education',
                'Direct messaging with the WGY team',
                'Priority campaign consideration',
              ].map(b => (
                <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle size={16} color="#4ade80" strokeWidth={1.5} />
                  <span className="font-montserrat font-normal text-white" style={{ fontSize: 13 }}>{b}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manage billing */}
        {isPaid && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p className="font-montserrat font-bold uppercase mb-1" style={{ fontSize: 10, letterSpacing: '0.12em', color: '#706b6b' }}>
              Manage
            </p>
            <button
              className="font-montserrat font-semibold"
              style={{ width: '100%', height: 48, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e4dcd1', fontSize: 13, cursor: 'pointer' }}
              onClick={() => window.open('https://billing.stripe.com/p/login', '_blank')}
            >
              Manage Billing & Invoices
            </button>
            <button
              className="font-montserrat font-normal"
              style={{ width: '100%', height: 40, borderRadius: 8, background: 'none', border: 'none', color: '#706b6b', fontSize: 12, cursor: 'pointer' }}
            >
              Cancel Membership
            </button>
          </div>
        )}

        {/* Payment failed warning */}
        {profile?.membershipStatus === 'payment_failed' && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: 16, display: 'flex', gap: 12, alignItems: 'flex-start', marginTop: 16 }}>
            <AlertCircle size={18} color="#f87171" strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p className="font-montserrat font-semibold" style={{ fontSize: 13, color: '#f87171', marginBottom: 4 }}>Payment Failed</p>
              <p className="font-montserrat font-normal" style={{ fontSize: 12, color: '#c8c3bc', lineHeight: 1.5 }}>
                We were unable to process your last payment. Please update your billing details to keep your membership active.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span className="font-montserrat font-normal uppercase" style={{ fontSize: 11, letterSpacing: '0.08em', color: '#706b6b' }}>{label}</span>
      <span className="font-montserrat font-normal text-white" style={{ fontSize: 13 }}>{value}</span>
    </div>
  )
}
