import NextAuth from 'next-auth'
import { middlewareAuthConfig } from './middleware-config'

/**
 * Instance NextAuth pour le middleware (compatible Edge Runtime)
 * Cette instance n'importe pas bcryptjs ni prisma car elle utilise
 * seulement middlewareAuthConfig qui ne contient pas de providers.
 */
export const { auth } = NextAuth(middlewareAuthConfig)

