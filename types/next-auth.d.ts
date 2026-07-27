import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      firstName: string
      lastName: string
      isAdmin: boolean
      membershipStatus: string
      onboarded: boolean
    }
  }
  interface User {
    id: string
    email: string
    firstName: string
    lastName: string
    isAdmin: boolean
    membershipStatus: string
    onboarded: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    firstName: string
    lastName: string
    isAdmin: boolean
    membershipStatus: string
    onboarded: boolean
  }
}
