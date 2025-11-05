import { z } from 'zod'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendDocumentEmail } from '@/lib/email/service'
import { emailSendingQueue, areQueuesAvailable } from '@/lib/queue/queues'
import type { EmailTemplateVariables } from '@/lib/email/templates'
import type { EmailSendingJobData } from '@/lib/queue/workers'

export const sendEmailSchema = z.object({
  recipientEmail: z.string().email('Email invalide'),
  subject: z.string().optional(),
  htmlTemplate: z.string().optional(),
  textTemplate: z.string().optional(),
  variables: z.record(z.unknown()).optional(),
  attachDocument: z.boolean().optional().default(false),
  from: z.string().email().optional(),
  replyTo: z.string().email().optional(),
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

    if (document.status === 'failed') {
      return NextResponse.json(
        { error: 'Le document a échoué lors de la génération' },
        { status: 400 }
      )
    }

    // Parser et valider le body
    const body = await request.json()
    const validatedData = sendEmailSchema.parse(body)

    // Utiliser BullMQ si disponible (pour envois en batch futurs)
    const useQueue = areQueuesAvailable() && emailSendingQueue !== null && body.useQueue === true

    if (useQueue && emailSendingQueue) {
      // Créer un job BullMQ pour l'envoi asynchrone
      const job = await emailSendingQueue.add(
        'send-email',
        {
          documentId: id,
          recipientEmail: validatedData.recipientEmail,
          ...(validatedData.subject && { subject: validatedData.subject }),
          ...(validatedData.htmlTemplate && { htmlTemplate: validatedData.htmlTemplate }),
          ...(validatedData.textTemplate && { textTemplate: validatedData.textTemplate }),
          ...(validatedData.variables && { variables: validatedData.variables }),
          attachDocument: validatedData.attachDocument,
          ...(validatedData.from && { from: validatedData.from }),
          ...(validatedData.replyTo && { replyTo: validatedData.replyTo }),
        } satisfies EmailSendingJobData
      )

      return NextResponse.json({
        success: true,
        jobId: job.id,
        queue: 'email-sending',
        message: 'Email en cours d\'envoi. Utilisez GET /api/jobs/[id] pour suivre le statut.',
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
      ...(validatedData.variables && { variables: validatedData.variables as EmailTemplateVariables }),
      attachDocument: validatedData.attachDocument,
      ...(validatedData.from && { from: validatedData.from }),
      ...(validatedData.replyTo && { replyTo: validatedData.replyTo }),
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Erreur lors de l\'envoi de l\'email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: 'Email envoyé avec succès',
    })
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    )
  }
}

