import NextAuth from 'next-auth'
import { authConfig } from './config'

// Configuration pour les routes API (utilise Node.js runtime)
// Cette configuration utilise bcryptjs et prisma pour l'authentification
export const { handlers, signIn, signOut } = NextAuth(authConfig)

// Ré-export de auth() depuis le middleware pour compatibilité
// Les routes API peuvent utiliser cette fonction car elles utilisent Node.js runtime
// Le middleware importe directement depuis './middleware' pour éviter les imports bcryptjs/prisma
export { auth } from './middleware'
