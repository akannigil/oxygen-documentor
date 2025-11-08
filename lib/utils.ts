import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalise et nettoie une adresse email
 * - Supprime les espaces
 * - Convertit les caractères accentués en ASCII (é -> e, è -> e, etc.)
 * - Convertit en minuscules
 * - Supprime les caractères non valides
 */
export function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return ''
  }

  // Supprimer les espaces
  let normalized = email.trim().replace(/\s+/g, '')

  // Convertir les caractères accentués en ASCII
  normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  // Convertir en minuscules
  normalized = normalized.toLowerCase()

  return normalized
}
