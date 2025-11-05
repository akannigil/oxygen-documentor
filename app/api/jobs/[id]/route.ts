import { NextResponse } from 'next/server'
import { documentGenerationQueue, emailSendingQueue } from '@/lib/queue/queues'
import { Job } from 'bullmq'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/jobs/[id]
 * Récupère le statut d'un job BullMQ
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'ID de job requis' }, { status: 400 })
    }

    // Chercher dans les deux queues
    let job: Job | null = null
    let queueName: 'document-generation' | 'email-sending' | null = null

    if (documentGenerationQueue) {
      job = (await documentGenerationQueue.getJob(id)) ?? null
      if (job) {
        queueName = 'document-generation'
      }
    }

    if (!job && emailSendingQueue) {
      job = (await emailSendingQueue.getJob(id)) ?? null
      if (job) {
        queueName = 'email-sending'
      }
    }

    if (!job) {
      return NextResponse.json({ error: 'Job non trouvé' }, { status: 404 })
    }

    const state = await job.getState()
    const progress = job.progress
    const returnvalue = job.returnvalue
    const failedReason = job.failedReason

    return NextResponse.json({
      id: job.id,
      queueName,
      state,
      progress: typeof progress === 'number' ? progress : null,
      returnvalue,
      failedReason,
      data: job.data,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    })
  } catch (error) {
    console.error('Erreur lors de la récupération du job:', error)
    return NextResponse.json(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    )
  }
}

