import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { storage } from '@/lib/storage'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET handler remains the same...

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const template = await prisma.template.findFirst({
      where: { id, project: { ownerId: session.user.id } },
    })

    if (!template) {
      return NextResponse.json({ error: 'Template non trouvé ou non autorisé' }, { status: 404 })
    }

    // Fields that can be updated
    const { name, description, qrcodeConfigs, mailDefaults } = body

    const updatedTemplate = await prisma.template.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(qrcodeConfigs && { qrcodeConfigs }),
        ...(mailDefaults && { mailDefaults: mailDefaults as any }),
      } as any,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(updatedTemplate)
  } catch (error) {
    console.error('Error updating template:', error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}

// DELETE handler remains the same...

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params

    const template = await prisma.template.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
      },
    })

    if (!template) {
      return NextResponse.json({ error: 'Template non trouvé' }, { status: 404 })
    }

    // Vérifier que l'utilisateur est le propriétaire du projet
    if (template.project.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Obtenir l'URL du fichier (signed URL pour S3, URL publique pour local)
    let fileUrl: string
    try {
      fileUrl = await storage.getSignedUrl(template.filePath, 3600)
    } catch (storageError) {
      console.error('Error getting signed URL:', storageError)
      // En cas d'erreur, essayer getUrl comme fallback
      fileUrl = await storage.getUrl(template.filePath)
    }

    return NextResponse.json({
      ...template,
      fileUrl,
    })
  } catch (error) {
    console.error('Error fetching template:', error)
    
    // Messages d'erreur plus spécifiques
    const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue'
    
    // Déterminer le code de statut approprié
    if (errorMessage.includes('non trouvé') || errorMessage.includes('not found')) {
      return NextResponse.json(
        { error: 'Template non trouvé' },
        { status: 404 }
      )
    }
    
    if (errorMessage.includes('Non autorisé') || errorMessage.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params

    const template = await prisma.template.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            ownerId: true,
          },
        },
      },
    })

    if (!template) {
      return NextResponse.json({ error: 'Template non trouvé' }, { status: 404 })
    }

    if (template.project.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Supprimer le fichier du storage
    try {
      await storage.delete(template.filePath)
    } catch (error) {
      console.error('Error deleting file from storage:', error)
      // Continuer même si la suppression du fichier échoue
    }

    // Supprimer le template de la DB
    await prisma.template.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Template supprimé' }, { status: 200 })
  } catch (error) {
    console.error('Error deleting template:', error)
    return NextResponse.json(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    )
  }
}

