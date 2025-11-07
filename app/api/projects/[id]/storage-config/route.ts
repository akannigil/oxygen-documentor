import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateStorageConfig, type StorageConfig } from '@/lib/storage/config'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/projects/[id]/storage-config
 * Récupère la configuration de stockage d'un projet
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id: projectId } = await params

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

    return NextResponse.json({
      config: project.storageConfig as StorageConfig | null,
    })
  } catch (error) {
    console.error('[API] Erreur lors de la récupération de la configuration de stockage:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors de la récupération de la configuration' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/projects/[id]/storage-config
 * Met à jour la configuration de stockage d'un projet
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id: projectId } = await params
    const body = await request.json()
    const { config } = body

    // Valider que l'utilisateur est propriétaire du projet
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ownerId: session.user.id,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 })
    }

    // Valider la configuration si elle est fournie
    if (config !== null && config !== undefined) {
      if (!validateStorageConfig(config)) {
        return NextResponse.json({ error: 'Configuration de stockage invalide' }, { status: 400 })
      }
    }

    // Mettre à jour la configuration
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        storageConfig: config || null,
      },
      select: {
        id: true,
        storageConfig: true,
      },
    })

    return NextResponse.json({
      config: updatedProject.storageConfig as StorageConfig | null,
    })
  } catch (error) {
    console.error('[API] Erreur lors de la sauvegarde de la configuration de stockage:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors de la sauvegarde de la configuration' },
      { status: 500 }
    )
  }
}
