import { z } from 'zod'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendDocumentEmailsBatch } from '@/lib/email/service'
import { emailSendingQueue, areQueuesAvailable } from '@/lib/queue/queues'
import type { EmailTemplateVariables } from '@/lib/email/templates'
import type { EmailSendingJobData } from '@/lib/queue/workers'

export const sendBulkEmailSchema = z.object({
  subject: z.string().optional(),
  htmlTemplate: z.string().optional(),
  textTemplate: z.string().optional(),
  variables: z.record(z.unknown()).optional(),
  attachDocument: z.boolean().optional().default(true),
  from: z.string().email().optional(),
  replyTo: z.string().email().optional(),
  useQueue: z.boolean().optional().default(false),
  filterStatus: z.enum(['generated', 'sent', 'failed']).optional(),
})

interface RouteParams {
  params: Promise<{ id: string; templateId: string }>
}

/**
 * POST /api/projects/[id]/templates/[templateId]/send-bulk
 * Envoie des emails en bulk pour tous les documents générés d'un template
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id: projectId, templateId } = await params

    // Vérifier le projet et les permissions
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 })
    }

    if (project.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Vérifier que le template appartient au projet
    const template = await prisma.template.findUnique({
      where: { id: templateId },
      select: { id: true, projectId: true },
    })

    if (!template || template.projectId !== projectId) {
      return NextResponse.json({ error: 'Template non trouvé' }, { status: 404 })
    }

    // Parser et valider le body
    const body = await request.json()
    const validatedData = sendBulkEmailSchema.parse(body)

    // Récupérer les documents à envoyer
    const where: any = {
      templateId,
      projectId,
    }

    // Filtrer par statut si spécifié (par défaut, seulement les documents générés)
    if (validatedData.filterStatus) {
      where.status = validatedData.filterStatus
    } else {
      // Par défaut, seulement les documents générés qui n'ont pas encore été envoyés
      where.status = 'generated'
    }

    // Récupérer tous les documents correspondants (sans filtrer par recipientEmail ici)
    const documents = await prisma.document.findMany({
      where,
      select: {
        id: true,
        recipientEmail: true,
        status: true,
        data: true,
      },
    })

    // Extraire l'email depuis document.recipientEmail OU document.data['recipient_email']
    const documentsWithEmail = documents
      .map((doc) => {
        let email: string | null = doc.recipientEmail

        // Si pas d'email dans recipientEmail, chercher dans data
        if (!email && doc.data && typeof doc.data === 'object') {
          const data = doc.data as Record<string, unknown>
          const emailFromData = data['recipient_email']
          if (emailFromData && typeof emailFromData === 'string' && emailFromData.trim()) {
            email = emailFromData.trim()
          }
        }

        return { ...doc, recipientEmail: email }
      })
      .filter((doc) => doc.recipientEmail !== null && doc.recipientEmail !== '') // Filtrer les documents sans email

    if (documentsWithEmail.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Aucun document à envoyer',
          message: 'Aucun document généré avec une adresse email de destinataire trouvé.',
        },
        { status: 400 }
      )
    }

    // Utiliser BullMQ si disponible et demandé
    const useQueue =
      areQueuesAvailable() && emailSendingQueue !== null && validatedData.useQueue === true

    if (useQueue && emailSendingQueue) {
      // Créer des jobs BullMQ pour chaque document
      const jobs = await Promise.all(
        documentsWithEmail.map((doc) =>
          emailSendingQueue.add(
            'send-email',
            {
              documentId: doc.id,
              recipientEmail: doc.recipientEmail!,
              ...(validatedData.subject && { subject: validatedData.subject }),
              ...(validatedData.htmlTemplate && { htmlTemplate: validatedData.htmlTemplate }),
              ...(validatedData.textTemplate && { textTemplate: validatedData.textTemplate }),
              ...(validatedData.variables && { variables: validatedData.variables }),
              attachDocument: validatedData.attachDocument,
              ...(validatedData.from && { from: validatedData.from }),
              ...(validatedData.replyTo && { replyTo: validatedData.replyTo }),
            } satisfies EmailSendingJobData,
            {
              jobId: `send_${doc.id}_${Date.now()}`,
            }
          )
        )
      )

      return NextResponse.json({
        success: true,
        jobIds: jobs.map((j) => j.id),
        documentsCount: documentsWithEmail.length,
        queue: 'email-sending',
        message: `${documentsWithEmail.length} email(s) en cours d'envoi via la queue. Utilisez GET /api/jobs/[id] pour suivre la progression.`,
        status: 'queued',
      })
    }

    // Envoi synchrone (par défaut)
    const emailPayloads = documentsWithEmail.map((doc) => ({
      documentId: doc.id,
      recipientEmail: doc.recipientEmail!,
      subject: validatedData.subject,
      htmlTemplate: validatedData.htmlTemplate,
      variables: validatedData.variables as EmailTemplateVariables | undefined,
      attachDocument: validatedData.attachDocument,
    }))

    const results = await sendDocumentEmailsBatch(emailPayloads)

    const successCount = results.filter((r) => r.success).length
    const failureCount = results.filter((r) => !r.success).length

    return NextResponse.json({
      success: failureCount === 0,
      results,
      summary: {
        total: documentsWithEmail.length,
        success: successCount,
        failed: failureCount,
      },
      message:
        failureCount === 0
          ? `Tous les ${successCount} email(s) ont été envoyés avec succès.`
          : `${successCount} email(s) envoyé(s), ${failureCount} échec(s).`,
    })
  } catch (error) {
    console.error('Erreur lors de l\'envoi en bulk:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Une erreur est survenue lors de l\'envoi en bulk' },
      { status: 500 }
    )
  }
}

