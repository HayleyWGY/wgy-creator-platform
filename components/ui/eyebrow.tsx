/**
 * Eyebrow label — tiny uppercase Montserrat 700, 0.24em tracking,
 * accent colour, with optional trailing hairline.
 */
export function Eyebrow({
  children,
  hairline = false,
  className = '',
  style,
}: {
  children: React.ReactNode
  hairline?: boolean
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <p
      className={`eyebrow ${className}`}
      style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0, ...style }}
    >
      {children}
      {hairline && (
        <span aria-hidden style={{ height: 1, flex: '0 0 26px', background: 'var(--border-strong)' }} />
      )}
    </p>
  )
}
