import { type NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Email matching stays case-insensitive and whitespace-tolerant:
        // "Hayley@…", "HAYLEY@…" and a trailing space all resolve to the
        // same account. All emails are stored lowercase (enforced on every
        // write path), so we lowercase the input and do an exact lookup —
        // this uses the unique index instead of a full-table sequential
        // scan (an ILIKE match can't use the index and gets slow at scale).
        const creator = await prisma.creator.findUnique({
          where: { email: credentials.email.trim().toLowerCase() },
        })

        if (!creator) return null

        // Brute-force lockout: 5 failed attempts → locked for 15 minutes
        if (creator.lockedUntil && creator.lockedUntil > new Date()) {
          throw new Error('locked')
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          creator.passwordHash
        )

        if (!passwordMatch) {
          const attempts = creator.failedLoginAttempts + 1
          const locked = attempts >= 5
          await prisma.creator.update({
            where: { id: creator.id },
            data: locked
              ? { failedLoginAttempts: 0, lockedUntil: new Date(Date.now() + 15 * 60 * 1000) }
              : { failedLoginAttempts: attempts },
          })
          if (locked) throw new Error('locked')
          return null
        }

        if (creator.membershipStatus === 'cancelled') return null

        // Update last seen + clear any failed-attempt state
        await prisma.creator.update({
          where: { id: creator.id },
          data: { lastSeenAt: new Date(), failedLoginAttempts: 0, lockedUntil: null },
        })

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
