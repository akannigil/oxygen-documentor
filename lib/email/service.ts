import { prisma } from '@/lib/prisma'
import { storage } from '@/lib/storage/adapters'
import { emailAdapter } from './adapters'
import {
  renderEmailTemplate,
  DEFAULT_EMAIL_TEMPLATE,
  DEFAULT_EMAIL_TEXT_TEMPLATE,
  type EmailTemplateVariables,
} from './templates'

export interface SendDocumentEmailOptions {
  documentId: string
  recipientEmail: string
  subject?: string
  htmlTemplate?: string
  textTemplate?: string
  variables?: EmailTemplateVariables
  attachDocument?: boolean
  from?: string
  replyTo?: string
  cc?: string | string[]
  bcc?: string | string[]
}

export interface SendDocumentEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Envoie un email avec le document généré
 * Supporte le publipostage avec variables dans le template
 */
export async function sendDocumentEmail(
  options: SendDocumentEmailOptions
): Promise<SendDocumentEmailResult> {
  if (!emailAdapter) {
    return {
      success: false,
      error: 'Service email non configuré',
    }
  }

  try {
    // Récupérer le document depuis la DB
    const document = await prisma.document.findUnique({
      where: { id: options.documentId },
      include: {
        template: {
          select: {
            id: true,
            name: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
      },
    })

    if (!document) {
      return {
        success: false,
        error: 'Document non trouvé',
      }
    }

    // Construire les variables par défaut
    const defaultVariables: EmailTemplateVariables = {
      recipient_name: document.recipient || 'Cher destinataire',
      recipient_email: options.recipientEmail,
      document_id: document.id,
      document_status: document.status,
      template_name: document.template.name,
      project_name: document.project.name,
      organization_name: process.env['EMAIL_ORGANIZATION_NAME'] || 'Oxygen Document',
      app_name: process.env['EMAIL_APP_NAME'] || 'Oxygen Document',
      contact_email: process.env['EMAIL_CONTACT'] || process.env['EMAIL_FROM'] || '',
      message: 'Vous trouverez ci-joint votre document généré.',
      additional_info: '',
      created_at: document.createdAt.toLocaleDateString('fr-FR'),
      created_at_full: document.createdAt.toLocaleString('fr-FR'),
    }

    // Fusionner avec les variables fournies
    const variables: EmailTemplateVariables = {
      ...defaultVariables,
      ...(document.data as EmailTemplateVariables),
      ...options.variables,
    }

    // Générer l'URL de téléchargement signée (valide 7 jours)
    let downloadUrl = ''
    try {
      downloadUrl = await storage.getSignedUrl(document.filePath, 7 * 24 * 60 * 60)
      variables['download_url'] = downloadUrl
    } catch (error) {
      console.error('Erreur lors de la génération de l\'URL signée:', error)
      // Continuer sans URL si erreur
    }

    // Préparer le template HTML
    const htmlTemplate = options.htmlTemplate || DEFAULT_EMAIL_TEMPLATE
    let html = renderEmailTemplate(htmlTemplate, variables)

    // Gérer le bouton de téléchargement dans le HTML si URL disponible
    if (downloadUrl) {
      const buttonHtml = `<p><a href="${downloadUrl}" class="button">Télécharger le document</a></p>`
      // Remplacer les blocs conditionnels Handlebars simples
      html = html.replace(/{{#if download_url}}[\s\S]*?{{\/if}}/g, (match) => {
        return match.replace('{{#if download_url}}', '').replace('{{/if}}', '')
      })
      html = html.replace('{{download_url}}', buttonHtml)
    } else {
      html = html.replace(/{{#if download_url}}[\s\S]*?{{\/if}}/g, '')
      html = html.replace('{{download_url}}', '')
    }

    // Préparer le template texte
    const textTemplate = options.textTemplate || DEFAULT_EMAIL_TEXT_TEMPLATE
    let text = renderEmailTemplate(textTemplate, variables)
    
    if (downloadUrl) {
      text = text.replace('{{download_url}}', `Télécharger le document : ${downloadUrl}`)
    } else {
      text = text.replace('{{download_url}}', '')
    }

    // Préparer le sujet
    const subject = options.subject || renderEmailTemplate('Document généré : {{template_name}}', variables)

    // Préparer les pièces jointes si demandé
    const attachments = options.attachDocument
      ? [
          {
            filename: `${document.template.name}-${document.id}.pdf`,
            content: await storage.getBuffer(document.filePath),
            contentType: document.mimeType,
          },
        ]
      : undefined

    // Envoyer l'email
    const result = await emailAdapter.send({
      to: options.recipientEmail,
      subject,
      html,
      text,
      ...(options.from || process.env['EMAIL_FROM'] ? { from: options.from || process.env['EMAIL_FROM']! } : {}),
      ...(options.replyTo || process.env['EMAIL_REPLY_TO'] ? { replyTo: options.replyTo || process.env['EMAIL_REPLY_TO']! } : {}),
      ...(options.cc ? { cc: options.cc } : {}),
      ...(options.bcc ? { bcc: options.bcc } : {}),
      ...(attachments ? { attachments } : {}),
    })

    if (result.success) {
      // Mettre à jour le document dans la DB
      await prisma.document.update({
        where: { id: options.documentId },
        data: {
          status: 'sent',
          recipientEmail: options.recipientEmail,
          emailSentAt: new Date(),
          errorMessage: null,
        },
      })

      return {
        success: true,
        ...(result.messageId ? { messageId: result.messageId } : {}),
      }
    }

    // En cas d'échec, mettre à jour le statut
    await prisma.document.update({
      where: { id: options.documentId },
      data: {
        status: 'failed',
        errorMessage: result.error || 'Erreur lors de l\'envoi de l\'email',
      },
    })

    return {
      success: false,
      error: result.error || 'Erreur lors de l\'envoi de l\'email',
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    // Mettre à jour le document avec l'erreur
    try {
      await prisma.document.update({
        where: { id: options.documentId },
        data: {
          status: 'failed',
          errorMessage,
        },
      })
    } catch (updateError) {
      console.error('Erreur lors de la mise à jour du document:', updateError)
    }

    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Envoie des emails en batch pour plusieurs documents
 */
export async function sendDocumentEmailsBatch(
  documents: Array<{
    documentId: string
    recipientEmail: string
    subject?: string
    htmlTemplate?: string
    variables?: EmailTemplateVariables
    attachDocument?: boolean
  }>
): Promise<Array<SendDocumentEmailResult & { documentId: string }>> {
  const results = await Promise.allSettled(
    documents.map((doc) =>
      sendDocumentEmail({
        documentId: doc.documentId,
        recipientEmail: doc.recipientEmail,
        ...(doc.subject ? { subject: doc.subject } : {}),
        ...(doc.htmlTemplate ? { htmlTemplate: doc.htmlTemplate } : {}),
        ...(doc.variables ? { variables: doc.variables } : {}),
        ...(doc.attachDocument !== undefined ? { attachDocument: doc.attachDocument } : {}),
      }).then((result) => ({ ...result, documentId: doc.documentId }))
    )
  )

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value
    }
    return {
      documentId: documents[index]?.documentId ?? '',
      success: false,
      error: result.reason?.message || 'Erreur inconnue',
    }
  })
}

