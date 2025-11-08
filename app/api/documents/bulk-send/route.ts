import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendDocumentEmail } from '@/lib/email/service'
import { normalizeEmail } from '@/lib/utils'

interface BulkSendRequest {
  documentIds: string[]
}

/**
 * POST /api/documents/bulk-send
 * Envoi d'emails en masse pour plusieurs documents
 */
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = (await request.json()) as BulkSendRequest

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

    // Envoyer les emails
    let successCount = 0
    let failedCount = 0
    const errors: Array<{ documentId: string; error: string }> = []

    for (const doc of documents) {
      try {
        // Vérifier que le document a un email destinataire
        let recipientEmail: string | undefined = doc.recipientEmail || undefined

        // Sinon, essayer depuis doc.data['recipient_email']
        if (!recipientEmail && doc.data && typeof doc.data === 'object') {
          const data = doc.data as Record<string, unknown>
          const emailFromData = data['recipient_email']
          if (emailFromData && typeof emailFromData === 'string' && emailFromData.trim()) {
            recipientEmail = emailFromData.trim()
          }
        }

        if (!recipientEmail) {
          failedCount++
          errors.push({ documentId: doc.id, error: 'Email du destinataire manquant' })
          continue
        }

        // Normaliser l'email (supprimer espaces, convertir accents, etc.)
        recipientEmail = normalizeEmail(recipientEmail)

        // Valider le format de l'email après normalisation
        const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i
        if (!emailRegex.test(recipientEmail)) {
          failedCount++
          errors.push({ documentId: doc.id, error: "Format d'email invalide après normalisation" })
          continue
        }

        // Vérifier que le document n'est pas en statut 'failed'
        if (doc.status === 'failed') {
          failedCount++
          errors.push({ documentId: doc.id, error: 'Document en erreur' })
          continue
        }

        // Vérifier que le document n'a pas déjà été envoyé
        if (doc.status === 'sent') {
          failedCount++
          errors.push({ documentId: doc.id, error: 'Déjà envoyé' })
          continue
        }

        // Envoyer l'email
        const result = await sendDocumentEmail({
          documentId: doc.id,
          recipientEmail,
          attachDocument: true,
        })

        if (result.success) {
          successCount++
        } else {
          failedCount++
          errors.push({ documentId: doc.id, error: result.error || 'Erreur inconnue' })
        }
      } catch (error) {
        failedCount++
        errors.push({
          documentId: doc.id,
          error: error instanceof Error ? error.message : 'Erreur inconnue',
        })
      }
    }

    return NextResponse.json({
      success: successCount,
      failed: failedCount,
      total: documents.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Bulk send error:', error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}

