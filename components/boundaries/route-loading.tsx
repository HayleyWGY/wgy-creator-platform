// Shared loading skeleton for route-level loading.tsx files. Server component
// (no 'use client') — it is pure markup shown via Suspense during navigation,
// so a slow segment paints an instant themed skeleton instead of a blank
// screen. Most pages here are client-fetched, so this covers the gap between
// navigation and the client component's first paint on slow mobile.

function Bar({ w, h = 14 }: { w: string | number; h?: number }) {
  return (
    <div
      className="wgy-skeleton"
      style={{ width: w, height: h, borderRadius: 6, background: 'var(--surface-2)' }}
    />
  )
}

export function RouteLoading({ rows = 5 }: { rows?: number }) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}
    >
      <Bar w="45%" h={22} />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div
            style={{
              height: 120,
              borderRadius: 12,
              background: 'linear-gradient(120deg, var(--img-a), var(--img-b))',
            }}
          />
          <Bar w="70%" />
          <Bar w="40%" h={12} />
        </div>
      ))}
    </div>
  )
}
