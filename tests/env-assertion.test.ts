import { describe, it, expect, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import { REQUIRED_ENV, DEPLOY_ONLY_ENV, OPTIONAL_ENV, assertRequiredEnv } from '@/lib/env'

/**
 * A missing production env var used to surface at first use — worst case,
 * FIELD_ENCRYPTION_KEY absent 500s every sensitive-field access while a smoke
 * test on legacy plaintext rows looks fine. assertRequiredEnv() moves that
 * failure to startup. These lock in the two properties that matter: it throws
 * when a required var is missing, and it never throws for an optional one.
 */

describe('assertRequiredEnv', () => {
  const saved: Record<string, string | undefined> = {}
  const setAllRequired = () => {
    for (const v of REQUIRED_ENV) {
      saved[v.name] = process.env[v.name]
      process.env[v.name] = 'present'
    }
  }

  afterEach(() => {
    for (const [k, val] of Object.entries(saved)) {
      if (val === undefined) delete process.env[k]
      else process.env[k] = val
    }
  })

  it('passes when every required var is present', () => {
    setAllRequired()
    expect(() => assertRequiredEnv()).not.toThrow()
  })

  it('throws when a required var is missing', () => {
    setAllRequired()
    delete process.env.FIELD_ENCRYPTION_KEY
    expect(() => assertRequiredEnv()).toThrow(/FIELD_ENCRYPTION_KEY/)
  })

  it('treats empty-string as missing (a set-but-blank Vercel var)', () => {
    setAllRequired()
    process.env.CRON_SECRET = '   '
    expect(() => assertRequiredEnv()).toThrow(/CRON_SECRET/)
  })

  it('reports ALL missing vars at once, not just the first', () => {
    setAllRequired()
    delete process.env.DATABASE_URL
    delete process.env.NEXTAUTH_SECRET
    try {
      assertRequiredEnv()
      throw new Error('should have thrown')
    } catch (e) {
      const msg = (e as Error).message
      expect(msg).toMatch(/DATABASE_URL/)
      expect(msg).toMatch(/NEXTAUTH_SECRET/)
    }
  })

  it('never lists a dormant/optional var as required', () => {
    // APPLY_HANDOFF_SECRET and NEXT_PUBLIC_PORTAL_URL are deliberately unset
    // right now — the assertion must not break the current deploy.
    const requiredNames = REQUIRED_ENV.map(v => v.name)
    for (const optional of ['APPLY_HANDOFF_SECRET', 'NEXT_PUBLIC_PORTAL_URL', 'RESEND_API_KEY', 'STRIPE_SECRET_KEY', 'SENTRY_DSN']) {
      expect(requiredNames).not.toContain(optional)
    }
  })

  it('with only the required vars set (all optionals absent), does not throw', () => {
    setAllRequired()
    for (const v of [...OPTIONAL_ENV, ...DEPLOY_ONLY_ENV]) delete process.env[v.name]
    expect(() => assertRequiredEnv()).not.toThrow()
  })
})

describe('the three lists are disjoint and complete', () => {
  const all = [...REQUIRED_ENV, ...DEPLOY_ONLY_ENV, ...OPTIONAL_ENV]

  it('no variable appears in more than one list', () => {
    const names = all.map(v => v.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('every documented var has a non-trivial explanation', () => {
    for (const v of all) expect(v.why.length).toBeGreaterThan(20)
  })

  it('exactly FIELD_ENCRYPTION_KEY is flagged data-loss', () => {
    // If another data-loss key is added, this should be updated deliberately.
    const dataLoss = all.filter(v => v.dataLoss).map(v => v.name)
    expect(dataLoss).toEqual(['FIELD_ENCRYPTION_KEY'])
  })
})

describe('.env.example stays in sync with the code', () => {
  const example = fs.readFileSync(path.join(__dirname, '..', '.env.example'), 'utf8')

  it('documents every variable the code actually reads', () => {
    // Ground truth: grep process.env.* out of the source, minus system vars
    // and the test-only prefix override, and require each appears in the file.
    // System vars: injected by the platform (Vercel/Next) or test-only. Not
    // deploy configuration, so not documented in .env.example.
    const SYSTEM = new Set([
      'NODE_ENV', 'NEXT_RUNTIME', 'NEXT_PHASE',
      'VERCEL_ENV', 'NEXT_PUBLIC_VERCEL_ENV',
      'UPSTASH_RATELIMIT_PREFIX',
    ])
    const roots = ['app', 'lib', 'scripts']
    const found = new Set<string>()
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name)
        if (e.isDirectory()) walk(p)
        else if (/\.(ts|tsx|js)$/.test(e.name)) {
          const src = fs.readFileSync(p, 'utf8')
          for (const m of Array.from(src.matchAll(/process\.env\.([A-Z_][A-Z0-9_]*)/g))) found.add(m[1])
        }
      }
    }
    for (const r of roots) walk(path.join(__dirname, '..', r))
    // Sentry configs live at the repo root.
    for (const f of ['sentry.server.config.ts', 'sentry.client.config.ts', 'sentry.edge.config.ts']) {
      const fp = path.join(__dirname, '..', f)
      if (fs.existsSync(fp)) {
        for (const m of Array.from(fs.readFileSync(fp, 'utf8').matchAll(/process\.env\.([A-Z_][A-Z0-9_]*)/g))) found.add(m[1])
      }
    }

    const undocumented = Array.from(found).filter(name => !SYSTEM.has(name) && !example.includes(name))
    expect(
      undocumented,
      `These env vars are read by the code but missing from .env.example:\n  ${undocumented.join('\n  ')}`,
    ).toEqual([])
  })

  it('lists every REQUIRED var', () => {
    for (const v of REQUIRED_ENV) expect(example, `${v.name} missing from .env.example`).toContain(v.name)
  })
})
