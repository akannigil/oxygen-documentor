import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createStorageAdapterFromConfig } from '@/lib/storage/config'
import type { StorageConfig } from '@/lib/storage/config'

interface BulkDeleteRequest {
  documentIds: string[]
}

/**
 * DELETE /api/documents/bulk-delete
 * Suppression en masse de plusieurs documents
 */
export async function DELETE(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = (await request.json()) as BulkDeleteRequest

    if (!body.documentIds || !Array.isArray(body.documentIds) || body.documentIds.length === 0) {
      return NextResponse.json(
        { error: 'Liste de documents invalide' },
        { status: 400 }
      )
    }

    // Récupérer tous les documents avec vérification des permissions
    const documents = await prisma.document.findMany({
      where: {
        id: { in: body.documentIds },
        project: { ownerId: session.user.id },
      },
      include: {
        project: {
          select: {
            ownerId: true,
            storageConfig: true,
          },
        },
      },
    })

    if (documents.length === 0) {
      return NextResponse.json(
        { error: 'Aucun document trouvé ou non autorisé' },
        { status: 404 }
      )
    }

    let deletedCount = 0
    const errors: Array<{ documentId: string; error: string }> = []

    // Supprimer les documents
    for (const doc of documents) {
      try {
        // Supprimer le fichier du storage
        if (doc.filePath) {
          try {
            const projectStorageConfig = doc.project.storageConfig as StorageConfig | null | undefined
            const projectStorage = createStorageAdapterFromConfig(projectStorageConfig)
            await projectStorage.delete(doc.filePath)
          } catch (storageError) {
            console.warn(`Erreur lors de la suppression du fichier ${doc.filePath}:`, storageError)
            // Continuer même si le fichier n'existe pas
          }
        }

        // Supprimer de la base de données
        await prisma.document.delete({
          where: { id: doc.id },
        })

        deletedCount++
      } catch (error) {
        errors.push({
          documentId: doc.id,
          error: error instanceof Error ? error.message : 'Erreur inconnue',
        })
      }
    }

    return NextResponse.json({
      deleted: deletedCount,
      total: documents.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Bulk delete error:', error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}

