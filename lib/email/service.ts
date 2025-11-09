import { prisma } from '@/lib/prisma'
import { createStorageAdapterFromConfig } from '@/lib/storage/config'
import type { StorageConfig } from '@/lib/storage/config'
import { createEmailAdapterFromConfig } from './config'
import { getProjectEmailConfig } from './get-config'
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
  fromName?: string // Ajout du nom de l'expéditeur
  replyTo?: string
  cc?: string | string[]
  bcc?: string | string[]
  additionalAttachment?: {
    filename: string
    url?: string // URL du fichier à télécharger
    content?: string // Contenu en base64 (si upload direct)
    contentType?: string
  }
}

export interface SendDocumentEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Formate l'en-tête "From" avec un nom et une adresse e-mail.
 */
function formatFrom(name?: string, email?: string): string | undefined {
  if (!email) return undefined
  if (!name) return email
  // Échapper les guillemets dans le nom
  const sanitizedName = name.replace(/"/g, '\"')
  return `"${sanitizedName}" <${email}>`
}

/**
 * Envoie un email avec le document généré
 * Supporte le publipostage avec variables dans le template
 */
export async function sendDocumentEmail(
  options: SendDocumentEmailOptions
): Promise<SendDocumentEmailResult> {
  try {
    // Récupérer le document depuis la DB
    const document = await prisma.document.findUnique({
      where: { id: options.documentId },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            mailDefaults: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            ownerId: true,
            storageConfig: true,
            emailConfig: true,
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

    // Récupérer la configuration email du projet
    const projectEmailConfig = await getProjectEmailConfig(document.project.id)

    if (!projectEmailConfig) {
      return {
        success: false,
        error: 'Configuration email non configurée pour ce projet',
      }
    }

    // Créer l'adaptateur email à partir de la configuration du projet
    const emailAdapter = createEmailAdapterFromConfig(projectEmailConfig)

    if (!emailAdapter) {
      return {
        success: false,
        error: "Impossible de créer l'adaptateur email avec la configuration fournie",
      }
    }

    // Construire les variables par défaut
    // Priorité : configuration projet > valeurs par défaut
    const defaultVariables: EmailTemplateVariables = {
      recipient_name: document.recipient || 'Cher destinataire',
      recipient_email: options.recipientEmail,
      document_id: document.id,
      document_status: document.status,
      template_name: document.template.name,
      project_name: document.project.name,
      organization_name: projectEmailConfig.organizationName || 'Oxygen Document',
      app_name: projectEmailConfig.appName || 'Oxygen Document',
      contact_email: projectEmailConfig.contactEmail || projectEmailConfig.from || '',
      message: 'Vous trouverez ci-joint votre document généré.',
      additional_info: '',
      created_at: document.createdAt.toLocaleDateString('fr-FR'),
      created_at_full: new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'full',
        timeStyle: 'short',
      }).format(document.createdAt),
    }

    // Fusionner avec les variables fournies
    const variables: EmailTemplateVariables = {
      ...defaultVariables,
      ...(document.data as EmailTemplateVariables),
      ...options.variables,
    }

    // Générer l'URL de téléchargement signée (valide 7 jours)
    // Utiliser l'adaptateur de stockage du projet ou celui par défaut
    const projectStorageConfig = document.project.storageConfig as StorageConfig | null | undefined
    const projectStorage = createStorageAdapterFromConfig(projectStorageConfig)

    let downloadUrl = ''
    try {
      downloadUrl = await projectStorage.getSignedUrl(document.filePath, 7 * 24 * 60 * 60)
      variables['download_url'] = downloadUrl
    } catch (error) {
      console.error("Erreur lors de la génération de l'URL signée:", error)
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
    const subject =
      options.subject || renderEmailTemplate('Document généré : {{template_name}}', variables)

    // Préparer les pièces jointes si demandé
    const attachments: Array<{
      filename: string
      content: Buffer
      contentType?: string
    }> = []

    // Ajouter le document si demandé
    if (options.attachDocument) {
      attachments.push({
        filename: (() => {
          const mailDefaults = document.template.mailDefaults as
            | { attachmentNamePattern?: string }
            | undefined
          const pattern = mailDefaults?.attachmentNamePattern
          const defaultName = `${document.template.name}-${document.id}.pdf`
          if (pattern) {
            try {
              // Basic sanitization to remove invalid filename characters
              return renderEmailTemplate(pattern, variables).replace(/[/\\?%*:|"<>]/g, '-') + '.pdf'
            } catch (e) {
              console.error('Error rendering attachment filename:', e)
              return defaultName
            }
          }
          return defaultName
        })(),
        content: await projectStorage.getBuffer(document.filePath),
        ...(document.mimeType ? { contentType: document.mimeType } : {}),
      })
    }

    // Ajouter la pièce jointe supplémentaire si fournie
    if (options.additionalAttachment) {
      try {
        let content: Buffer
        const MAX_ADDITIONAL_ATTACHMENT_SIZE = 25 * 1024 * 1024 // 25MB

        if (options.additionalAttachment.url) {
          // Télécharger le fichier depuis l'URL
          const response = await fetch(options.additionalAttachment.url)
          if (!response.ok) {
            throw new Error(`Erreur lors du téléchargement du fichier: ${response.statusText}`)
          }

          // Vérifier la taille du fichier via Content-Length si disponible
          const contentLength = response.headers.get('content-length')
          if (contentLength) {
            const size = parseInt(contentLength, 10)
            if (size > MAX_ADDITIONAL_ATTACHMENT_SIZE) {
              throw new Error(
                `Le fichier téléchargé est trop volumineux. Taille maximale : ${(MAX_ADDITIONAL_ATTACHMENT_SIZE / 1024 / 1024).toFixed(0)}MB (fichier actuel : ${(size / 1024 / 1024).toFixed(2)}MB)`
              )
            }
          }

          const arrayBuffer = await response.arrayBuffer()
          content = Buffer.from(arrayBuffer)

          // Vérifier la taille réelle après téléchargement
          if (content.length > MAX_ADDITIONAL_ATTACHMENT_SIZE) {
            throw new Error(
              `Le fichier téléchargé est trop volumineux. Taille maximale : ${(MAX_ADDITIONAL_ATTACHMENT_SIZE / 1024 / 1024).toFixed(0)}MB (fichier actuel : ${(content.length / 1024 / 1024).toFixed(2)}MB)`
            )
          }
        } else if (options.additionalAttachment.content) {
          // Convertir le contenu base64 en Buffer
          content = Buffer.from(options.additionalAttachment.content, 'base64')

          // Vérifier la taille du fichier décodé (25MB max)
          if (content.length > MAX_ADDITIONAL_ATTACHMENT_SIZE) {
            throw new Error(
              `Le fichier additionnel est trop volumineux. Taille maximale : ${(MAX_ADDITIONAL_ATTACHMENT_SIZE / 1024 / 1024).toFixed(0)}MB (fichier actuel : ${(content.length / 1024 / 1024).toFixed(2)}MB)`
            )
          }
        } else {
          throw new Error('Aucun contenu fourni pour la pièce jointe supplémentaire')
        }

        attachments.push({
          filename: options.additionalAttachment.filename,
          content,
          ...(options.additionalAttachment.contentType
            ? { contentType: options.additionalAttachment.contentType }
            : {}),
        })
      } catch (error) {
        console.error("Erreur lors de l'ajout de la pièce jointe supplémentaire:", error)
        // On continue sans la pièce jointe supplémentaire en cas d'erreur
      }
    }

    // Construire l'en-tête "From"
    const fromAddress = options.from || projectEmailConfig.from
    const fromName = options.fromName || projectEmailConfig.fromName
    const fromHeader = formatFrom(fromName, fromAddress)

    // Envoyer l'email
    const result = await emailAdapter.send({
      to: options.recipientEmail,
      subject,
      html,
      text,
      ...(fromHeader ? { from: fromHeader } : {}),
      ...(options.replyTo || projectEmailConfig.replyTo
        ? { replyTo: options.replyTo || projectEmailConfig.replyTo! }
        : {}),
      ...(options.cc ? { cc: options.cc } : {}),
      ...(options.bcc ? { bcc: options.bcc } : {}),
      ...(attachments.length > 0 ? { attachments } : {}),
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
        errorMessage: result.error || "Erreur lors de l'envoi de l'email",
      },
    })

    return {
      success: false,
      error: result.error || "Erreur lors de l'envoi de l'email",
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
