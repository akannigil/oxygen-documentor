import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Health Check Endpoint
 * Vérifie l'état de l'application et de ses dépendances
 * 
 * GET /api/health
 * 
 * @returns {200} Application saine avec détails des services
 * @returns {503} Application non disponible
 */
export async function GET(): Promise<NextResponse> {
  const checks = {
    app: 'ok',
    database: 'unknown',
    timestamp: new Date().toISOString(),
  }

  let isHealthy = true

  try {
    // Vérifier la connexion à la base de données
    await prisma.$queryRaw`SELECT 1`
    checks.database = 'ok'
  } catch (error: unknown) {
    checks.database = 'error'
    isHealthy = false
    console.error('[Health Check] Database error:', error)
  }

  // Retourner le statut approprié
  const status = isHealthy ? 200 : 503

  return NextResponse.json(
    {
      status: isHealthy ? 'healthy' : 'unhealthy',
      checks,
    },
    { status }
  )
}

