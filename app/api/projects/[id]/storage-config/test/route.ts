import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { testS3Connection, testDefaultS3Connection } from '@/lib/storage/test-connection'
import type { S3StorageConfig, StorageConfig } from '@/lib/storage/config'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/projects/[id]/storage-config/test
 * Teste une configuration de stockage S3/MinIO
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id: projectId } = await params
    const body = await request.json()
    const { config, useProjectConfig } = body

    // Vérifier que l'utilisateur est propriétaire du projet
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ownerId: session.user.id,
      },
      select: {
        id: true,
        storageConfig: true,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 })
    }

    let testResult

    if (useProjectConfig) {
      // Tester la configuration stockée du projet
      const projectConfig = project.storageConfig as StorageConfig | null
      
      if (!projectConfig || projectConfig.type !== 's3') {
        return NextResponse.json(
          { error: 'Aucune configuration S3 définie pour ce projet' },
          { status: 400 }
        )
      }

      testResult = await testS3Connection(projectConfig as S3StorageConfig)
    } else if (config) {
      // Tester une configuration fournie (avant sauvegarde)
      if (config.type !== 's3') {
        return NextResponse.json(
          { error: 'Seule la configuration S3/MinIO peut être testée' },
          { status: 400 }
        )
      }

      testResult = await testS3Connection(config as S3StorageConfig)
    } else {
      // Tester la configuration par défaut (variables d'environnement)
      testResult = await testDefaultS3Connection()
    }

    return NextResponse.json(testResult)

  } catch (error) {
    console.error('[API] Erreur lors du test de connexion:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Erreur serveur lors du test de connexion',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      },
      { status: 500 }
    )
  }
}

