import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { areQueuesAvailable, emailSendingQueue } from '@/lib/queue/queues'
import { sendDocumentEmail } from '@/lib/email/service'
import type { EmailTemplateVariables } from '@/lib/email/templates'

const bulkSchema = z.object({
  documentIds: z.array(z.string()).min(1),
  subject: z.string().optional(),
  htmlTemplate: z.string().optional(),
  textTemplate: z.string().optional(),
  variables: z.record(z.unknown()).optional(),
  attachDocument: z.boolean().optional().default(false),
  from: z.string().email().optional(),
  fromName: z.string().optional(),
  replyTo: z.string().email().optional(),
  cc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  bcc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  useQueue: z.boolean().optional().default(true),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id: templateId } = await params
    const body = await request.json()
    const validated = bulkSchema.parse(body)

    const template = await prisma.template.findFirst({
      where: { id: templateId, project: { ownerId: session.user.id } },
      select: { id: true, projectId: true },
    })

    if (!template) {
      return NextResponse.json({ error: 'Template non trouvé ou non autorisé' }, { status: 404 })
    }

    const docs = await prisma.document.findMany({
      where: { id: { in: validated.documentIds }, templateId: templateId },
      select: { id: true, recipientEmail: true, status: true },
    })

    if (docs.length === 0) {
      return NextResponse.json({ error: 'Aucun document valide' }, { status: 400 })
    }

    const eligible = docs.filter((d) => d.recipientEmail && d.status !== 'failed')
    const withoutEmail = docs.filter((d) => !d.recipientEmail).length

    const useQueue = validated.useQueue && areQueuesAvailable() && emailSendingQueue !== null

    let queued = 0
    let sent = 0
    const errors: Array<{ id: string; error: string }> = []

    if (useQueue && emailSendingQueue) {
      for (const d of eligible) {
        await emailSendingQueue.add('send-email', {
          documentId: d.id,
          recipientEmail: d.recipientEmail!,
          ...(validated.subject && { subject: validated.subject }),
          ...(validated.htmlTemplate && { htmlTemplate: validated.htmlTemplate }),
          ...(validated.textTemplate && { textTemplate: validated.textTemplate }),
          ...(validated.variables && { variables: validated.variables }),
          attachDocument: validated.attachDocument,
          ...(validated.from && { from: validated.from }),
          ...(validated.fromName && { fromName: validated.fromName }),
          ...(validated.replyTo && { replyTo: validated.replyTo }),
          ...(validated.cc && { cc: validated.cc }),
          ...(validated.bcc && { bcc: validated.bcc }),
        })
        queued++
      }
    } else {
      for (const d of eligible) {
        const result = await sendDocumentEmail({
          documentId: d.id,
          recipientEmail: d.recipientEmail!,
          ...(validated.subject && { subject: validated.subject }),
          ...(validated.htmlTemplate && { htmlTemplate: validated.htmlTemplate }),
          ...(validated.textTemplate && { textTemplate: validated.textTemplate }),
          ...(validated.variables && { variables: validated.variables as EmailTemplateVariables }),
          attachDocument: validated.attachDocument,
          ...(validated.from && { from: validated.from }),
          ...(validated.fromName && { fromName: validated.fromName }),
          ...(validated.replyTo && { replyTo: validated.replyTo }),
          ...(validated.cc && { cc: validated.cc }),
          ...(validated.bcc && { bcc: validated.bcc }),
        })
        if (result.success) sent++
        else errors.push({ id: d.id, error: result.error || 'Erreur inconnue' })
      }
    }

    return NextResponse.json({
      success: true,
      templateId,
      requested: validated.documentIds.length,
      eligible: eligible.length,
      queued,
      sent,
      withoutEmail,
      errors,
      mode: useQueue ? 'queued' : 'sync',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Bulk send error:', error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}
