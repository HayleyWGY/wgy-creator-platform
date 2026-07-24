import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

/**
 * Every API handler must authenticate its caller.
 *
 * This exists because one route of sixty was missed: the GET in
 * app/api/creator-posts/[id]/comments returned comment bodies plus each
 * author's id, name and profile image to anyone holding a post id and no
 * cookie. The POST beside it was correctly gated, which is exactly why it
 * went unnoticed — the file LOOKED authenticated.
 *
 * A one-off grep would not have caught the next one. This runs on every push.
 *
 * A handler passes if it either:
 *   a) calls getActiveSession(), the standard session gate, or
 *   b) is a declared exception that authenticates by some other means, AND
 *      demonstrably performs that verification.
 *
 * The second condition matters. A bare allowlist would let someone add a
 * route to the list and ship it with no authentication at all — the list
 * would document the hole rather than prevent it. So each exception must
 * name the function that does its checking, and the test confirms the file
 * actually calls it.
 */

const API_ROOT = path.join(__dirname, '..', 'app', 'api')

/**
 * Routes that legitimately have no session, each with the verification it
 * uses instead. All are authenticated — just not by cookie.
 */
const EXCEPTIONS: Record<string, { reason: string; mustCall: RegExp }> = {
  'webhooks/stripe/route.ts': {
    reason: 'Called by Stripe, not a browser. Authenticated by webhook signature.',
    mustCall: /constructEvent/,
  },
  'cron/publish-scheduled/route.ts': {
    reason: 'Called by Vercel Cron. Authenticated by CRON_SECRET bearer token.',
    mustCall: /CRON_SECRET/,
  },
  'apply-prefill/route.ts': {
    reason: 'Called server-to-server by the portal. Authenticated by a signed handoff token.',
    mustCall: /verifyHandoffToken/,
  },
  'record-application/route.ts': {
    reason: 'Called server-to-server by the portal. Authenticated by a signed receipt token.',
    mustCall: /verifyApplicationReceipt/,
  },
  'account/set-password/route.ts': {
    reason:
      'Redeems a setup link. Deliberately session-less — the account has no usable ' +
      'password yet, so the single-use token IS the credential.',
    mustCall: /peekAccountToken|consumeAccountToken/,
  },
}

// CORS preflight. Returns headers only, never data, and carries no body to leak.
const EXEMPT_METHODS = new Set(['OPTIONS'])

const HANDLER_RE =
  /export\s+(?:async\s+)?(?:function\s+(GET|POST|PATCH|PUT|DELETE|HEAD|OPTIONS)\s*\(|const\s+(GET|POST|PATCH|PUT|DELETE|HEAD|OPTIONS)\s*=)/g

function routeFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) routeFiles(full, acc)
    else if (entry.name === 'route.ts') acc.push(full)
  }
  return acc
}

type Handler = { file: string; method: string; body: string }

function allHandlers(): Handler[] {
  const found: Handler[] = []
  for (const file of routeFiles(API_ROOT)) {
    const rel = path.relative(API_ROOT, file)
    const src = fs.readFileSync(file, 'utf8')
    // Array.from rather than spread: the build target predates downlevel
    // iteration of a RegExp string iterator.
    const marks = Array.from(src.matchAll(HANDLER_RE)).map(m => ({
      method: (m[1] ?? m[2])!,
      at: m.index!,
    }))
    marks.forEach((mark, i) => {
      // Slice to the next exported handler, or end of file.
      const end = marks[i + 1]?.at ?? src.length
      found.push({ file: rel, method: mark.method, body: src.slice(mark.at, end) })
    })
  }
  return found
}

const handlers = allHandlers()

describe('every API handler authenticates its caller', () => {
  it('finds the route files (guards against the audit silently matching nothing)', () => {
    // If a refactor moves routes, this suite must fail loudly rather than
    // pass by examining an empty set.
    expect(routeFiles(API_ROOT).length).toBeGreaterThan(50)
    expect(handlers.length).toBeGreaterThan(80)
  })

  const gated = handlers.filter(
    h => !EXEMPT_METHODS.has(h.method) && !(h.file in EXCEPTIONS),
  )

  it('every non-exempt handler calls getActiveSession()', () => {
    const missing = gated
      .filter(h => !/getActiveSession\s*\(/.test(h.body))
      .map(h => `${h.method} ${h.file}`)

    expect(
      missing,
      `Handlers with no session check:\n  ${missing.join('\n  ')}\n\n` +
        'Add:\n' +
        "  const session = await getActiveSession()\n" +
        "  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })\n\n" +
        'If the route is genuinely session-less, add it to EXCEPTIONS in this ' +
        'file with the verification it uses instead.',
    ).toEqual([])
  })

  it('the previously-missed comments GET is gated', () => {
    // Named explicitly: this is the defect that prompted the audit.
    const target = handlers.find(
      h => h.file.includes('creator-posts') && h.file.includes('comments') && h.method === 'GET',
    )
    expect(target, 'creator-posts/[id]/comments GET should exist').toBeTruthy()
    expect(target!.body).toMatch(/getActiveSession\s*\(/)
    expect(target!.body).toMatch(/401/)
    // The gate must precede the query, or it gates nothing.
    expect(target!.body.indexOf('getActiveSession')).toBeLessThan(
      target!.body.indexOf('prisma.'),
    )
  })
})

describe('the exception list is honest', () => {
  it('every exception actually performs its stated verification', () => {
    // Prevents the list becoming a way to ship an unauthenticated route.
    for (const [file, { reason, mustCall }] of Object.entries(EXCEPTIONS)) {
      const full = path.join(API_ROOT, file)
      expect(fs.existsSync(full), `${file} is listed but does not exist`).toBe(true)
      const src = fs.readFileSync(full, 'utf8')
      expect(
        mustCall.test(src),
        `${file} is exempt from the session check because:\n  ${reason}\n` +
          `But it does not call ${mustCall}. An exception without its own ` +
          'verification is an unauthenticated route.',
      ).toBe(true)
    }
  })

  it('contains no stale entries for deleted routes', () => {
    const real = new Set(routeFiles(API_ROOT).map(f => path.relative(API_ROOT, f)))
    for (const file of Object.keys(EXCEPTIONS)) {
      expect(real.has(file), `${file} is listed but no longer exists`).toBe(true)
    }
  })
})
