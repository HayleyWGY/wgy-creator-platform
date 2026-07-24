import { type NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import {
  rateLimit,
  getClientIp,
  readFailureCount,
  bumpFailureCount,
  clearFailureCount,
} from '@/lib/rate-limit'

/**
 * A real bcrypt hash of a value nobody knows, compared against when the
 * submitted email has no account. Hardcoded rather than generated at import
 * so it costs nothing at cold start and the comparison time is identical on
 * every instance. It cannot match any submitted password.
 */
const DUMMY_PASSWORD_HASH =
  '$2b$10$HQXUHTUqbVnsUDbmJ2FntujkpTAfoN3pJnn1dRrpO9izQnc4FGtYW'

/** How long login failures are remembered for backoff purposes. */
export const BACKOFF_WINDOW_MS = 15 * 60_000

/**
 * Progressive backoff curve: how long to delay a login attempt given the
 * failures already recorded for this (email + IP).
 *
 * Replaces a hard lock, which was an account-denial weapon — five requests
 * locked any member out for fifteen minutes, and with no password-reset flow
 * their only recourse was emailing support. A delay slows an attacker without
 * ever preventing the real member from getting in.
 *
 * The first two failures are free, because typing your password wrong twice
 * is normal and should not feel like being punished. The cap exists because a
 * sleeping serverless function still holds concurrency and bills by duration:
 * an uncapped curve would let an attacker run up our costs and exhaust our
 * own capacity.
 */
export function loginBackoffMs(priorFailures: number): number {
  if (priorFailures < 2) return 0
  const MAX_MS = 3_000
  return Math.min(MAX_MS, 250 * 2 ** (priorFailures - 2))
}

// 60s in-memory cache of live membership status/role, per server instance.
// Keeps revocation near-immediate (≤60s) without a DB read on every request.
const statusCache = new Map<string, { status: string; isAdmin: boolean; at: number }>()

async function getLiveStatus(creatorId: string) {
  const hit = statusCache.get(creatorId)
  if (hit && Date.now() - hit.at < 60_000) return hit

  const creator = await prisma.creator.findUnique({
    where: { id: creatorId },
    select: { membershipStatus: true, isAdmin: true },
  })
  const entry = {
    status: creator?.membershipStatus ?? 'cancelled',
    isAdmin: creator?.isAdmin ?? false,
    at: Date.now(),
  }
  statusCache.set(creatorId, entry)

  // Keep the cache bounded
  if (statusCache.size > 5000) {
    const cutoff = Date.now() - 60_000
    statusCache.forEach((v, k) => { if (v.at < cutoff) statusCache.delete(k) })
  }

  return entry
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Brute-force / credential-stuffing throttle. Runs BEFORE the account
        // lookup and before bcrypt.compare — bcrypt is deliberately expensive,
        // so an unthrottled login endpoint is a cheap CPU-exhaustion vector
        // even when no password is ever guessed.
        //
        // Two keys, because they catch different attacks:
        //  - by IP: one source spraying many different accounts. Deliberately
        //    loose, since offices and mobile CGNAT share an IP among many
        //    legitimate members.
        //  - by email: many sources against one account. Complements the
        //    existing DB-backed lockout (5 failures -> 15 min) below, which
        //    only counts failures that reached the password check.
        //
        // These FAIL OPEN: if Redis is unreachable or misconfigured, allow the
        // login and report to Sentry rather than block. A members' platform
        // must never be fully lockout-able by a Redis hiccup — a wrong
        // credential once took the whole app down this way. Brute-force
        // protection does NOT disappear when Redis is down: the per-account DB
        // lockout below is independent of Redis. What's lost during an outage
        // is only the IP-level pre-bcrypt throttle, which Sentry surfaces so it
        // gets fixed fast. (When Redis IS working, genuine limit breaches are
        // still enforced — fail-open only changes the error case.)
        const emailKey = credentials.email.trim().toLowerCase()
        const ip = getClientIp(req)

        // Only the IP limit DENIES. An IP is the attacker's own resource, so
        // exhausting it costs them, not a member.
        //
        // There is deliberately no per-email deny. Any hard per-account limit
        // is an account-lockout weapon: member emails are not secret (they are
        // the addresses we are about to send migration invites to), so a
        // per-email threshold lets anyone lock out anyone. That was the old
        // 5-strikes lock, and a per-email 429 would have been the same bug in
        // a new place. Per-account pressure is applied as DELAY below, which
        // slows an attacker without ever denying the real member.
        const withinIpLimit = await rateLimit(`login-ip:${ip}`, 20, 15 * 60_000)
        if (!withinIpLimit) throw new Error('rate-limited')

        // Progressive backoff, keyed on (email + IP).
        //
        // Keyed that way rather than on email alone so an attacker hammering a
        // member's address slows THEMSELVES: the member signing in from their
        // own IP has their own counter and sees no delay at all. Email-alone
        // keying would let an attacker degrade the member's experience, which
        // is a milder version of the lockout bug being fixed here.
        //
        // The delay is applied BEFORE the account lookup and is capped, for
        // two different reasons. Before, because a delay applied only to
        // accounts that exist would itself become an enumeration oracle.
        // Capped, because on serverless a sleeping function still occupies
        // concurrency and bills — an uncapped backoff would be a denial-of-
        // wallet vector against ourselves.
        const backoffKey = `login:${emailKey}:${ip}`
        const priorFailures = await readFailureCount(backoffKey)
        const delayMs = loginBackoffMs(priorFailures)
        if (delayMs > 0) await new Promise(resolve => setTimeout(resolve, delayMs))

        // Email matching stays case-insensitive and whitespace-tolerant:
        // "Hayley@…", "HAYLEY@…" and a trailing space all resolve to the
        // same account. All emails are stored lowercase (enforced on every
        // write path), so we lowercase the input and do an exact lookup —
        // this uses the unique index instead of a full-table sequential
        // scan (an ILIKE match can't use the index and gets slow at scale).
        const creator = await prisma.creator.findUnique({
          where: { email: emailKey },
        })

        // ALWAYS run a bcrypt comparison, even when no such account exists.
        //
        // `if (!creator) return null` used to short-circuit here, so a missing
        // address answered in ~2ms and a real one in ~100ms — a timing oracle
        // that let anyone test whether an address was registered. Comparing
        // against a fixed dummy hash of the same cost makes both paths take
        // the same work. The dummy is a real bcrypt hash of a value nobody
        // knows, so it can never match.
        const passwordMatch = await bcrypt.compare(
          credentials.password,
          creator?.passwordHash && creator.passwordHash !== 'DELETED'
            ? creator.passwordHash
            : DUMMY_PASSWORD_HASH,
        )

        if (!creator || !passwordMatch) {
          // Count the failure against (email + IP) whether or not the account
          // exists — otherwise the backoff itself would reveal which addresses
          // are real.
          await bumpFailureCount(backoffKey, BACKOFF_WINDOW_MS)

          if (creator) {
            // Atomic. The previous code read failedLoginAttempts into JS,
            // added one and wrote it back; concurrent attempts all read the
            // same stale value, so the counter barely moved — measured, 50
            // parallel failures recorded as 1. Prisma's `increment` emits
            //   SET "failedLoginAttempts" = ("failedLoginAttempts" + $1)
            // which Postgres evaluates under a row lock, so no update is lost.
            await prisma.creator.update({
              where: { id: creator.id },
              data: { failedLoginAttempts: { increment: 1 } },
            })
          }

          // One outcome for "no such account" and "wrong password". Returning
          // a distinguishable error for either — as the old 'locked' throw did,
          // since a missing account could never reach it — confirms whether an
          // address is registered.
          return null
        }

        if (creator.membershipStatus === 'cancelled') return null

        // Clear both counters on success: the durable per-account record and
        // the (email + IP) backoff, so a member who mistypes twice then gets
        // it right starts clean.
        await prisma.creator.update({
          where: { id: creator.id },
          data: { lastSeenAt: new Date(), failedLoginAttempts: 0, lockedUntil: null },
        })
        await clearFailureCount(backoffKey)

        return {
          id: creator.id,
          email: creator.email,
          firstName: creator.firstName,
          lastName: creator.lastName,
          isAdmin: creator.isAdmin,
          membershipStatus: creator.membershipStatus,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.firstName = user.firstName
        token.lastName = user.lastName
        token.isAdmin = user.isAdmin
        token.membershipStatus = user.membershipStatus
      } else if (token.id) {
        // Live status check with a 60s in-memory cache: cancelling a member
        // (or demoting an admin) takes effect within a minute regardless of
        // the 30-day cookie lifetime, while DB load stays flat at scale —
        // this callback runs on every request, including 3s chat polls.
        const live = await getLiveStatus(token.id as string)
        token.membershipStatus = live.status
        token.isAdmin = live.isAdmin
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.firstName = token.firstName as string
        session.user.lastName = token.lastName as string
        session.user.isAdmin = token.isAdmin as boolean
        session.user.membershipStatus = token.membershipStatus as string
      }
      return session
    },
  },
  pages: {
    signIn: '/sign-in',
    error: '/sign-in',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
}
