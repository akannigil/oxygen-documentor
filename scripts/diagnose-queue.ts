#!/usr/bin/env tsx
/**
 * Script de diagnostic pour vérifier l'état des queues BullMQ
 * Usage: tsx scripts/diagnose-queue.ts
 */

import { documentGenerationQueue, getQueueStatus } from '../lib/queue/queues'

async function diagnose() {
  console.log('🔍 Diagnostic des queues BullMQ...\n')

  // Vérifier l'état de la queue
  const status = await getQueueStatus('document-generation')
  console.log('📊 État de la queue "document-generation":')
  console.log(`   Disponible: ${status.available}`)
  console.log(`   En attente: ${status.waiting}`)
  console.log(`   En cours: ${status.active}`)
  console.log(`   Complétés: ${status.completed}`)
  console.log(`   Échoués: ${status.failed}\n`)

  if (!documentGenerationQueue) {
    console.error("❌ La queue document-generation n'est pas disponible")
    console.error('   Vérifiez que REDIS_URL est configuré dans votre .env')
    process.exit(1)
  }

  // Lister les jobs en attente
  if (status.waiting > 0) {
    console.log('⏳ Jobs en attente:')
    const waitingJobs = await documentGenerationQueue.getWaiting()
    for (const job of waitingJobs.slice(0, 5)) {
      console.log(`   - Job ${job.id}: ${job.name}`)
      console.log(`     Données:`, {
        projectId: job.data.projectId,
        templateId: job.data.templateId,
        rowsCount: job.data.rows?.length || 0,
      })
    }
    if (waitingJobs.length > 5) {
      console.log(`   ... et ${waitingJobs.length - 5} autres jobs`)
    }
    console.log()
  }

  // Lister les jobs actifs
  if (status.active > 0) {
    console.log('🔄 Jobs actifs:')
    const activeJobs = await documentGenerationQueue.getActive()
    for (const job of activeJobs) {
      console.log(`   - Job ${job.id}: ${job.name}`)
      console.log(`     Progression: ${job.progress}%`)
      console.log(`     Données:`, {
        projectId: job.data.projectId,
        templateId: job.data.templateId,
        rowsCount: job.data.rows?.length || 0,
      })
    }
    console.log()
  }

  // Lister les jobs complétés récents
  if (status.completed > 0) {
    console.log('✅ Jobs complétés récents (5 derniers):')
    const completedJobs = await documentGenerationQueue.getCompleted()
    for (const job of completedJobs.slice(0, 5)) {
      const result = job.returnvalue
      console.log(`   - Job ${job.id}:`)
      console.log(`     Documents générés: ${result?.documentIds?.length || 0}`)
      console.log(`     Erreurs: ${result?.errors?.length || 0}`)
      if (result?.errors && result.errors.length > 0) {
        console.log(`     Détails erreurs:`, result.errors)
      }
    }
    console.log()
  }

  // Lister les jobs échoués récents
  if (status.failed > 0) {
    console.log('❌ Jobs échoués récents (5 derniers):')
    const failedJobs = await documentGenerationQueue.getFailed()
    for (const job of failedJobs.slice(0, 5)) {
      console.log(`   - Job ${job.id}:`)
      console.log(`     Raison: ${job.failedReason || 'Inconnue'}`)
      console.log(`     Données:`, {
        projectId: job.data.projectId,
        templateId: job.data.templateId,
        rowsCount: job.data.rows?.length || 0,
      })
    }
    console.log()
  }

  console.log('✅ Diagnostic terminé')
}

diagnose().catch((error) => {
  console.error('❌ Erreur lors du diagnostic:', error)
  process.exit(1)
})
