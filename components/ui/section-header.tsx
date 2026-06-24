import Link from 'next/link'

/**
 * Section header — Montserrat 800 uppercase headline with a single
 * Playfair-italic accent word, plus an optional "see all" link.
 *
 * Usage: <SectionHeader lead="This week's" accent="drops" seeAllHref="/opportunities" />
 * renders:  THIS WEEK'S *drops*            See all →
 */
export function SectionHeader({
  lead,
  accent,
  trail,
  seeAllHref,
  seeAllLabel = 'See all',
  className = '',
}: {
  lead?: string
  accent?: string
  trail?: string
  seeAllHref?: string
  seeAllLabel?: string
  className?: string
}) {
  return (
    <div
      className={className}
      style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}
    >
      <h2 className="text-heading-large" style={{ margin: 0 }}>
        {lead}{lead ? ' ' : ''}
        {accent && <em className="font-accent">{accent}</em>}
        {trail ? ` ${trail}` : ''}
      </h2>
      {seeAllHref && (
        <Link
          href={seeAllHref}
          className="font-montserrat"
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {seeAllLabel}
        </Link>
      )}
    </div>
  )
}
