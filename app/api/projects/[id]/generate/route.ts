import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { storage } from '@/lib/storage'
import { generateDocumentFromTemplate } from '@/lib/pdf/generator'
import { generateDOCX } from '@/lib/generators/docx'
import { convertDOCXToPDFWithStyles } from '@/lib/converters/docx-to-pdf'
import type { TemplateType } from '@/shared/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { id: projectId } = await params
    const body = await request.json()
    const templateId: string | undefined = body.templateId
    const rows: Array<Record<string, string | number>> = Array.isArray(body.rows) ? body.rows : []
    const outputFormat: 'docx' | 'pdf' | undefined = body.outputFormat // Format de sortie pour templates DOCX
    const pdfOptions = body.pdfOptions as {
      format?: 'A4' | 'A3' | 'Letter' | 'Legal' | 'Tabloid'
      orientation?: 'portrait' | 'landscape'
      margins?: {
        top?: string
        right?: string
        bottom?: string
        left?: string
      }
    } | undefined

    if (!templateId) return NextResponse.json({ error: 'templateId requis' }, { status: 400 })
    if (rows.length === 0) return NextResponse.json({ error: 'rows requis' }, { status: 400 })
    if (rows.length > 100) return NextResponse.json({ error: 'Taille maximale 100 lignes par requête' }, { status: 400 })

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 })
    if (project.ownerId !== session.user.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    const template = await prisma.template.findUnique({ where: { id: templateId } })
    if (!template || template.projectId !== projectId) {
      return NextResponse.json({ error: 'Template non trouvé' }, { status: 404 })
    }

    // Déterminer le type de template à partir du MIME type
    const getTemplateType = (mimeType: string): TemplateType => {
      if (mimeType === 'application/pdf') return 'pdf'
      if (mimeType.startsWith('image/')) return 'image'
      if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx'
      return 'pdf' // Par défaut
    }
    const templateType = getTemplateType(template.mimeType)

    // Charger le fichier template depuis l'adaptateur de stockage
    const templateBuffer = await storage.getBuffer(template.filePath)

    let successCount = 0
    for (const data of rows) {
      try {
        let documentBuffer: Buffer
        let outputMimeType: string
        let fileExtension: string

        if (templateType === 'docx') {
          // Génération DOCX avec docxtemplater
          const docxBuffer = await generateDOCX(templateBuffer, {
            variables: data,
          })
          
          // Si format de sortie demandé est PDF, convertir DOCX → PDF
          if (outputFormat === 'pdf') {
            documentBuffer = await convertDOCXToPDFWithStyles(docxBuffer, pdfOptions)
            outputMimeType = 'application/pdf'
            fileExtension = 'pdf'
          } else {
            // Garder le format DOCX
            documentBuffer = docxBuffer
            outputMimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            fileExtension = 'docx'
          }
        } else {
          // Génération PDF/image (existant)
          documentBuffer = await generateDocumentFromTemplate(
            templateBuffer,
            template.mimeType,
            Array.isArray(template.fields) ? (template.fields as any) : [],
            data
          )
          outputMimeType = 'application/pdf'
          fileExtension = 'pdf'
        }

        // Créer record document
        const doc = await prisma.document.create({
          data: {
            projectId,
            templateId,
            data: data as any,
            filePath: '',
            mimeType: outputMimeType,
            status: 'generated',
            recipient: typeof data['recipient_name'] === 'string' ? (data['recipient_name'] as string) : null,
            recipientEmail: typeof data['recipient_email'] === 'string' ? (data['recipient_email'] as string) : null,
          },
        })

        const key = `projects/${projectId}/documents/${doc.id}.${fileExtension}`
        await storage.upload(documentBuffer, key, outputMimeType)

        await prisma.document.update({ where: { id: doc.id }, data: { filePath: key } })
        successCount++
      } catch (e) {
        console.error('Doc generation failed:', e)
        // Optionnel : marquer le document comme failed si on le crée avant
      }
    }

    return NextResponse.json({ count: successCount })
  } catch (error) {
    console.error('Generate error:', error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}
