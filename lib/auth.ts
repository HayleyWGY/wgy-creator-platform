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

        const creator = await prisma.creator.findUnique({
          where: { email: credentials.email },
        })

        if (!creator) return null

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          creator.passwordHash
        )

        if (!passwordMatch) return null

        if (creator.membershipStatus === 'cancelled') return null

        // Update last seen
        await prisma.creator.update({
          where: { id: creator.id },
          data: { lastSeenAt: new Date() },
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
