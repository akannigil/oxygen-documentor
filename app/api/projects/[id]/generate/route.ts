import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { documentGenerationQueue, areQueuesAvailable } from '@/lib/queue/queues'
import type { DocumentGenerationJobData } from '@/lib/queue/workers'

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

    // Valider les entrées
    const templateId: string | undefined = body.templateId
    const rows: Array<Record<string, unknown>> = Array.isArray(body.rows) ? body.rows : []
    const outputFormat: 'docx' | 'pdf' | undefined = body.outputFormat
    const pdfOptions = body.pdfOptions as DocumentGenerationJobData['pdfOptions'] | undefined

    if (!templateId) return NextResponse.json({ error: 'templateId requis' }, { status: 400 })
    if (rows.length === 0) return NextResponse.json({ error: 'rows requis' }, { status: 400 })
    if (rows.length > 500) return NextResponse.json({ error: 'Taille maximale 500 lignes par requête' }, { status: 400 })

    // Vérifier les permissions du projet
    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: userId },
      select: { id: true },
    })
    if (!project) {
      return NextResponse.json({ error: 'Projet non trouvé ou non autorisé' }, { status: 404 })
    }
    
    // Vérifier que le template appartient bien au projet
    const template = await prisma.template.findFirst({
      where: { id: templateId, projectId: projectId },
      select: { id: true }
    })
    if(!template) {
      return NextResponse.json({ error: "Template non trouvé ou n'appartient pas à ce projet" }, { status: 404 })
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
        pdfOptions,
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
