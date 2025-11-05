import { Worker, Job } from 'bullmq'
import { prisma } from '@/lib/prisma'
import { storage } from '@/lib/storage'
import { documentGenerationQueue, emailSendingQueue, createRedisConnection } from './queues'
import { generateDocumentFromTemplate } from '@/lib/pdf/generator'
import { generateDOCX } from '@/lib/generators/docx'
import { convertDOCXToPDFWithStyles } from '@/lib/converters/docx-to-pdf'
import { sendDocumentEmail } from '@/lib/email/service'
import type { CertificateAuthConfig } from '@/lib/qrcode/certificate-auth'
import type { DOCXQRCodeConfig, TemplateField } from '@/shared/types'
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
      const { projectId, templateId, rows, userId, outputFormat, pdfOptions } = job.data

      const documentIds: string[] = []
      const errors: Array<{ row: number; error: string }> = []

      const template = await prisma.template.findUnique({ where: { id: templateId } })
      if (!template || template.projectId !== projectId) {
        throw new Error(`Template ${templateId} non trouvé ou n'appartient pas au projet ${projectId}`)
      }

      const templateBuffer = await storage.getBuffer(template.filePath)

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
          const doc = await prisma.document.create({
            data: {
              projectId,
              templateId,
              data: data as any,
              filePath: '',
              mimeType: '',
              status: 'processing',
              recipient: typeof data['recipient_name'] === 'string' ? (data['recipient_name'] as string) : null,
              recipientEmail: typeof data['recipient_email'] === 'string' ? (data['recipient_email'] as string) : null,
            },
          })
          docId = doc.id

          let documentBuffer: Buffer
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

          if (templateType === 'docx') {
            const qrcodeConfigs = (template.qrcodeConfigs as any[]) ?? []
            const docxBuffer = await generateDOCX(templateBuffer, {
              variables: data,
              qrcodeConfigs,
              documentFilePath: documentKey,
              getStorageUrl,
            })

            documentBuffer = outputFormat === 'pdf'
              ? await convertDOCXToPDFWithStyles(docxBuffer, pdfOptions)
              : docxBuffer

          } else {
            const fields = (template.fields as any[]) ?? []
            const hasQRCodeWithOptions = fields.some(f => f.type === 'qrcode' && (f.qrcodeAuth?.enabled || f.qrcodeStorageUrl?.enabled))
            documentBuffer = await generateDocumentFromTemplate(
              templateBuffer, template.mimeType, fields, data,
              hasQRCodeWithOptions ? { documentFilePath: documentKey, authConfig, getStorageUrl } : undefined
            )
          }

          await storage.upload(documentBuffer, documentKey, outputMimeType)

          await prisma.document.update({
            where: { id: docId },
            data: { filePath: documentKey, mimeType: outputMimeType, status: 'generated' },
          })

          documentIds.push(docId)

        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : 'Erreur inconnue'
          errors.push({ row: i + 1, error: errorMessage })
          console.error(`Erreur génération ligne ${i + 1}:`, e)

          if (docId) {
            await prisma.document.update({
              where: { id: docId },
              data: { status: 'failed', errorMessage },
            })
          }
        }
        await job.updateProgress(Math.round(((i + 1) / rows.length) * 100))
      }

      return { success: errors.length === 0, documentIds, errors }
    },
    { connection: redisConnection, concurrency: 5 }
  )

  worker.on('completed', (job, result) => {
    console.log(`Job ${job.id} complété avec ${result.documentIds.length} documents.`)
  })

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} échoué:`, err)
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
  replyTo?: string
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
      const { documentId, recipientEmail, subject, htmlTemplate, textTemplate, variables, attachDocument, from, replyTo } = job.data

      const result = await sendDocumentEmail({
        documentId,
        recipientEmail,
        ...(subject && { subject }),
        ...(htmlTemplate && { htmlTemplate }),
        ...(textTemplate && { textTemplate }),
        ...(variables && { variables: variables as EmailTemplateVariables }),
        ...(attachDocument !== undefined && { attachDocument }),
        ...(from && { from }),
        ...(replyTo && { replyTo }),
      })

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de l\'envoi de l\'email')
      }

      return {
        success: true,
        ...(result.messageId && { messageId: result.messageId }),
      }
    },
    { connection: redisConnection, concurrency: 10 }
  )

  worker.on('completed', (job) => {
    console.log(`Email job ${job.id} complété:`, job.returnvalue)
  })

  worker.on('failed', (job, err) => {
    console.error(`Email job ${job?.id} échoué:`, err)
  })

  return worker
}

/**
 * Initialise tous les workers
 */
export function initializeWorkers() {
  const documentWorker = createDocumentGenerationWorker()
  const emailWorker = createEmailSendingWorker()

  if (documentWorker) {
    console.log('Worker de génération de documents initialisé')
  }

  if (emailWorker) {
    console.log('Worker d\'envoi d\'emails initialisé')
  }

  return {
    documentWorker,
    emailWorker,
  }
}

