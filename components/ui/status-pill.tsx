import React from 'react'

/**
 * Status pill — the single source of truth for the small uppercase status
 * badges used across the admin (previously duplicated 5 times with divergent
 * status maps). Covers both publish statuses (campaigns/content/dashboard) and
 * member statuses (creators/tags).
 *
 * The status is matched case-insensitively, so the dashboard's UPPERCASE
 * values ("LIVE"/"DRAFT"/"CLOSED") resolve the same as the lowercase stored
 * ones. Unknown values fall back to a neutral grey pill with a humanised label.
 */
type PillStyle = { label: string; bg: string; color: string; border?: string }

const STATUS_MAP: Record<string, PillStyle> = {
  // Publish statuses
  published: { label: 'Live', bg: 'var(--accent)', color: 'var(--bg)' },
  live: { label: 'Live', bg: 'var(--accent)', color: 'var(--bg)' },
  draft: { label: 'Draft', bg: 'transparent', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.15)' },
  scheduled: { label: 'Scheduled', bg: 'rgba(155,126,86,0.3)', color: '#e4aa55' },
  closed: { label: 'Closed', bg: 'var(--surface-2)', color: 'var(--text-muted)' },
  // Member statuses
  active: { label: 'Active', bg: 'var(--accent)', color: 'var(--bg)' },
  free: { label: 'Free', bg: 'rgba(228,220,209,0.15)', color: 'var(--accent)' },
  payment_failed: { label: 'Failed', bg: 'rgba(192,57,43,0.15)', color: '#C0392B' },
  cancelled: { label: 'Cancelled', bg: 'rgba(192,57,43,0.15)', color: '#C0392B' },
}

function humanise(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function StatusPill({ status, style }: { status: string; style?: React.CSSProperties }) {
  const cfg: PillStyle = STATUS_MAP[status.toLowerCase()] ?? {
    label: humanise(status),
    bg: 'var(--surface-2)',
    color: 'var(--text-muted)',
  }
  return (
    <span
      className="font-montserrat font-semibold uppercase"
      style={{
        fontSize: '9px',
        letterSpacing: '0.10em',
        background: cfg.bg,
        color: cfg.color,
        border: cfg.border,
        padding: '3px 8px',
        borderRadius: '20px',
        ...style,
      }}
    >
      {cfg.label}
    </span>
  )
}
