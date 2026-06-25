/**
 * Chat bubble — used across community rooms and WGY DMs (wired in the
 * messaging phase; created here as part of the token foundation).
 *
 *  - sent:      beige, dark text, right-aligned
 *  - received:  grey surface, left-aligned
 *  - isWgy:     WGY-authored (DM from WGY, or admin post shown as "WGY").
 *               Carries a subtle gold accent on the author label — the
 *               ONLY place gold (#9b7e56) is allowed to appear.
 *
 * Status/timestamp labels (DELIVERED, SEEN, "2h ago") render as small
 * uppercase letterspaced captions beneath the bubble.
 */
export function ChatBubble({
  variant,
  author,
  isWgy = false,
  status,
  children,
}: {
  variant: 'sent' | 'received'
  author?: string
  isWgy?: boolean
  status?: string
  children: React.ReactNode
}) {
  const sent = variant === 'sent'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: sent ? 'flex-end' : 'flex-start',
        gap: 4,
        maxWidth: '78%',
        marginLeft: sent ? 'auto' : 0,
      }}
    >
      {author && (
        <span
          className="font-montserrat"
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: isWgy ? 'var(--gold-wgy)' : 'var(--text-muted)',
          }}
        >
          {author}
        </span>
      )}

      <div
        style={{
          background: sent ? 'var(--bubble-sent-bg)' : 'var(--bubble-received-bg)',
          color: sent ? 'var(--bubble-sent-text)' : 'var(--bubble-received-text)',
          borderRadius: sent ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
          padding: '9px 14px',
          fontFamily: 'var(--font-montserrat), sans-serif',
          fontWeight: 600,
          fontSize: 13,
          lineHeight: 1.5,
          border: isWgy ? '1px solid rgba(155,126,86,0.45)' : undefined,
        }}
      >
        {children}
      </div>

      {status && (
        <span
          className="font-montserrat"
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          {status}
        </span>
      )}
    </div>
  )
}
