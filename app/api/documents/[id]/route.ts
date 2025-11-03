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
    if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { id } = await params

    const doc = await prisma.document.findUnique({
      where: { id },
      include: {
        project: { select: { ownerId: true } },
        template: { select: { id: true, name: true } },
      },
    })

    if (!doc) return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
    if (doc.project.ownerId !== session.user.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    let url = ''
    try {
      // Essayer d'obtenir une URL signée (tous les adaptateurs l'implémentent)
      url = await storage.getSignedUrl(doc.filePath, 3600)
    } catch (e) {
      console.error('Error getting signed document URL:', e)
      try {
        // Fallback vers URL normale
        url = await storage.getUrl(doc.filePath)
      } catch (fallbackError) {
        console.error('Error getting fallback URL:', fallbackError)
        return NextResponse.json({ error: 'Impossible de générer l\'URL du document' }, { status: 500 })
      }
    }

    return NextResponse.json({ ...doc, downloadUrl: url })
  } catch (error) {
    console.error('Get document error:', error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { id } = await params

    const doc = await prisma.document.findUnique({
      where: { id },
      include: {
        project: { select: { ownerId: true } },
      },
    })

    if (!doc) return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
    if (doc.project.ownerId !== session.user.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    // Supprimer le fichier du storage
    if (doc.filePath) {
      try {
        await storage.delete(doc.filePath)
      } catch (error) {
        console.error('Error deleting file from storage:', error)
        // Continuer même si la suppression du fichier échoue
      }
    }

    // Supprimer le document de la DB
    await prisma.document.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Document supprimé' }, { status: 200 })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    )
  }
}