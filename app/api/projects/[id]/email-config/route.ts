import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import type { EmailConfig } from '@/lib/email/config'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/projects/[id]/email-config
 * Récupère la configuration email du projet
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

    // Récupérer la configuration du projet
    const config = (project.emailConfig as EmailConfig | null) || null

    return NextResponse.json({ config })
  } catch (error) {
    console.error('Erreur lors de la récupération de la configuration email:', error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}

/**
 * PUT /api/projects/[id]/email-config
 * Met à jour la configuration email du projet
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

    // Valider la configuration selon le provider
    const config = body.config

    if (!config.provider || (config.provider !== 'resend' && config.provider !== 'smtp')) {
      return NextResponse.json(
        { error: 'Provider invalide (doit être "resend" ou "smtp")' },
        { status: 400 }
      )
    }

    if (config.provider === 'resend') {
      if (!config.apiKey || !config.from) {
        return NextResponse.json(
          { error: "La clé API Resend et l'adresse email from sont requises" },
          { status: 400 }
        )
      }
    } else if (config.provider === 'smtp') {
      if (!config.host || !config.port || !config.user || !config.password) {
        return NextResponse.json(
          { error: "L'hôte, le port, l'utilisateur et le mot de passe SMTP sont requis" },
          { status: 400 }
        )
      }
    }

    // Nettoyer les valeurs optionnelles
    const cleanedConfig: EmailConfig = {
      ...config,
      ...(config.organizationName?.trim() && { organizationName: config.organizationName.trim() }),
      ...(config.appName?.trim() && { appName: config.appName.trim() }),
      ...(config.contactEmail?.trim() && { contactEmail: config.contactEmail.trim() }),
      ...(config.from && { from: config.from.trim() }),
      ...(config.fromName?.trim() && { fromName: config.fromName.trim() }),
      ...(config.replyTo?.trim() && { replyTo: config.replyTo.trim() }),
    }

    // Mettre à jour le projet
    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        emailConfig: cleanedConfig as unknown as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        emailConfig: true,
      },
    })

    return NextResponse.json({
      config: updatedProject.emailConfig as unknown as EmailConfig,
      message: 'Configuration mise à jour avec succès',
    })
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la configuration email:', error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}

