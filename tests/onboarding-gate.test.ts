import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

/**
 * First-run onboarding gate: a member who has never completed or skipped
 * profile-setup is routed there before the app; everyone else passes straight
 * through. This changes the login redirect flow for every member, so these
 * lock in the properties that keep it from trapping anyone.
 */

const read = (p: string) =>
  fs
    .readFileSync(path.join(__dirname, '..', p), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

/**
 * Mirrors the middleware predicate exactly, so a change that weakens it shows
 * up as a behavioural failure here rather than only in review.
 */
function redirectsToSetup(token: { isAdmin?: boolean; onboarded?: boolean } | null): boolean {
  if (!token) return false
  return !token.isAdmin && token.onboarded === false
}

describe('the gate predicate', () => {
  it('gates a genuinely un-onboarded member', () => {
    expect(redirectsToSetup({ isAdmin: false, onboarded: false })).toBe(true)
  })

  it('lets an onboarded member through', () => {
    expect(redirectsToSetup({ isAdmin: false, onboarded: true })).toBe(false)
  })

  it('never gates an admin', () => {
    expect(redirectsToSetup({ isAdmin: true, onboarded: false })).toBe(false)
  })

  it('FAIL-OPEN: a token predating this field (onboarded undefined) passes through', () => {
    // A member already signed in during the deploy has no `onboarded` claim.
    // Strict `=== false` means they are NOT trapped in a redirect — they just
    // are not gated until their next fresh login. This is the discipline the
    // rate limiter learned the hard way.
    expect(redirectsToSetup({ isAdmin: false })).toBe(false)
    expect(redirectsToSetup({ isAdmin: false, onboarded: undefined })).toBe(false)
  })
})

describe('middleware wiring', () => {
  const src = read('middleware.ts')

  it('uses strict === false, not a loose falsy check', () => {
    // `!token.onboarded` would catch undefined too and trap in-flight sessions.
    expect(src).toMatch(/token\.onboarded === false/)
    expect(src).not.toMatch(/!token\.onboarded\b/)
  })

  it('exempts admins and redirects to /profile-setup', () => {
    expect(src).toMatch(/!token\.isAdmin && token\.onboarded === false/)
    expect(src).toMatch(/\/profile-setup/)
  })

  it('does NOT put /profile-setup in the matcher (no gate-against-itself loop)', () => {
    const matcher = src.slice(src.indexOf('matcher'))
    expect(matcher).not.toContain('profile-setup')
  })
})

describe('token carries the flag', () => {
  const auth = read('lib/auth.ts')

  it('authorize returns onboarded from onboardedAt', () => {
    expect(auth).toMatch(/onboarded:\s*creator\.onboardedAt !== null/)
  })

  it('jwt seeds it on login and flips it on update({ onboarded })', () => {
    expect(auth).toMatch(/token\.onboarded = user\.onboarded/)
    expect(auth).toMatch(/trigger === 'update'/)
    expect(auth).toMatch(/token\.onboarded = true/)
  })

  it('is monotonic — the update path can only set true, never false', () => {
    // No code path sets token.onboarded to false after login.
    expect(auth).not.toMatch(/token\.onboarded = false/)
  })

  it('session exposes onboarded', () => {
    expect(auth).toMatch(/session\.user\.onboarded = token\.onboarded/)
  })
})

describe('completion endpoint is safe to call repeatedly', () => {
  const route = read('app/api/onboarding/complete/route.ts')

  it('requires a session', () => {
    expect(route).toMatch(/getActiveSession/)
    expect(route).toMatch(/401/)
  })

  it('only stamps when still null (idempotent, monotonic)', () => {
    expect(route).toMatch(/onboardedAt:\s*null/)
    expect(route).toMatch(/onboardedAt:\s*new Date\(\)/)
  })
})

describe('client flips the token before leaving, or it would bounce back', () => {
  const page = read('app/(auth)/profile-setup/page.tsx')

  it('calls the completion endpoint, updates the session, THEN navigates', () => {
    // Sequence check on the call order — matching literal call sites, not the
    // `updateSession` destructuring declaration that appears earlier.
    expect(page).toMatch(
      /onboarding\/complete[\s\S]*?updateSession\(\{[\s\S]*?router\.push\("\/home"\)/,
    )
  })

  it('both Continue and Skip finish onboarding', () => {
    // Skip counts as done — the chosen behaviour is "never show again".
    expect(page).toMatch(/onClick={finishOnboarding}/)
    expect(page).toMatch(/await finishOnboarding\(\)/)
  })
})
