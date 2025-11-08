import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface EmailConfig {
  organizationName?: string
  appName?: string
  contactEmail?: string
}

/**
 * GET /api/projects/[id]/email-config
 * Récupère la configuration système d'email du projet
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params

    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        ownerId: true,
        emailConfig: true,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 })
    }

    if (project.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Récupérer les valeurs par défaut depuis les variables d'environnement
    const defaultConfig: EmailConfig = {}
    const envOrgName = process.env['EMAIL_ORGANIZATION_NAME']
    const envAppName = process.env['EMAIL_APP_NAME']
    const envContact = process.env['EMAIL_CONTACT'] || process.env['EMAIL_FROM']

    if (envOrgName) {
      defaultConfig.organizationName = envOrgName
    }
    if (envAppName) {
      defaultConfig.appName = envAppName
    } else {
      defaultConfig.appName = 'Oxygen Document'
    }
    if (envContact) {
      defaultConfig.contactEmail = envContact
    }

    // Fusionner avec la configuration du projet si elle existe
    const projectConfig = (project.emailConfig as EmailConfig | null) || {}
    const config: EmailConfig = {
      ...defaultConfig,
      ...projectConfig,
    }

    return NextResponse.json({ config })
  } catch (error) {
    console.error('Erreur lors de la récupération de la configuration email:', error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}

/**
 * PUT /api/projects/[id]/email-config
 * Met à jour la configuration système d'email du projet
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params
    const body = (await request.json()) as { config: EmailConfig }

    if (!body.config || typeof body.config !== 'object') {
      return NextResponse.json({ error: 'Configuration invalide' }, { status: 400 })
    }

    // Vérifier que le projet existe et appartient à l'utilisateur
    const project = await prisma.project.findUnique({
      where: { id },
      select: { id: true, ownerId: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 })
    }

    if (project.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Valider et nettoyer la configuration
    const config: EmailConfig = {}

    if (body.config.organizationName !== undefined) {
      const trimmed = String(body.config.organizationName).trim()
      if (trimmed) {
        config.organizationName = trimmed
      }
    }

    if (body.config.appName !== undefined) {
      const trimmed = String(body.config.appName).trim()
      if (trimmed) {
        config.appName = trimmed
      }
    }

    if (body.config.contactEmail !== undefined) {
      const trimmed = String(body.config.contactEmail).trim()
      if (trimmed) {
        config.contactEmail = trimmed
      }
    }

    // Mettre à jour le projet
    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        emailConfig: config as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        emailConfig: true,
      },
    })

    return NextResponse.json({
      config: updatedProject.emailConfig as EmailConfig,
      message: 'Configuration mise à jour avec succès',
    })
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la configuration email:', error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}

