import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

/**
 * Guards the admin-team takeover chain.
 *
 * Before this hardening, a stolen admin session cookie — with no password
 * knowledge — was enough to permanently seize the platform:
 *   1. POST   /api/admin/admins  create an attacker-controlled admin
 *   2. GET    /api/admin/admins  enumerate the real admins
 *   3. DELETE /api/admin/admins  demote every one of them
 *
 * These are source-level wiring guards rather than live HTTP tests: the
 * route depends on getActiveSession() and Prisma, and the property that
 * matters is structural — that re-authentication is actually invoked, and
 * invoked BEFORE any mutation. A behavioural test that mocked the session
 * would prove less, because it would be asserting against the mock.
 */

const root = path.join(__dirname, '..')
const raw = fs.readFileSync(path.join(root, 'app/api/admin/admins/route.ts'), 'utf8')

// Strip comments before asserting. "This must NOT appear" checks are
// otherwise satisfied by prose — a comment explaining the old bug reads as
// the bug itself.
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const src = stripComments(raw)

// Isolate each handler so a check can't be satisfied by a sibling's code.
function handler(name: 'GET' | 'POST' | 'DELETE'): string {
  const start = raw.indexOf(`export async function ${name}(`)
  expect(start, `${name} handler must exist`).toBeGreaterThan(-1)
  const rest = raw.slice(start + 1)
  const next = rest.search(/\nexport async function /)
  return next === -1 ? rest : rest.slice(0, next)
}

describe('step 1 — creating an admin requires the password', () => {
  it('POST reads currentPassword from the body', () => {
    expect(handler('POST')).toMatch(/currentPassword/)
  })

  it('POST verifies it before creating or promoting anything', () => {
    const post = handler('POST')
    const verifyAt = post.indexOf('verifyCurrentPassword')
    const createAt = post.indexOf('prisma.creator.create')
    const updateAt = post.indexOf('prisma.creator.update')

    expect(verifyAt, 'POST must call verifyCurrentPassword').toBeGreaterThan(-1)
    // Ordering is the security property: a check after the mutation is no check.
    expect(verifyAt).toBeLessThan(createAt)
    expect(verifyAt).toBeLessThan(updateAt)
  })
})

describe('step 3 — demoting an admin requires the password', () => {
  it('DELETE reads currentPassword from the body', () => {
    expect(handler('DELETE')).toMatch(/currentPassword/)
  })

  it('DELETE verifies it before demoting', () => {
    const del = handler('DELETE')
    const verifyAt = del.indexOf('verifyCurrentPassword')
    const demoteAt = del.indexOf('isAdmin: false')

    expect(verifyAt, 'DELETE must call verifyCurrentPassword').toBeGreaterThan(-1)
    expect(demoteAt).toBeGreaterThan(-1)
    expect(verifyAt).toBeLessThan(demoteAt)
  })
})

describe('re-authentication is a real bcrypt check', () => {
  // The implementation moved to lib/admin-reauth.ts so the member routes
  // could share it. The property is unchanged — assert it where it now
  // lives, and that this route actually delegates there.
  const helper = stripComments(
    fs.readFileSync(path.join(root, 'lib/admin-reauth.ts'), 'utf8'),
  )

  it('the route delegates to the shared helper', () => {
    expect(src).toMatch(/from '@\/lib\/admin-reauth'/)
  })

  it('compares against the stored hash rather than trusting the session', () => {
    expect(helper).toMatch(/bcrypt\.compare\(\s*currentPassword/)
    // The actor is loaded by session id — not by any client-supplied id,
    // which would let a caller verify against an account they control.
    expect(helper).toMatch(/where:\s*\{\s*id:\s*actorId\s*\}/)
  })
})

describe('the last-admin guard counts OTHER admins', () => {
  it('excludes the caller from the count', () => {
    // THE REGRESSION: `count({ where: { isAdmin: true } })` included the
    // attacker's own account, so demoting every genuine admin never tripped
    // the guard.
    expect(src).toMatch(/count\(\{[\s\S]*?isAdmin:\s*true[\s\S]*?id:\s*\{\s*not:\s*session\.user\.id\s*\}/)
    expect(src, 'must not count admins without excluding the caller').not.toMatch(
      /count\(\{\s*where:\s*\{\s*isAdmin:\s*true\s*\}\s*\}\)/,
    )
  })
})

describe('failures are audited, not just successes', () => {
  it('logs denied re-authentication on both mutating routes', () => {
    expect(handler('POST')).toMatch(/logAudit[\s\S]*?DENIED/)
    expect(handler('DELETE')).toMatch(/logAudit[\s\S]*?DENIED/)
  })

  it('logs rate-limit rejections', () => {
    expect(handler('POST')).toMatch(/logAudit[\s\S]*?Rate limit/)
    expect(handler('DELETE')).toMatch(/logAudit[\s\S]*?Rate limit/)
  })
})

describe('related fixes', () => {
  it('handles the P2002 race instead of throwing a 500', () => {
    expect(src).toMatch(/code === 'P2002'/)
    expect(src).toMatch(/status:\s*409/)
  })

  it('looks the email up on the unique index, not a sequential scan', () => {
    expect(src).toMatch(/findUnique\(\{\s*where:\s*\{\s*email:\s*cleanEmail\s*\}\s*\}\)/)
    expect(src, "mode: 'insensitive' cannot use the unique index").not.toMatch(/mode:\s*'insensitive'/)
  })
})

describe('no plaintext credential is ever returned', () => {
  it('POST returns a setup link, not a temporary password', () => {
    const post = handler('POST')
    expect(post).toMatch(/setupUrl/)
    // THE REGRESSION: the old route minted a working password and put it in
    // the response body, where it became a permanent credential known to a
    // second person.
    expect(post, 'tempPassword must not be returned').not.toMatch(/tempPassword/)
  })

  it('creates the account with a password nobody knows', () => {
    const post = handler('POST')
    expect(post).toMatch(/crypto\.randomBytes/)
    expect(post).toMatch(/passwordSetAt:\s*null/)
  })
})

describe('the client sends what the server now requires', () => {
  const client = fs.readFileSync(path.join(root, 'app/(admin)/admin/settings/page.tsx'), 'utf8')

  it('sends currentPassword on both add and remove', () => {
    const calls = client.match(/fetch\("\/api\/admin\/admins"[\s\S]{0,400}?\}\);/g) ?? []
    const mutating = calls.filter(c => /method:\s*"(POST|DELETE)"/.test(c))
    expect(mutating.length, 'expected a POST and a DELETE call').toBe(2)
    for (const call of mutating) {
      expect(call).toMatch(/currentPassword/)
    }
  })

  it('shows the setup link rather than a temporary password', () => {
    expect(client).toMatch(/setupUrl/)
    expect(client, 'client must not display a tempPassword').not.toMatch(/tempPassword/)
  })

  it('collects the password with a masked input', () => {
    // window.prompt() would display it in clear text.
    expect(client).toMatch(/type="password"[\s\S]{0,200}?removePassword/)
    expect(client).not.toMatch(/prompt\(["'`][^)]*password/i)
  })
})
