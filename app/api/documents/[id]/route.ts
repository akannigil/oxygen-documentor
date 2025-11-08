import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createStorageAdapterFromConfig } from '@/lib/storage/config'
import type { StorageConfig } from '@/lib/storage/config'

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
        project: { 
          select: { 
            ownerId: true,
            storageConfig: true,
          } 
        },
        template: { select: { id: true, name: true } },
      },
    })

    if (!doc) return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
    if (doc.project.ownerId !== session.user.id)
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    // Utiliser l'adaptateur de stockage du projet ou celui par défaut
    const projectStorageConfig = doc.project.storageConfig as StorageConfig | null | undefined
    const projectStorage = createStorageAdapterFromConfig(projectStorageConfig)

    let url = ''
    try {
      // Essayer d'obtenir une URL signée (tous les adaptateurs l'implémentent)
      url = await projectStorage.getSignedUrl(doc.filePath, 3600)
    } catch (e) {
      console.error('Error getting signed document URL:', e)
      try {
        // Fallback vers URL normale
        url = await projectStorage.getUrl(doc.filePath)
      } catch (fallbackError) {
        console.error('Error getting fallback URL:', fallbackError)
        return NextResponse.json(
          { error: "Impossible de générer l'URL du document" },
          { status: 500 }
        )
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

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID de document invalide' }, { status: 400 })
    }

    const doc = await prisma.document.findUnique({
      where: { id },
      include: {
        project: { 
          select: { 
            ownerId: true,
            storageConfig: true,
          } 
        },
      },
    })

    if (!doc) {
      console.error(`Document not found: ${id}`)
      return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
    }

    if (!doc.project) {
      console.error(`Document ${id} has no associated project`)
      return NextResponse.json({ error: 'Projet associé introuvable' }, { status: 404 })
    }

    if (doc.project.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Supprimer le fichier du storage (si présent)
    // On continue même si le fichier n'existe pas ou si la suppression échoue
    if (doc.filePath) {
      try {
        // Utiliser l'adaptateur de stockage du projet ou celui par défaut
        const projectStorageConfig = doc.project.storageConfig as StorageConfig | null | undefined
        const projectStorage = createStorageAdapterFromConfig(projectStorageConfig)
        await projectStorage.delete(doc.filePath)
        console.log(`File deleted from storage: ${doc.filePath}`)
      } catch (error) {
        console.warn(`File not found or error deleting from storage (${doc.filePath}):`, error)
        // Continuer même si le fichier n'existe pas ou si la suppression échoue
      }
    }

    // Toujours supprimer le document de la DB, même si le fichier n'existe pas
    try {
      await prisma.document.delete({
        where: { id },
      })
      console.log(`Document deleted from DB: ${id}`)
    } catch (dbError) {
      console.error('Error deleting document from DB:', dbError)
      // Si le document n'existe plus en DB, on considère que c'est déjà fait
      if (dbError instanceof Error && dbError.message.includes('Record to delete does not exist')) {
        console.log(`Document ${id} already deleted from DB`)
        return NextResponse.json({ message: 'Document supprimé' }, { status: 200 })
      }
      throw dbError
    }

    return NextResponse.json({ message: 'Document supprimé' }, { status: 200 })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { status } = body

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID de document invalide' }, { status: 400 })
    }

    const doc = await prisma.document.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            ownerId: true,
          },
        },
      },
    })

    if (!doc) {
      return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
    }

    if (doc.project.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Valider le statut
    if (status && !['generated', 'sent', 'failed'].includes(status)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
    }

    // Mettre à jour le document
    const updateData: {
      status?: string
      emailSentAt?: null
      errorMessage?: null
    } = {}

    if (status) {
      updateData.status = status
      // Si on réinitialise à 'generated', on supprime les métadonnées d'envoi
      if (status === 'generated') {
        updateData.emailSentAt = null
        updateData.errorMessage = null
      }
    }

    const updatedDoc = await prisma.document.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ message: 'Document mis à jour', document: updatedDoc }, { status: 200 })
  } catch (error) {
    console.error('Error updating document:', error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}
