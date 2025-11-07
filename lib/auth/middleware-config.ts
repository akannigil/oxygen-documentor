import type { NextAuthConfig } from 'next-auth'

/**
 * Configuration minimale pour le middleware (compatible Edge Runtime)
 * Cette configuration n'utilise pas bcryptjs ni prisma car le middleware
 * vérifie seulement les tokens JWT existants, il n'authentifie pas les utilisateurs.
 */
export const middlewareAuthConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
    error: '/login',
  },
  // Pas de providers dans le middleware - l'authentification se fait dans les routes API
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role ?? 'user'
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = (token.role as string) ?? 'user'
      }
      return session
    },
  },
  session: {
    strategy: 'jwt',
  },
}

