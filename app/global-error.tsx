'use client'

// Catches otherwise-fatal client render crashes (blank screen for a member),
// reports them to Sentry, and shows a friendly fallback instead.
import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16, fontFamily: 'system-ui, sans-serif', background: '#111', color: '#e4dcd1', textAlign: 'center', padding: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Something went wrong</h2>
        <p style={{ fontSize: 14, color: '#9b8f80', margin: 0, maxWidth: 340, lineHeight: 1.5 }}>
          Sorry about that — the team has been notified. Please try again.
        </p>
        <button
          onClick={() => reset()}
          style={{ marginTop: 8, height: 44, padding: '0 24px', background: '#e4dcd1', color: '#111', border: 'none', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
