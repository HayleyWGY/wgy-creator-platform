import { type NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

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

        // Email matching is case-insensitive and whitespace-tolerant:
        // "Hayley@…", "HAYLEY@…" and a trailing space all resolve to the
        // same account.
        const creator = await prisma.creator.findFirst({
          where: { email: { equals: credentials.email.trim(), mode: 'insensitive' } },
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
        // Re-read live status on every request so revocation is immediate:
        // cancelling a member (or demoting an admin) takes effect on their
        // next request, regardless of the 30-day cookie lifetime.
        const creator = await prisma.creator.findUnique({
          where: { id: token.id as string },
          select: { membershipStatus: true, isAdmin: true },
        })
        if (!creator) {
          token.membershipStatus = 'cancelled'
          token.isAdmin = false
        } else {
          token.membershipStatus = creator.membershipStatus
          token.isAdmin = creator.isAdmin
        }
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
