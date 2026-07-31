import Link from 'next/link'

// Root 404 for any unmatched URL — replaces Next.js's raw default page with a
// themed one. A Server Component (no client JS needed for a static message).
export default function NotFound() {
  return (
    <div
      className="font-montserrat"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: 14,
        textAlign: 'center',
        padding: '32px 24px',
        background: 'var(--bg)',
        color: 'var(--text)',
      }}
    >
      <p
        className="font-playfair italic"
        style={{ fontSize: 40, lineHeight: 1, margin: 0, color: 'var(--accent)' }}
      >
        404
      </p>
      <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Page not found</h1>
      <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-muted)', margin: 0, maxWidth: 300 }}>
        That page doesn’t exist or may have moved.
      </p>
      <Link
        href="/home"
        style={{
          marginTop: 6,
          height: 42,
          display: 'inline-flex',
          alignItems: 'center',
          padding: '0 22px',
          background: 'var(--pill-bg)',
          color: 'var(--pill-text)',
          border: 'none',
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textDecoration: 'none',
        }}
      >
        Back to home
      </Link>
    </div>
  )
}
