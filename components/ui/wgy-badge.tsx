/**
 * WGY circular badge for campaign media — a "W" in Playfair on a
 * dark translucent disc with a beige hairline ring.
 */
export function WgyBadge({ size = 46 }: { size?: number }) {
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'rgba(17,17,17,0.78)',
        color: 'var(--beige)',
        fontFamily: 'var(--font-playfair), serif',
        fontStyle: 'italic',
        fontWeight: 600,
        fontSize: size * 0.33,
        display: 'grid',
        placeItems: 'center',
        border: '1px solid rgba(228,220,209,0.25)',
      }}
    >
      W
    </div>
  )
}
