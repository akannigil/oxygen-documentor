#!/usr/bin/env tsx
/**
 * Script pour démarrer les workers BullMQ
 * Usage: npm run workers ou tsx scripts/start-workers.ts
 */

import { initializeWorkers } from '../lib/queue/workers'

console.log('🚀 Initialisation des workers BullMQ...')

const { documentWorker, emailWorker } = initializeWorkers()

if (!documentWorker && !emailWorker) {
  console.warn('⚠️  Aucun worker démarré. Vérifiez que REDIS_URL est configuré.')
  process.exit(1)
}

console.log('✅ Workers démarrés avec succès')
console.log('📋 Appuyez sur Ctrl+C pour arrêter')

// Gérer l'arrêt propre
process.on('SIGINT', async () => {
  console.log('\n🛑 Arrêt des workers...')
  
  if (documentWorker) {
    await documentWorker.close()
  }
  
  if (emailWorker) {
    await emailWorker.close()
  }
  
  console.log('✅ Workers arrêtés')
  process.exit(0)
})

// Garder le processus actif
process.stdin.resume()

