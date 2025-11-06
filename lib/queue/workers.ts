import { Worker, Job } from 'bullmq'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { storage } from '@/lib/storage'
import { documentGenerationQueue, emailSendingQueue, createRedisConnection } from './queues'
import { sendDocumentEmail } from '@/lib/email/service'
import { generateDocumentBuffer } from '@/lib/generation/service'
import { sanitizeVariables } from '@/lib/generation/sanitize'
import type { CertificateAuthConfig } from '@/lib/qrcode/certificate-auth'
import type { EmailTemplateVariables } from '@/lib/email/templates'

/**
 * Types pour les jobs de génération de documents
 */
export interface DocumentGenerationJobData {
  projectId: string
  templateId: string
  rows: Array<Record<string, unknown>>
  userId: string
  outputFormat?: 'docx' | 'pdf'
  pdfOptions?: {
    format?: 'A4' | 'A3' | 'Letter' | 'Legal' | 'Tabloid'
    orientation?: 'portrait' | 'landscape'
    margins?: { top?: string; right?: string; bottom?: string; left?: string }
    method?: 'libreoffice' | 'puppeteer'
  }
  styleOptions?: {
    defaultStyle?: {
      fontFamily?: string
      fontSize?: number
      color?: string
      bold?: boolean
      italic?: boolean
      underline?: boolean
    }
    variableStyles?: Record<string, {
      fontFamily?: string
      fontSize?: number
      color?: string
      bold?: boolean
      italic?: boolean
      underline?: boolean
    }>
  }
}

export interface DocumentGenerationJobResult {
  success: boolean
  documentIds: string[]
  errors: Array<{ row: number; error: string }>
}

/**
 * Worker pour la génération de documents
 */
export function createDocumentGenerationWorker(): Worker<DocumentGenerationJobData, DocumentGenerationJobResult> | null {
  const redisConnection = createRedisConnection()
  
  if (!redisConnection || !documentGenerationQueue) {
    console.warn('Redis non configuré, worker de génération désactivé')
    return null
  }

  const worker = new Worker<DocumentGenerationJobData, DocumentGenerationJobResult>(
    'document-generation',
    async (job: Job<DocumentGenerationJobData, DocumentGenerationJobResult>) => {
      console.log(`[Worker] Début du traitement du job ${job.id}`)
      console.log(`[Worker] Job data:`, {
        projectId: job.data.projectId,
        templateId: job.data.templateId,
        rowsCount: job.data.rows.length,
        userId: job.data.userId,
        outputFormat: job.data.outputFormat,
      })

      const { projectId, templateId, rows, outputFormat, pdfOptions, styleOptions } = job.data

      const documentIds: string[] = []
      const errors: Array<{ row: number; error: string }> = []

      try {
        const template = await prisma.template.findUnique({ where: { id: templateId } })
        if (!template) {
          throw new Error(`Template ${templateId} non trouvé`)
        }
        if (template.projectId !== projectId) {
          throw new Error(`Template ${templateId} n'appartient pas au projet ${projectId}`)
        }
        console.log(`[Worker] Template trouvé: ${template.name} (type: ${template.mimeType})`)

        // Récupérer le mapping des colonnes depuis mailDefaults
        const mailDefaults = ((template as unknown as { mailDefaults?: {
          columnMapping?: {
            recipient_name?: string
            recipient_email?: string
          }
        } }).mailDefaults) ?? null
        const columnMapping = mailDefaults?.columnMapping

        const templateBuffer = await storage.getBuffer(template.filePath)
        console.log(`[Worker] Template buffer récupéré: ${templateBuffer.length} bytes`)

        const getTemplateType = (mimeType: string): 'pdf' | 'image' | 'docx' => {
          if (mimeType === 'application/pdf') return 'pdf'
          if (mimeType.startsWith('image/')) return 'image'
          if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx'
          return 'pdf'
        }
        const templateType = getTemplateType(template.mimeType)

        const authConfig: CertificateAuthConfig | undefined = process.env['CERTIFICATE_SECRET_KEY']
          ? { secretKey: process.env['CERTIFICATE_SECRET_KEY'], verificationBaseUrl: process.env['CERTIFICATE_VERIFICATION_BASE_URL']!, algorithm: 'sha256' }
          : undefined

        const getStorageUrl = (filePath: string, signed = false, expiresIn = 3600) => {
          return signed ? storage.getSignedUrl(filePath, expiresIn) : storage.getUrl(filePath)
        }

        for (let i = 0; i < rows.length; i++) {
          const data = rows[i] ?? {}
          let docId: string | null = null

          try {
            console.log(`[Worker] Traitement ligne ${i + 1}/${rows.length}`)
            
            const finalData = { ...data }

            // Simplification: Récupérer directement les données mappées depuis le front-end
            const recipientEmail = (finalData.recipientEmail as string) || null
            const recipientName = (finalData.recipientName as string) || (recipientEmail?.split('@')[0]) || null

            // Log pour debug si email manquant
            if (!recipientEmail) {
              console.warn(`[Worker] Ligne ${i + 1}: Aucun email destinataire trouvé dans les données mappées. Colonnes disponibles:`, Object.keys(finalData))
            }
            
            const doc = await prisma.document.create({
              data: {
                projectId,
                templateId,
                data: finalData as unknown as Prisma.InputJsonValue,
                filePath: '',
                mimeType: '',
                status: 'processing',
                recipient: recipientName,
                recipientEmail: recipientEmail,
              },
            })
            docId = doc.id
            console.log(`[Worker] Document créé en DB: ${docId}`)
            let outputMimeType: string
            let fileExtension: string

            if (templateType === 'docx') {
              outputMimeType = outputFormat === 'pdf'
                ? 'application/pdf'
                : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
              fileExtension = outputFormat === 'pdf' ? 'pdf' : 'docx'
            } else {
              outputMimeType = 'application/pdf'
              fileExtension = 'pdf'
            }

            const documentKey = `projects/${projectId}/documents/${docId}.${fileExtension}`

            const genResult = await generateDocumentBuffer({
              templateType,
              templateMimeType: template.mimeType,
              templateBuffer,
              data: sanitizeVariables(finalData as Record<string, unknown>),
              fields: (template.fields as unknown as import('@/shared/types').TemplateField[] | undefined) ?? [],
              qrcodeConfigs: (template.qrcodeConfigs as unknown as import('@/shared/types').DOCXQRCodeConfig[] | undefined) ?? [],
              documentFilePath: documentKey,
              getStorageUrl,
              ...(authConfig ? { authConfig } : {}),
              ...(pdfOptions ? { pdfOptions } : {}),
              ...(styleOptions ? { styleOptions } : {}),
              outputFormat: (templateType === 'docx' ? (outputFormat ?? 'docx') : 'pdf'),
            })

            const documentBuffer = genResult.buffer
            outputMimeType = genResult.mimeType

            console.log(`[Worker] Upload du document ${docId} vers ${documentKey}`)
            await storage.upload(documentBuffer, documentKey, outputMimeType)

            await prisma.document.update({
              where: { id: docId },
              data: { filePath: documentKey, mimeType: outputMimeType, status: 'generated' },
            })

            documentIds.push(docId)
            console.log(`[Worker] Document ${docId} généré avec succès`)

          } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Erreur inconnue'
            const errorStack = e instanceof Error ? e.stack : String(e)
            errors.push({ row: i + 1, error: errorMessage })
            console.error(`[Worker] ❌ Erreur génération ligne ${i + 1}:`, errorMessage)
            console.error(`[Worker] Stack trace:`, errorStack)

            if (docId) {
              await prisma.document.update({
                where: { id: docId },
                data: { status: 'failed', errorMessage },
              })
            }
          }
          await job.updateProgress({ percent: Math.round(((i + 1) / rows.length) * 100), current: i + 1, total: rows.length })
        }

        const result = { success: errors.length === 0, documentIds, errors }
        console.log(`[Worker] ✅ Job ${job.id} terminé: ${documentIds.length} documents générés, ${errors.length} erreurs`)
        return result
      } catch (error) {
        // Erreur fatale avant le traitement des lignes (template introuvable, etc.)
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
        const errorStack = error instanceof Error ? error.stack : String(error)
        console.error(`[Worker] ❌ Erreur fatale du job ${job.id}:`, errorMessage)
        console.error(`[Worker] Stack trace:`, errorStack)
        throw error // Re-lancer pour que BullMQ marque le job comme failed
      }
    },
    { connection: redisConnection, concurrency: 5 }
  )

  worker.on('completed', (job, result) => {
    console.log(`[Worker] ✅ Job ${job.id} complété avec ${result.documentIds.length} documents sur ${result.documentIds.length + result.errors.length} total`)
    if (result.errors.length > 0) {
      console.log(`[Worker] ⚠️  Erreurs rencontrées:`, result.errors)
    }
  })

  worker.on('failed', (job, err) => {
    console.error(`[Worker] ❌ Job ${job?.id} échoué:`, err)
    if (err instanceof Error) {
      console.error(`[Worker] Stack trace:`, err.stack)
    }
  })

  worker.on('error', (err) => {
    console.error(`[Worker] ❌ Erreur du worker:`, err)
  })

  worker.on('active', (job) => {
    console.log(`[Worker] 🔄 Job ${job.id} en cours de traitement`)
  })

  return worker
}

/**
 * Types pour les jobs d'envoi d'emails
 */
export interface EmailSendingJobData {
  documentId: string
  recipientEmail: string
  subject?: string
  htmlTemplate?: string
  textTemplate?: string
  variables?: Record<string, unknown>
  attachDocument?: boolean
  from?: string
  fromName?: string
  replyTo?: string
  cc?: string | string[]
  bcc?: string | string[]
}

/**
 * Worker pour l'envoi d'emails
 */
export function createEmailSendingWorker(): Worker<EmailSendingJobData, { success: boolean; messageId?: string }> | null {
  const redisConnection = createRedisConnection()
  
  if (!redisConnection || !emailSendingQueue) {
    console.warn('Redis non configuré, worker d\'envoi email désactivé')
    return null
  }

  const worker = new Worker<EmailSendingJobData, { success: boolean; messageId?: string }>(
    'email-sending',
    async (job: Job<EmailSendingJobData, { success: boolean; messageId?: string }>) => {
      const { documentId, recipientEmail, subject, htmlTemplate, textTemplate, variables, attachDocument, from, fromName, replyTo, cc, bcc } = job.data

      const result = await sendDocumentEmail({
        documentId,
        recipientEmail,
        ...(subject && { subject }),
        ...(htmlTemplate && { htmlTemplate }),
        ...(textTemplate && { textTemplate }),
        ...(variables && { variables: variables as EmailTemplateVariables }),
        ...(attachDocument !== undefined && { attachDocument }),
        ...(from && { from }),
        ...(fromName && { fromName }),
        ...(replyTo && { replyTo }),
        ...(cc && { cc }),
        ...(bcc && { bcc }),
      })

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de l\'envoi de l\'email')
      }

      // Ajouter un délai pour respecter les limites de taux du service d'envoi d'emails
      await new Promise(resolve => setTimeout(resolve, 500)); // 500ms de délai = 2 requêtes/seconde

      return {
        success: true,
        ...(result.messageId && { messageId: result.messageId }),
      }
    },
    { connection: redisConnection, concurrency: 1 }
  )

  worker.on('completed', (job) => {
    console.log(`Email job ${job.id} complété:`, job.returnvalue)
  })

  worker.on('failed', (job, err) => {
    console.error(`Email job ${job?.id} échoué:`, err)
  })

  return worker
}

// Références globales aux workers pour éviter les créations multiples
let globalDocumentWorker: ReturnType<typeof createDocumentGenerationWorker> | null = null
let globalEmailWorker: ReturnType<typeof createEmailSendingWorker> | null = null

/**
 * Initialise tous les workers
 * Les workers sont créés une seule fois et réutilisés
 */
export function initializeWorkers() {
  // Si les workers existent déjà, les retourner
  if (globalDocumentWorker && globalEmailWorker) {
    return {
      documentWorker: globalDocumentWorker,
      emailWorker: globalEmailWorker,
    }
  }

  // Créer les workers seulement s'ils n'existent pas
  if (!globalDocumentWorker) {
    globalDocumentWorker = createDocumentGenerationWorker()
    if (globalDocumentWorker) {
      console.log('✅ Worker de génération de documents initialisé')
    }
  }

  if (!globalEmailWorker) {
    globalEmailWorker = createEmailSendingWorker()
    if (globalEmailWorker) {
      console.log('✅ Worker d\'envoi d\'emails initialisé')
    }
  }

  return {
    documentWorker: globalDocumentWorker,
    emailWorker: globalEmailWorker,
  }
}

