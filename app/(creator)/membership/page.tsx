'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle, AlertCircle, CreditCard } from 'lucide-react'

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
  // Portal button state. portalError: '' | 'no_stripe_id' | 'general'. We learn
  // whether the member has a Stripe customer only when they click (the profile
  // endpoint doesn't expose stripeCustomerId), so the button shows optimistically
  // and swaps to the contact-support message if the API says no_stripe_id.
  const [loadingPortal, setLoadingPortal] = useState(false)
  const [portalError, setPortalError] = useState<'' | 'no_stripe_id' | 'general'>('')

  const handleUpdatePayment = async () => {
    setLoadingPortal(true)
    setPortalError('')
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (data.error === 'no_stripe_id' || data.error === 'billing_unavailable') {
        setPortalError('no_stripe_id')
        return
      }
      if (!res.ok || !data.url) throw new Error('portal')
      // Hand off to Stripe's hosted portal. Our app never sees card details.
      window.location.href = data.url
    } catch {
      setPortalError('general')
    } finally {
      setLoadingPortal(false)
    }
  }

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

        {/* Update payment method — secure hand-off to Stripe's hosted portal */}
        {isPaid && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CreditCard size={16} style={{ color: 'var(--accent)' }} />
              </div>
              <p className="font-montserrat" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Payment Method</p>
            </div>
            <p className="font-montserrat" style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-muted)', margin: '0 0 16px' }}>
              Update your payment details securely through Stripe. We never store your card information.
            </p>

            {portalError === 'no_stripe_id' ? (
              <p className="font-montserrat text-center" style={{ fontSize: 13, color: 'var(--text-muted)', padding: '4px 0' }}>
                To update your payment details please contact{' '}
                <a href="mailto:support@wegotyouagency.com?subject=Update%20payment%20details" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                  support@wegotyouagency.com
                </a>
              </p>
            ) : portalError === 'general' ? (
              <>
                <p className="font-montserrat text-center" style={{ fontSize: 12, color: 'var(--error)', margin: '0 0 8px' }}>
                  Something went wrong. Please try again or contact support.
                </p>
                <button
                  onClick={handleUpdatePayment}
                  className="font-montserrat"
                  style={{ width: '100%', height: 44, background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius-pill)', color: 'var(--bg)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                >
                  Try Again
                </button>
              </>
            ) : (
              <button
                onClick={handleUpdatePayment}
                disabled={loadingPortal}
                className="font-montserrat"
                style={{ width: '100%', height: 48, background: loadingPortal ? 'var(--surface-2)' : 'var(--accent)', border: 'none', borderRadius: 'var(--radius-pill)', color: loadingPortal ? 'var(--text-muted)' : 'var(--bg)', fontWeight: 700, fontSize: 14, cursor: loadingPortal ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {loadingPortal ? (
                  <>
                    <span className="w-4 h-4 rounded-full animate-spin" style={{ border: '2px solid var(--text-muted)', borderTopColor: 'transparent' }} />
                    Connecting to Stripe…
                  </>
                ) : (
                  <>
                    <CreditCard size={16} />
                    Update Payment Method
                  </>
                )}
              </button>
            )}
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
