import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

/**
 * Math.random() must never back anything with a security purpose.
 *
 * V8 implements it as xorshift128+. The internal state is recoverable from a
 * modest run of observed outputs, after which every future value is
 * predictable. That is fatal for two things in this codebase:
 *
 *   - credentials (a "random" password an attacker can compute)
 *   - upload paths (the bucket is public, so a guessable path is a readable
 *     file — the URL is the only access control)
 *
 * These are source-level guards. The behavioural entropy checks live in
 * tests/upload-validation.test.ts.
 */

const root = path.join(__dirname, '..')
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8')

// Comments discussing the old bug would otherwise trip the "must not contain"
// assertions.
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

// Every file that generates a credential or a storage path.
const SECURITY_SENSITIVE = [
  'lib/upload-validation.ts',
  'lib/account-token.ts',
  'app/api/upload-pdf/route.ts',
  'app/api/admin/admins/route.ts',
  'app/api/admin/creators/[id]/route.ts',
  'scripts/import-campaigns.js',
  'scripts/import-learning-lounge.js',
  'scripts/patch-missing-images.js',
]

describe('no Math.random() where randomness is security-relevant', () => {
  for (const file of SECURITY_SENSITIVE) {
    it(`${file} uses a CSPRNG`, () => {
      const code = stripComments(read(file))
      expect(code, `${file} must not use Math.random()`).not.toMatch(/Math\.random\s*\(/)
      expect(code, `${file} must use node crypto`).toMatch(/crypto\.(randomUUID|randomBytes)\s*\(/)
    })
  }
})

describe('no plaintext credential is generated or returned', () => {
  it('neither admin creation nor member reinstate mints a temp password', () => {
    for (const file of ['app/api/admin/admins/route.ts', 'app/api/admin/creators/[id]/route.ts']) {
      const code = stripComments(read(file))
      expect(code, `${file} must not build a WGY- temp password`).not.toMatch(/`WGY-\$\{/)
      expect(code, `${file} must not return tempPassword`).not.toMatch(/tempPassword/)
      // Both hand out a setup link instead.
      expect(code, `${file} must issue a setup link`).toMatch(/setupLinkUrl/)
    }
  })
})

/**
 * THE REGRESSION.
 *
 * passwordSetAt was added to an existing table, so every pre-existing account
 * read as null until it was backfilled. The admin re-issue branch treated
 * "passwordSetAt === null" as "invited but never activated", which briefly
 * meant an authenticated admin could mint a password-setup link for an
 * ESTABLISHED admin — peer-admin account takeover.
 *
 * The fix pairs it with a structural check that does not depend on column
 * data being backfilled correctly: only an account that was genuinely invited
 * has an admin_setup token.
 */
describe('re-issuing a setup link cannot target an established admin', () => {
  const src = stripComments(read('app/api/admin/admins/route.ts'))

  it('requires a prior admin_setup token, not just a null passwordSetAt', () => {
    expect(src).toMatch(/purpose:\s*'admin_setup'/)
    expect(src).toMatch(/passwordSetAt === null && \w+ > 0/)
  })

  it('never re-issues on passwordSetAt alone', () => {
    // Guards against someone "simplifying" the condition back to the bug.
    expect(src).not.toMatch(/if\s*\(\s*existing\.passwordSetAt === null\s*\)/)
  })
})
