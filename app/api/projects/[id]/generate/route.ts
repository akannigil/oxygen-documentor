import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { documentGenerationQueue, areQueuesAvailable } from '@/lib/queue/queues'
import type { DocumentGenerationJobData } from '@/lib/queue/workers'
import { z } from 'zod'
import type { TemplateField, TemplateVariable } from '@/shared/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    const userId = session.user.id

    // Vérifier que le système de file d'attente est disponible
    if (!areQueuesAvailable() || !documentGenerationQueue) {
      return NextResponse.json(
        { error: 'Le service de génération est actuellement indisponible.' },
        { status: 503 }
      )
    }

    const { id: projectId } = await params
    const body = await request.json()

    // Schéma de validation zod
    const pdfOptionsSchema = z.object({
      format: z.enum(['A4', 'A3', 'Letter', 'Legal', 'Tabloid']).optional(),
      orientation: z.enum(['portrait', 'landscape']).optional(),
      margins: z
        .object({ top: z.string().optional(), right: z.string().optional(), bottom: z.string().optional(), left: z.string().optional() })
        .optional(),
      method: z.enum(['libreoffice', 'puppeteer']).optional(),
    }).optional()

    const styleOptionsSchema = z.object({
      defaultStyle: z.object({
        fontFamily: z.string().optional(),
        fontSize: z.number().positive().optional(),
        color: z.string().optional(),
        bold: z.boolean().optional(),
        italic: z.boolean().optional(),
        underline: z.boolean().optional(),
      }).optional(),
      variableStyles: z.record(z.object({
        fontFamily: z.string().optional(),
        fontSize: z.number().positive().optional(),
        color: z.string().optional(),
        bold: z.boolean().optional(),
        italic: z.boolean().optional(),
        underline: z.boolean().optional(),
      })).optional(),
    }).optional()

    const rowValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()])
    const bodySchema = z.object({
      templateId: z.string().min(1, 'templateId requis'),
      rows: z.array(z.record(rowValueSchema)).min(1, 'rows requis').max(500, 'Taille maximale 500 lignes par requête'),
      outputFormat: z.enum(['docx', 'pdf']).optional(),
      pdfOptions: pdfOptionsSchema,
      styleOptions: styleOptionsSchema,
    })

    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({
        error: 'Erreur de validation des paramètres',
        code: 'VALIDATION_ERROR',
        issues: parsed.error.issues,
      }, { status: 400 })
    }

    const { templateId, rows, outputFormat, pdfOptions, styleOptions } = parsed.data

    // Vérifier les permissions du projet
    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: userId },
      select: { id: true },
    })
    if (!project) {
      return NextResponse.json({ error: 'Projet non trouvé ou non autorisé' }, { status: 404 })
    }
    
    // Charger le template avec les métadonnées nécessaires
    const template = await prisma.template.findFirst({
      where: { id: templateId, projectId: projectId },
      select: { id: true, mimeType: true, templateType: true, fields: true, variables: true }
    })
    if(!template) {
      return NextResponse.json({ error: "Template non trouvé ou n'appartient pas à ce projet" }, { status: 404 })
    }

    // Validation métier: vérifier que chaque row contient les clés attendues
    const isDocx =
      template.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      template.templateType === 'docx'

    let requiredKeys: string[] = []
    if (isDocx) {
      const vars = (Array.isArray(template.variables) ? (template.variables as unknown as TemplateVariable[]) : [])
      requiredKeys = Array.from(new Set(vars.map(v => v.name).filter(Boolean)))
    } else {
      const fields = (Array.isArray(template.fields) ? (template.fields as unknown as TemplateField[]) : [])
      requiredKeys = Array.from(new Set(fields.map(f => f.key).filter(Boolean)))
    }

    // Si aucune clé requise détectée, on ne bloque pas
    if (requiredKeys.length > 0) {
      type Row = Record<string, unknown>
      const issues: Array<{ row: number; missingKeys: string[] }> = []
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i] as Row
        const rowKeys = new Set(Object.keys(row))
        const missing = requiredKeys.filter(k => !rowKeys.has(k))
        if (missing.length > 0) {
          issues.push({ row: i + 1, missingKeys: missing })
          if (issues.length >= 10) break // Limiter le nombre d'issues renvoyées
        }
      }
      if (issues.length > 0) {
        return NextResponse.json({
          error: 'Certaines lignes ne contiennent pas toutes les clés requises par le template',
          code: 'VALIDATION_ERROR',
          requiredKeys,
          issues,
          totalInvalid: issues.length,
        }, { status: 400 })
      }
    }

    // Créer systématiquement un job dans la file d'attente
    const job = await documentGenerationQueue.add(
      'generate-documents',
      {
        projectId,
        templateId,
        rows,
        userId,
        outputFormat,
        pdfOptions: pdfOptions as DocumentGenerationJobData['pdfOptions'] | undefined,
        styleOptions: styleOptions as DocumentGenerationJobData['styleOptions'] | undefined,
      } satisfies DocumentGenerationJobData,
      {
        jobId: `gen_${projectId}_${Date.now()}`,
      }
    )

    // Retourner immédiatement le job ID
    return NextResponse.json({
      jobId: job.id,
      queue: 'document-generation',
      message: "La génération a été mise en file d'attente. Suivez la progression avec le jobId.",
      status: 'queued',
    })

  } catch (error) {
    console.error("Erreur lors de la mise en file d'attente de la génération:", error)
    
    const errorMessage = error instanceof Error ? error.message : 'Une erreur interne est survenue'
    
    return NextResponse.json(
      { error: 'Une erreur est survenue lors du lancement de la génération', details: errorMessage },
      { status: 500 }
    )
  }
}
