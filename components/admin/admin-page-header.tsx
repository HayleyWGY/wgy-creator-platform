/**
 * Admin page header in the WGY brand type system:
 * eyebrow label + Montserrat 800 uppercase title with an optional
 * Playfair-italic accent word, plus an optional subtitle.
 */
export function AdminPageHeader({
  eyebrow,
  title,
  accent,
  subtitle,
  right,
}: {
  eyebrow: string
  title: string
  accent?: string
  subtitle?: string
  right?: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
      <div>
        <p className="eyebrow" style={{ margin: '0 0 8px' }}>{eyebrow}</p>
        <h1
          className="font-montserrat"
          style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.01em', lineHeight: 1.05, color: 'var(--text)', margin: 0 }}
        >
          {title}
          {accent && <> <em className="font-accent" style={{ textTransform: 'none' }}>{accent}</em></>}
        </h1>
        {subtitle && (
          <p className="font-montserrat" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', margin: '6px 0 0' }}>
            {subtitle}
          </p>
        )}
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  )
}
