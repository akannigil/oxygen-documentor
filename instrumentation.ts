/**
 * Next.js Instrumentation Hook
 * Démarre automatiquement les workers BullMQ au démarrage du serveur
 * 
 * Note: Dans Next.js 15+, cette fonction est appelée automatiquement
 * au démarrage du serveur Node.js (pas dans Edge Runtime)
 */
export async function register() {
  // L'instrumentation hook s'exécute uniquement dans Node.js runtime
  // Pas besoin de vérifier NEXT_RUNTIME car c'est déjà garanti
  
  try {
    console.log('🔧 [Instrumentation] Initialisation des workers BullMQ...')
    
    const { initializeWorkers } = await import('./lib/queue/workers')
    const { documentWorker, emailWorker } = initializeWorkers()
    
    if (documentWorker) {
      console.log('✅ [Instrumentation] Worker de génération de documents démarré')
    } else {
      console.warn('⚠️  [Instrumentation] Worker de génération de documents non démarré')
      console.warn('   Vérifiez que REDIS_URL est configuré et que Redis est accessible')
    }
    
    if (emailWorker) {
      console.log('✅ [Instrumentation] Worker d\'envoi d\'emails démarré')
    } else {
      console.warn('⚠️  [Instrumentation] Worker d\'envoi d\'emails non démarré')
      console.warn('   Vérifiez que REDIS_URL est configuré et que Redis est accessible')
    }
    
    if (!documentWorker && !emailWorker) {
      console.error('❌ [Instrumentation] Aucun worker démarré!')
      console.error('   Les jobs BullMQ ne seront pas traités.')
      console.error('   Solution: Vérifiez votre configuration Redis ou démarrez les workers manuellement avec: npm run workers')
    }
  } catch (error) {
    console.error('❌ [Instrumentation] Erreur lors de l\'initialisation des workers:', error)
    console.error('   Les workers peuvent être démarrés manuellement avec: npm run workers')
  }
}

