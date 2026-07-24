import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { REAUTH_REQUIRED_FIELDS } from '@/lib/admin-reauth'

/**
 * High-impact admin actions require the caller's own password, not just an
 * admin session. A session cookie can be stolen; a password cannot be
 * replayed out of one.
 *
 * The gated set is deliberately narrow. Requiring a password for every field
 * would train admins to retype it constantly, which is its own weakness — so
 * only the fields that can hand over an account are covered.
 */

const root = path.join(__dirname, '..')
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8')
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('the gated field set', () => {
  it('covers email and membershipStatus', () => {
    expect([...REAUTH_REQUIRED_FIELDS].sort()).toEqual(['email', 'membershipStatus'])
  })

  it('does not gate ordinary editing', () => {
    // Names, socials and PII are routine admin work. Gating them would make
    // the prompt meaningless through sheer frequency.
    for (const ordinary of ['firstName', 'lastName', 'bio', 'instagramHandle', 'contentNiches']) {
      expect([...REAUTH_REQUIRED_FIELDS]).not.toContain(ordinary)
    }
  })
})

describe('the member route enforces it', () => {
  const src = stripComments(read('app/api/admin/creators/[id]/route.ts'))

  it('gates privileged field changes', () => {
    expect(src).toMatch(/REAUTH_REQUIRED_FIELDS/)
    expect(src).toMatch(/requireReauth/)
  })

  it('compares against current values, so an unchanged resubmit is not privileged', () => {
    // Without this, saving a form that merely contains the existing email
    // would demand a password and teach admins to expect the prompt.
    expect(src).toMatch(/privilegedChanges\s*=\s*REAUTH_REQUIRED_FIELDS\.filter/)
    expect(src).toMatch(/data\[field\] !== before\[field\]/)
  })

  it('gates reinstate too — it issues a working setup link', () => {
    const branch = src.slice(src.indexOf('if (body.reinstate)'), src.indexOf('Tag management'))
    expect(branch).toMatch(/requireReauth/)
    const reauthAt = branch.indexOf('requireReauth')
    const updateAt = branch.indexOf('prisma.creator.update')
    expect(reauthAt).toBeGreaterThan(-1)
    expect(reauthAt).toBeLessThan(updateAt)
  })

  it('checks the password before writing anything', () => {
    const gateAt = src.indexOf('privilegedChanges.length > 0')
    const updateAt = src.lastIndexOf('prisma.creator.update')
    expect(gateAt).toBeGreaterThan(-1)
    expect(gateAt).toBeLessThan(updateAt)
  })
})

describe('email changes notify the member', () => {
  const src = stripComments(read('app/api/admin/creators/[id]/route.ts'))

  it('calls the notifier on an email change', () => {
    expect(src).toMatch(/notifyEmailChanged/)
    expect(src).toMatch(/oldEmail:\s*before\.email/)
  })

  it('records the previous address in the audit entry', () => {
    // The row is overwritten, so the old value survives only here.
    expect(src).toMatch(/email changed from \$\{before\.email\}/)
  })

  it('sends to the OLD address first', () => {
    const mail = read('lib/transactional-email.ts')
    const oldAt = mail.indexOf('to: oldEmail')
    const newAt = mail.indexOf('to: newEmail')
    expect(oldAt).toBeGreaterThan(-1)
    expect(newAt).toBeGreaterThan(-1)
    // Notifying only the new address tells the attacker what they already
    // know; the old inbox is where the real owner still reads mail.
    expect(oldAt).toBeLessThan(newAt)
  })

  it('never lets a mail failure break the account change', () => {
    const mail = read('lib/transactional-email.ts')
    expect(mail).toMatch(/try\s*\{[\s\S]*?\}\s*catch/)
    expect(src).toMatch(/notifyEmailChanged\([\s\S]*?\)\.catch\(/)
  })
})

describe('the shared helper is the single implementation', () => {
  it('the admins route uses it rather than its own copy', () => {
    const src = read('app/api/admin/admins/route.ts')
    expect(src).toMatch(/from '@\/lib\/admin-reauth'/)
    // A second local copy would drift from the shared one.
    expect(stripComments(src)).not.toMatch(/async function verifyCurrentPassword/)
  })

  it('verifies against the session id, never a client-supplied one', () => {
    const helper = stripComments(read('lib/admin-reauth.ts'))
    expect(helper).toMatch(/where:\s*\{\s*id:\s*actorId\s*\}/)
    expect(helper).toMatch(/bcrypt\.compare\(\s*currentPassword/)
  })
})

describe('the client sends what the server requires', () => {
  const client = read('app/(admin)/admin/creators/page.tsx')

  it('sends currentPassword on email change and reinstate', () => {
    expect(client).toMatch(/email:\s*emailValue,\s*currentPassword/)
    expect(client).toMatch(/reinstate:\s*reinstateForm,\s*currentPassword/)
  })

  it('collects it with masked inputs', () => {
    expect(client).toMatch(/type="password"[\s\S]{0,300}?emailPassword/)
    expect(client).toMatch(/type="password"[\s\S]{0,300}?reinstatePassword/)
  })

  it('leaves tag editing unguarded', () => {
    // Tags are ordinary admin work; a password prompt there would be noise.
    const addTag = client.slice(client.indexOf('async function addTag'), client.indexOf('async function removeTag'))
    expect(addTag).not.toMatch(/currentPassword/)
  })
})
