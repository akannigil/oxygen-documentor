import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateDOCXQRCodeConfigsSchema } from '@/shared/schemas/template'

interface RouteParams {
  params: {
    id: string
    templateId: string
  }
}

/**
 * PUT /api/projects/[id]/templates/[templateId]/qrcode-configs
 * Mise à jour des configurations QR Code pour un template DOCX
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id: projectId, templateId } = params

    // Vérifier que le projet appartient à l'utilisateur
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        templates: {
          where: { id: templateId },
        },
      },
    })

    if (!project || project.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 })
    }

    const template = project.templates[0]
    if (!template) {
      return NextResponse.json({ error: 'Template non trouvé' }, { status: 404 })
    }

    // Vérifier que c'est un template DOCX
    if (template.templateType !== 'docx') {
      return NextResponse.json(
        { error: 'Cette fonctionnalité est uniquement disponible pour les templates DOCX' },
        { status: 400 }
      )
    }

    // Valider les données
    const body = await request.json()
    const validation = updateDOCXQRCodeConfigsSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { qrcodeConfigs } = validation.data

    // Mettre à jour le template
    const updatedTemplate = await prisma.template.update({
      where: { id: templateId },
      data: {
        qrcodeConfigs: qrcodeConfigs as never, // JSON type
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      qrcodeConfigs: updatedTemplate.qrcodeConfigs,
    })
  } catch (error) {
    console.error('Erreur lors de la mise à jour des configurations QR Code:', error)
    return NextResponse.json({ error: 'Erreur serveur lors de la mise à jour' }, { status: 500 })
  }
}

/**
 * GET /api/projects/[id]/templates/[templateId]/qrcode-configs
 * Récupération des configurations QR Code d'un template
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id: projectId, templateId } = params

    // Vérifier que le projet appartient à l'utilisateur
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        templates: {
          where: { id: templateId },
        },
      },
    })

    if (!project || project.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 })
    }

    const template = project.templates[0]
    if (!template) {
      return NextResponse.json({ error: 'Template non trouvé' }, { status: 404 })
    }

    return NextResponse.json({
      qrcodeConfigs: template.qrcodeConfigs || [],
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des configurations QR Code:', error)
    return NextResponse.json({ error: 'Erreur serveur lors de la récupération' }, { status: 500 })
  }
}
