/** Asterisk (✶) divider — hairline · accent asterisk · hairline. */
export function AsteriskDivider({ className = '' }: { className?: string }) {
  return (
    <div
      className={className}
      aria-hidden
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}
    >
      <span style={{ height: 1, flex: 1, background: 'var(--border)' }} />
      <b style={{ color: 'var(--accent)', fontSize: 13, lineHeight: 1 }}>&#10038;</b>
      <span style={{ height: 1, flex: 1, background: 'var(--border)' }} />
    </div>
  )
}
