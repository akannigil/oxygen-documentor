import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalise et nettoie une adresse email
 * - Extrait l'email du format "Nom <email@domain.com>" si présent
 * - Supprime les espaces autour de l'email
 * - Convertit les caractères accentués en ASCII (é -> e, è -> e, etc.)
 * - Convertit en minuscules
 * - Supprime les caractères non valides
 */
export function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return ''
  }

  let emailAddress = email.trim()

  // Détecter et extraire l'email du format "Nom <email@domain.com>" (RFC 5322)
  // Pattern: nom optionnel suivi de <email@domain.com>
  const emailWithNameMatch = emailAddress.match(/<([^>]+)>/)
  if (emailWithNameMatch && emailWithNameMatch[1]) {
    // Extraire l'email entre les chevrons
    emailAddress = emailWithNameMatch[1].trim()
  }

  // Supprimer les espaces autour de l'email
  emailAddress = emailAddress.trim()

  // Convertir les caractères accentués en ASCII
  emailAddress = emailAddress.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  // Convertir en minuscules
  emailAddress = emailAddress.toLowerCase()

  return emailAddress
}
