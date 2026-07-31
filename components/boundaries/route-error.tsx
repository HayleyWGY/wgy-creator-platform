'use client'

// Shared route-level error UI. Each error.tsx is a thin wrapper around this so
// every boundary looks the same and reports the same way. Distinct from
// app/global-error.tsx, which replaces the ENTIRE document (including <html>)
// and only fires when the root layout itself crashes — this one renders inside
// the surviving layout, so the member keeps their chrome and context.
import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import Link from 'next/link'

export function RouteError({
  error,
  reset,
  homeHref = '/home',
  homeLabel = 'Back to home',
}: {
  error: Error & { digest?: string }
  reset: () => void
  homeHref?: string
  homeLabel?: string
}) {
  useEffect(() => {
    // Same reporting path as the global boundary, so nothing is now swallowed
    // silently just because it was caught closer to the source.
    Sentry.captureException(error)
  }, [error])

  return (
    <div
      className="font-montserrat"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: 14,
        textAlign: 'center',
        padding: '32px 24px',
        color: 'var(--text)',
      }}
    >
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Something went wrong</h2>
      <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-muted)', margin: 0, maxWidth: 300 }}>
        Sorry about that — the team has been notified automatically. You can try again, or head back.
      </p>
      <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => reset()}
          style={{
            height: 42,
            padding: '0 22px',
            background: 'var(--pill-bg)',
            color: 'var(--pill-text)',
            border: 'none',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.04em',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
        <Link
          href={homeHref}
          style={{
            height: 42,
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0 22px',
            background: 'transparent',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-strong)',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textDecoration: 'none',
          }}
        >
          {homeLabel}
        </Link>
      </div>
    </div>
  )
}
