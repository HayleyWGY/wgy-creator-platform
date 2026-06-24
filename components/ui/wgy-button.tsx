'use client'

import { forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'dashed-outline'

interface WgyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  fullWidth?: boolean
}

/**
 * WGY pill button — Montserrat 800 uppercase, 0.09em tracking,
 * radius 999px. All colours resolve through theme tokens.
 *   primary        — filled (pill-bg / pill-text)
 *   secondary      — solid outline (accent border + text)
 *   dashed-outline — dashed outline (muted)
 */
export const WgyButton = forwardRef<HTMLButtonElement, WgyButtonProps>(function WgyButton(
  { variant = 'primary', fullWidth = false, style, children, ...rest },
  ref,
) {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontFamily: 'var(--font-montserrat), sans-serif',
    fontWeight: 800,
    fontSize: 12,
    letterSpacing: '0.09em',
    textTransform: 'uppercase',
    borderRadius: 'var(--radius-pill)',
    padding: '13px 22px',
    cursor: 'pointer',
    width: fullWidth ? '100%' : undefined,
    transition: 'opacity .2s ease, background .2s ease',
  }

  const variants: Record<Variant, React.CSSProperties> = {
    primary: {
      background: 'var(--pill-bg)',
      color: 'var(--pill-text)',
      border: '1px solid var(--pill-bg)',
    },
    secondary: {
      background: 'transparent',
      color: 'var(--accent)',
      border: '1px solid var(--accent)',
    },
    'dashed-outline': {
      background: 'transparent',
      color: 'var(--text-muted)',
      border: '1px dashed var(--border-strong)',
    },
  }

  return (
    <button ref={ref} style={{ ...base, ...variants[variant], ...style }} {...rest}>
      {children}
    </button>
  )
})
