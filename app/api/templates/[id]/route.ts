import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { storage } from '@/lib/storage'

interface RouteParams {
  params: Promise<{ id: string }>
}

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
    const fileUrl = await storage.getSignedUrl(template.filePath, 3600)

    return NextResponse.json({
      ...template,
      fileUrl,
    })
  } catch (error) {
    console.error('Error fetching template:', error)
    return NextResponse.json(
      { error: 'Une erreur est survenue' },
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

