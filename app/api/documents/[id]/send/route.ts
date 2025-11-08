import { z } from 'zod'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendDocumentEmail } from '@/lib/email/service'
import { emailSendingQueue, areQueuesAvailable } from '@/lib/queue/queues'
import type { EmailTemplateVariables } from '@/lib/email/templates'
import type { EmailSendingJobData } from '@/lib/queue/workers'

export const sendEmailSchema = z.object({
  recipientEmail: z.string().trim().email('Email invalide').optional(), // Optionnel car on peut le récupérer du document
  subject: z.string().optional(),
  htmlTemplate: z.string().optional(),
  textTemplate: z.string().optional(),
  variables: z.record(z.unknown()).optional(),
  attachDocument: z.boolean().optional().default(false),
  from: z.string().trim().email().optional(),
  fromName: z.string().optional(),
  replyTo: z.string().trim().email().optional(),
  cc: z.union([z.string().trim().email(), z.array(z.string().trim().email())]).optional(),
  bcc: z.union([z.string().trim().email(), z.array(z.string().trim().email())]).optional(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/documents/[id]/send
 * Envoie un email avec le document généré
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params

    // Récupérer le document pour vérifier les permissions
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            ownerId: true,
          },
        },
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
    }

    if (document.project.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Vérifier que le document a été généré avec succès
    // Si le statut est 'failed' ET qu'il n'y a pas de fichier, on rejette
    if (document.status === 'failed' && !document.filePath) {
      return NextResponse.json(
        { error: "Le document a échoué lors de la génération et aucun fichier n'est disponible" },
        { status: 400 }
      )
    }

    // Si le document n'a pas de fichier, on ne peut pas l'envoyer
    if (!document.filePath) {
      return NextResponse.json(
        { error: "Le document n'a pas de fichier généré. Veuillez régénérer le document." },
        { status: 400 }
      )
    }

    // Parser et valider le body
    const rawBody = await request.json()

    // Récupérer l'email du destinataire : depuis le body OU depuis le document
    let recipientEmail: string | undefined =
      (typeof rawBody['recipientEmail'] === 'string' && rawBody['recipientEmail'].trim()) ||
      undefined

    // Si pas fourni dans le body, essayer de le récupérer depuis le document
    if (!recipientEmail) {
      // 1. Essayer depuis document.recipientEmail
      if (document.recipientEmail) {
        recipientEmail = document.recipientEmail
      }
      // 2. Sinon, essayer depuis document.data['recipient_email']
      else if (document.data && typeof document.data === 'object') {
        const data = document.data as Record<string, unknown>
        const emailFromData = data['recipient_email']
        if (emailFromData && typeof emailFromData === 'string' && emailFromData.trim()) {
          recipientEmail = emailFromData.trim()
        }
      }
    }

    // Valider que l'email est présent
    if (!recipientEmail) {
      return NextResponse.json(
        {
          error:
            'Email du destinataire manquant. Veuillez fournir un email ou configurer le mapping dans le template.',
        },
        { status: 400 }
      )
    }

    // Valider le format de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(recipientEmail)) {
      return NextResponse.json({ error: "Format d'email invalide" }, { status: 400 })
    }

    // Préprocesser les données : convertir les chaînes vides en undefined
    const preprocessedBody: Record<string, unknown> = {
      ...rawBody,
      recipientEmail, // Utiliser l'email récupéré
    }

    // Ajouter les champs optionnels seulement s'ils ont une valeur
    if (rawBody['from'] && typeof rawBody['from'] === 'string' && rawBody['from'].trim()) {
      preprocessedBody['from'] = rawBody['from'].trim()
    }
    if (rawBody['replyTo'] && typeof rawBody['replyTo'] === 'string' && rawBody['replyTo'].trim()) {
      preprocessedBody['replyTo'] = rawBody['replyTo'].trim()
    }
    if (rawBody['cc']) {
      if (typeof rawBody['cc'] === 'string' && rawBody['cc'].trim()) {
        preprocessedBody['cc'] = rawBody['cc'].trim()
      } else if (Array.isArray(rawBody['cc']) && rawBody['cc'].length > 0) {
        preprocessedBody['cc'] = rawBody['cc']
      }
    }
    if (rawBody['bcc']) {
      if (typeof rawBody['bcc'] === 'string' && rawBody['bcc'].trim()) {
        preprocessedBody['bcc'] = rawBody['bcc'].trim()
      } else if (Array.isArray(rawBody['bcc']) && rawBody['bcc'].length > 0) {
        preprocessedBody['bcc'] = rawBody['bcc']
      }
    }

    const validatedData = sendEmailSchema.parse(preprocessedBody)

    // S'assurer que recipientEmail est défini dans validatedData
    validatedData.recipientEmail = recipientEmail

    // Utiliser BullMQ si disponible (pour envois en batch futurs)
    const useQueue =
      areQueuesAvailable() && emailSendingQueue !== null && rawBody['useQueue'] === true

    if (useQueue && emailSendingQueue) {
      // Créer un job BullMQ pour l'envoi asynchrone
      const job = await emailSendingQueue.add('send-email', {
        documentId: id,
        recipientEmail: validatedData.recipientEmail,
        ...(validatedData.subject && { subject: validatedData.subject }),
        ...(validatedData.htmlTemplate && { htmlTemplate: validatedData.htmlTemplate }),
        ...(validatedData.textTemplate && { textTemplate: validatedData.textTemplate }),
        ...(validatedData.variables && { variables: validatedData.variables }),
        attachDocument: validatedData.attachDocument,
        ...(validatedData.from && { from: validatedData.from }),
        ...(validatedData.fromName && { fromName: validatedData.fromName }),
        ...(validatedData.replyTo && { replyTo: validatedData.replyTo }),
        ...(validatedData.cc && { cc: validatedData.cc }),
        ...(validatedData.bcc && { bcc: validatedData.bcc }),
      } satisfies EmailSendingJobData)

      return NextResponse.json({
        success: true,
        jobId: job.id,
        queue: 'email-sending',
        message: "Email en cours d'envoi. Utilisez GET /api/jobs/[id] pour suivre le statut.",
        status: 'queued',
      })
    }

    // Envoi synchrone (par défaut)
    const result = await sendDocumentEmail({
      documentId: id,
      recipientEmail: validatedData.recipientEmail,
      ...(validatedData.subject && { subject: validatedData.subject }),
      ...(validatedData.htmlTemplate && { htmlTemplate: validatedData.htmlTemplate }),
      ...(validatedData.textTemplate && { textTemplate: validatedData.textTemplate }),
      ...(validatedData.variables && {
        variables: validatedData.variables as EmailTemplateVariables,
      }),
      attachDocument: validatedData.attachDocument,
      ...(validatedData.from && { from: validatedData.from }),
      ...(validatedData.fromName && { fromName: validatedData.fromName }),
      ...(validatedData.replyTo && { replyTo: validatedData.replyTo }),
      ...(validatedData.cc && { cc: validatedData.cc }),
      ...(validatedData.bcc && { bcc: validatedData.bcc }),
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Erreur lors de l'envoi de l'email" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: 'Email envoyé avec succès',
    })
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email:", error)

    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      const errorMessage = firstError?.message || 'Données invalides'
      return NextResponse.json(
        {
          error: errorMessage,
          details: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}
