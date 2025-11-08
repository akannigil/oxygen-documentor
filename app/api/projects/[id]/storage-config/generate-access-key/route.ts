import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createMinIOAccessKey, type MinIOAdminConfig } from '@/lib/storage/minio-admin'
import type { S3StorageConfig } from '@/lib/storage/config'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/projects/[id]/storage-config/generate-access-key
 * Génère des access keys spécifiques pour un bucket MinIO
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id: projectId } = await params
    const body = await request.json()
    const { adminAccessKeyId, adminSecretAccessKey, bucketName, userName, permissions } = body

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

    // Récupérer la configuration de stockage du projet
    const storageConfig = project.storageConfig as S3StorageConfig | null | undefined

    if (!storageConfig || storageConfig.type !== 's3') {
      return NextResponse.json(
        { error: 'Le projet doit avoir une configuration S3/MinIO pour générer des access keys' },
        { status: 400 }
      )
    }

    // Vérifier que c'est bien MinIO (endpoint personnalisé)
    if (!storageConfig.endpoint || storageConfig.endpoint.includes('amazonaws.com')) {
      return NextResponse.json(
        { error: 'La génération automatique d\'access keys n\'est disponible que pour MinIO' },
        { status: 400 }
      )
    }

    // Vérifier les paramètres requis
    if (!adminAccessKeyId || !adminSecretAccessKey) {
      return NextResponse.json(
        { error: 'Les credentials admin MinIO sont requis pour générer des access keys' },
        { status: 400 }
      )
    }

    if (!bucketName) {
      return NextResponse.json(
        { error: 'Le nom du bucket est requis' },
        { status: 400 }
      )
    }

    // Créer la configuration admin
    const adminConfig: MinIOAdminConfig = {
      endpoint: storageConfig.endpoint,
      accessKeyId: adminAccessKeyId,
      secretAccessKey: adminSecretAccessKey,
      region: storageConfig.region,
    }

    // Valider les credentials admin avant de continuer
    const { validateMinIOAdminCredentials } = await import('@/lib/storage/minio-admin')
    const isValid = await validateMinIOAdminCredentials(adminConfig)
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Les credentials admin MinIO sont invalides ou n\'ont pas les permissions nécessaires' },
        { status: 401 }
      )
    }

    // Générer l'access key
    const generatedKey = await createMinIOAccessKey(adminConfig, {
      userName: userName || `project-${projectId}-${Date.now()}`,
      bucketName,
      permissions: permissions || ['read', 'write'],
    })

    return NextResponse.json({
      success: true,
      accessKey: {
        accessKeyId: generatedKey.accessKeyId,
        secretAccessKey: generatedKey.secretAccessKey,
        userName: generatedKey.userName,
      },
      message: 'Access key générée avec succès. Veuillez la configurer dans MinIO si nécessaire.',
    })
  } catch (error) {
    console.error('[API] Erreur lors de la génération de l\'access key:', error)
    return NextResponse.json(
      {
        error: `Erreur lors de la génération de l'access key: ${
          error instanceof Error ? error.message : 'Erreur inconnue'
        }`,
      },
      { status: 500 }
    )
  }
}

