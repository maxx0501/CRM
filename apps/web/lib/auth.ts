import NextAuth, { type NextAuthResult } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { apiClient } from './api-client'

declare module 'next-auth' {
  interface User {
    accessToken?: string
  }
  interface Session {
    accessToken?: string
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

const nextAuth: NextAuthResult = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        try {
          const response = await apiClient<{
            success: boolean
            data: { user: { id: string; name: string; email: string }; token: string }
          }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          })

          if (response.success && response.data) {
            return {
              id: response.data.user.id,
              name: response.data.user.name,
              email: response.data.user.email,
              accessToken: response.data.token,
            }
          }
          return null
        } catch {
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.accessToken
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.user.id = token.id as string
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
})

export const handlers: NextAuthResult['handlers'] = nextAuth.handlers
export const signIn: NextAuthResult['signIn'] = nextAuth.signIn
export const signOut: NextAuthResult['signOut'] = nextAuth.signOut
export const auth: NextAuthResult['auth'] = nextAuth.auth
