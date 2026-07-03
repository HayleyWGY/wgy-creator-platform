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
  const style: React.CSSProperties = isActive
    ? { background: 'var(--success-bg)', color: 'var(--success)' }
    : isCancelled
    ? { background: 'var(--error-bg)', color: 'var(--error)' }
    : { background: 'var(--surface-2)', color: 'var(--text-muted)' }
  return (
    <span
      className="font-montserrat uppercase"
      style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', padding: '4px 12px', borderRadius: 'var(--radius-pill)', ...style }}
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
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div className="w-6 h-6 rounded-full animate-spin" style={{ border: '2px solid var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  const isPaid = profile?.membershipType === 'paid'
  const isActive = profile?.membershipStatus === 'active'
  const joinedDate = profile?.joinedAt ? new Date(profile.joinedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => router.back()}
          style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          aria-label="Back"
        >
          <ArrowLeft size={16} style={{ color: 'var(--accent)' }} />
        </button>
        <p className="font-montserrat" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Membership</p>
      </div>

      <div className="px-5 pt-6">
        {/* Current plan card */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <p className="eyebrow" style={{ marginBottom: 6 }}>Current Plan</p>
              <p className="font-montserrat" style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>
                {isPaid ? 'WGY Creator' : 'Free Member'}
              </p>
            </div>
            {profile && <StatusBadge status={profile.membershipStatus} />}
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Row label="Plan Type" value={isPaid ? 'Paid Membership' : 'Free'} />
            <Row label="Member Since" value={joinedDate} />
            {isPaid && <Row label="Billing" value="£25 / month" />}
          </div>
        </div>

        {/* Benefits */}
        {isPaid && isActive && (
          <div style={{ marginBottom: 24 }}>
            <p className="eyebrow" style={{ marginBottom: 12 }}>Your Benefits</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                'Access to all brand campaigns',
                'Creator Corner community',
                'Exclusive content & education',
                'Direct messaging with the WGY team',
                'Priority campaign consideration',
              ].map(b => (
                <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle size={16} strokeWidth={1.5} style={{ color: 'var(--success)' }} />
                  <span className="font-montserrat" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{b}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manage billing */}
        {isPaid && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p className="eyebrow" style={{ marginBottom: 4 }}>Manage</p>
            <p className="font-montserrat text-center" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              For billing support please email{' '}
              <a href="mailto:support@wegotyouagency.com?subject=Billing%20support" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                support@wegotyouagency.com
              </a>
            </p>
            <a
              href="mailto:support@wegotyouagency.com?subject=Cancel%20my%20membership"
              className="font-montserrat font-normal flex items-center justify-center"
              style={{ width: '100%', height: 40, borderRadius: 'var(--radius-pill)', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', textDecoration: 'none' }}
            >
              Cancel Membership
            </a>
          </div>
        )}

        {/* Payment failed warning */}
        {profile?.membershipStatus === 'payment_failed' && (
          <div style={{ background: 'var(--error-bg)', border: '1px solid var(--error)', borderRadius: 12, padding: 16, display: 'flex', gap: 12, alignItems: 'flex-start', marginTop: 16 }}>
            <AlertCircle size={18} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 1, color: 'var(--error)' }} />
            <div>
              <p className="font-montserrat" style={{ fontSize: 13, fontWeight: 700, color: 'var(--error)', marginBottom: 4 }}>Payment Failed</p>
              <p className="font-montserrat" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', lineHeight: 1.5 }}>
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
      <span className="font-montserrat uppercase" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-muted)' }}>{label}</span>
      <span className="font-montserrat" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{value}</span>
    </div>
  )
}
