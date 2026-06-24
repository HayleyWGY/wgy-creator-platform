'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'

/**
 * Light/dark toggle. Pill group, themed via tokens.
 * Guards against hydration mismatch by waiting until mounted.
 */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = !mounted || theme === 'dark'

  if (compact) {
    // Single icon button — flips theme
    return (
      <button
        type="button"
        aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className="grid place-items-center"
        style={{ width: 34, height: 34, borderRadius: 'var(--radius-pill)', color: 'var(--text)', background: 'transparent', border: '1px solid var(--border)' }}
      >
        {isDark ? <Sun size={16} strokeWidth={2} /> : <Moon size={16} strokeWidth={2} />}
      </button>
    )
  }

  return (
    <div
      role="group"
      aria-label="Theme"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-pill)',
        padding: 4,
      }}
    >
      <ToggleBtn active={isDark} onClick={() => setTheme('dark')} label="Dark">
        <Moon size={13} strokeWidth={2} />
      </ToggleBtn>
      <ToggleBtn active={mounted && theme === 'light'} onClick={() => setTheme('light')} label="Light">
        <Sun size={13} strokeWidth={2} />
      </ToggleBtn>
    </div>
  )
}

function ToggleBtn({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="font-montserrat"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        fontSize: 10.5,
        fontWeight: 800,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        padding: '8px 16px',
        borderRadius: 'var(--radius-pill)',
        border: 0,
        cursor: 'pointer',
        background: active ? 'var(--pill-bg)' : 'transparent',
        color: active ? 'var(--pill-text)' : 'var(--text-muted)',
        transition: 'background .2s ease, color .2s ease',
      }}
    >
      {children}
      {label}
    </button>
  )
}
