'use client'

// Where Stripe redirects the creator after they update their payment method in
// the Customer Portal. Confirms success in WGY brand style, then sends them
// home after 4s. Tokenised (var(--*)) so it honours light/dark theme rather
// than hardcoding hex.
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'

export default function PaymentUpdatedPage() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => router.push('/home'), 4000)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 24px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'var(--success-bg)',
          border: '1px solid var(--success)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
        }}
      >
        <CheckCircle size={32} style={{ color: 'var(--success)' }} />
      </div>

      <p
        className="font-playfair italic"
        style={{ color: 'var(--text)', fontWeight: 400, fontSize: 26, margin: '0 0 12px' }}
      >
        Payment details updated
      </p>

      <p
        className="font-montserrat"
        style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, margin: '0 0 8px', maxWidth: 300 }}
      >
        Your payment information has been updated successfully. Any outstanding
        payments will be retried automatically by Stripe.
      </p>

      <p
        className="font-montserrat"
        style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 0 32px', opacity: 0.7 }}
      >
        Redirecting you home in a moment…
      </p>

      <button
        onClick={() => router.push('/home')}
        className="font-montserrat"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--accent)',
          fontWeight: 600,
          fontSize: 13,
          cursor: 'pointer',
          textDecoration: 'underline',
        }}
      >
        Go to home now
      </button>
    </div>
  )
}
