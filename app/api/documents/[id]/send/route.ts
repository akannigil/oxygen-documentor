import { z } from 'zod'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendDocumentEmail } from '@/lib/email/service'
import { emailSendingQueue, areQueuesAvailable } from '@/lib/queue/queues'
import type { EmailTemplateVariables } from '@/lib/email/templates'
import type { EmailSendingJobData } from '@/lib/queue/workers'
import { normalizeEmail } from '@/lib/utils'

// Limite de taille pour les fichiers additionnels : 25MB
// En base64, cela représente environ 33MB (25MB * 1.33)
const MAX_ADDITIONAL_ATTACHMENT_SIZE = 25 * 1024 * 1024 // 25MB
const MAX_ADDITIONAL_ATTACHMENT_SIZE_BASE64 = Math.ceil(MAX_ADDITIONAL_ATTACHMENT_SIZE * 1.33) // ~33MB en base64

export const sendEmailSchema = z.object({
  recipientEmail: z
    .string()
    .transform((val) => normalizeEmail(val))
    .pipe(z.string().email('Email invalide'))
    .optional(), // Optionnel car on peut le récupérer du document
  subject: z.string().optional(),
  htmlTemplate: z.string().optional(),
  textTemplate: z.string().optional(),
  variables: z.record(z.unknown()).optional(),
  attachDocument: z.boolean().optional().default(false),
  from: z
    .string()
    .transform((val) => normalizeEmail(val))
    .pipe(z.string().email())
    .optional(),
  fromName: z.string().optional(),
  replyTo: z
    .string()
    .transform((val) => normalizeEmail(val))
    .pipe(z.string().email())
    .optional(),
  cc: z
    .union([
      z
        .string()
        .transform((val) => normalizeEmail(val))
        .pipe(z.string().email()),
      z.array(
        z
          .string()
          .transform((val) => normalizeEmail(val))
          .pipe(z.string().email())
      ),
    ])
    .optional(),
  bcc: z
    .union([
      z
        .string()
        .transform((val) => normalizeEmail(val))
        .pipe(z.string().email()),
      z.array(
        z
          .string()
          .transform((val) => normalizeEmail(val))
          .pipe(z.string().email())
      ),
    ])
    .optional(),
  additionalAttachment: z
    .object({
      filename: z.string(),
      url: z.string().url().optional(),
      content: z.string().optional(), // base64
      contentType: z.string().optional(),
    })
    .refine((data) => data.url || data.content, {
      message: 'Soit url soit content doit être fourni',
    })
    .refine(
      (data) => {
        // Si c'est un contenu base64, vérifier la taille
        if (data.content) {
          // La taille en base64 est environ 33% plus grande que l'original
          // On vérifie que le contenu base64 ne dépasse pas ~33MB
          const base64Size = Buffer.byteLength(data.content, 'utf8')
          return base64Size <= MAX_ADDITIONAL_ATTACHMENT_SIZE_BASE64
        }
        // Pour les URLs, on ne peut pas vérifier la taille ici
        // La vérification se fera lors du téléchargement dans le service email
        return true
      },
      {
        message: `Le fichier additionnel est trop volumineux. Taille maximale : ${(MAX_ADDITIONAL_ATTACHMENT_SIZE / 1024 / 1024).toFixed(0)}MB`,
      }
    )
    .optional(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

// Configuration Next.js pour accepter les body jusqu'à 35MB (pour les fichiers base64)
// Note: Dans App Router, on doit utiliser runtime = 'nodejs' et gérer la limite via middleware
// ou vérifier la taille avant de parser le JSON
export const runtime = 'nodejs'
export const maxDuration = 60 // 60 secondes max pour l'envoi

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

    // Vérifier la taille du body via Content-Length si disponible
    const contentLength = request.headers.get('content-length')
    const MAX_BODY_SIZE = 35 * 1024 * 1024 // 35MB (pour accommoder 25MB en base64)

    if (contentLength) {
      const bodySize = parseInt(contentLength, 10)
      if (bodySize > MAX_BODY_SIZE) {
        return NextResponse.json(
          {
            error: `Le corps de la requête est trop volumineux. Taille maximale : ${(MAX_BODY_SIZE / 1024 / 1024).toFixed(0)}MB (requête actuelle : ${(bodySize / 1024 / 1024).toFixed(2)}MB)`,
          },
          { status: 413 }
        )
      }
    }

    // Parser et valider le body
    // Note: Next.js limite par défaut à 1MB pour request.json()
    // Pour augmenter la limite, on doit utiliser runtime = 'nodejs' (déjà fait)
    // et gérer les erreurs de taille si nécessaire
    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch (error) {
      // Si l'erreur est liée à la taille, retourner un message clair
      if (error instanceof Error && error.message.includes('size')) {
        return NextResponse.json(
          {
            error: `Le corps de la requête est trop volumineux. Taille maximale : ${(MAX_BODY_SIZE / 1024 / 1024).toFixed(0)}MB`,
          },
          { status: 413 }
        )
      }
      return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
    }

    // Récupérer l'email du destinataire : depuis le body OU depuis le document
    // Vérifier que rawBody est un objet avant d'accéder à ses propriétés
    const body = rawBody && typeof rawBody === 'object' ? (rawBody as Record<string, unknown>) : {}
    let recipientEmail: string | undefined =
      (typeof body['recipientEmail'] === 'string' && body['recipientEmail'].trim()) || undefined

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

    // Normaliser l'email (supprimer espaces, convertir accents, etc.)
    recipientEmail = normalizeEmail(recipientEmail)

    // Valider le format de l'email après normalisation
    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i
    if (!emailRegex.test(recipientEmail)) {
      return NextResponse.json({ error: "Format d'email invalide" }, { status: 400 })
    }

    // Préprocesser les données : convertir les chaînes vides en undefined
    const preprocessedBody: Record<string, unknown> = {
      ...body,
      recipientEmail, // Utiliser l'email récupéré
    }

    // Ajouter les champs optionnels seulement s'ils ont une valeur
    if (body['from'] && typeof body['from'] === 'string' && body['from'].trim()) {
      preprocessedBody['from'] = body['from'].trim()
    }
    if (body['replyTo'] && typeof body['replyTo'] === 'string' && body['replyTo'].trim()) {
      preprocessedBody['replyTo'] = body['replyTo'].trim()
    }
    if (body['cc']) {
      if (typeof body['cc'] === 'string' && body['cc'].trim()) {
        preprocessedBody['cc'] = body['cc'].trim()
      } else if (Array.isArray(body['cc']) && body['cc'].length > 0) {
        preprocessedBody['cc'] = body['cc']
      }
    }
    if (body['bcc']) {
      if (typeof body['bcc'] === 'string' && body['bcc'].trim()) {
        preprocessedBody['bcc'] = body['bcc'].trim()
      } else if (Array.isArray(body['bcc']) && body['bcc'].length > 0) {
        preprocessedBody['bcc'] = body['bcc']
      }
    }

    const validatedData = sendEmailSchema.parse(preprocessedBody)

    // S'assurer que recipientEmail est défini dans validatedData
    validatedData.recipientEmail = recipientEmail

    // Utiliser BullMQ si disponible (pour envois en batch futurs)
    const useQueue = areQueuesAvailable() && emailSendingQueue !== null && body['useQueue'] === true

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
        ...(validatedData.additionalAttachment
          ? {
              additionalAttachment: (() => {
                const att = validatedData.additionalAttachment!
                return {
                  filename: att.filename,
                  ...(att.url ? { url: att.url } : {}),
                  ...(att.content ? { content: att.content } : {}),
                  ...(att.contentType ? { contentType: att.contentType } : {}),
                }
              })(),
            }
          : {}),
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
      ...(validatedData.additionalAttachment
        ? {
            additionalAttachment: (() => {
              const att = validatedData.additionalAttachment!
              return {
                filename: att.filename,
                ...(att.url ? { url: att.url } : {}),
                ...(att.content ? { content: att.content } : {}),
                ...(att.contentType ? { contentType: att.contentType } : {}),
              }
            })(),
          }
        : {}),
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
