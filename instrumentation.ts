/**
 * Next.js Instrumentation Hook
 * Démarre automatiquement les workers BullMQ au démarrage du serveur
 *
 * Note: Dans Next.js 15+, cette fonction est appelée automatiquement
 * au démarrage du serveur Node.js (pas dans Edge Runtime)
 *
 * IMPORTANT: En mode développement, cette fonctionnalité est désactivée
 * car elle peut causer des problèmes de compilation webpack.
 * Utilisez `npm run workers` pour démarrer les workers manuellement.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register(): Promise<void> {
  // Vérifier que nous sommes bien dans Node.js runtime (pas Edge Runtime)
  if (process.env['NEXT_RUNTIME'] === 'edge') {
    return
  }

  // S'assurer que nous sommes côté serveur
  if (typeof window !== 'undefined') {
    return
  }

  // En mode développement, démarrer les workers seulement si explicitement demandé
  // Maintenant que BullMQ est externalisé dans webpack, cela devrait fonctionner
  if (process.env['NODE_ENV'] === 'development') {
    // Permettre de démarrer les workers en dev via variable d'environnement
    if (process.env['ENABLE_WORKERS_IN_DEV'] !== 'true') {
      console.log('ℹ️  [Instrumentation] Mode développement détecté')
      console.log('   Les workers BullMQ ne sont pas démarrés automatiquement en dev')
      console.log('   Pour démarrer les workers: npm run workers')
      console.log('   Ou définir ENABLE_WORKERS_IN_DEV=true pour démarrer automatiquement')
      return
    }
    console.log(
      'ℹ️  [Instrumentation] Mode développement - démarrage des workers (ENABLE_WORKERS_IN_DEV=true)'
    )
  }

  // Démarrer les workers (production ou dev si ENABLE_WORKERS_IN_DEV=true)
  try {
    const envLabel = process.env['NODE_ENV'] === 'development' ? 'développement' : 'production'
    console.log(`🔧 [Instrumentation] Initialisation des workers BullMQ (${envLabel})...`)

    const { initializeWorkers } = await import('./lib/queue/workers')
    const { documentWorker, emailWorker } = initializeWorkers()

    if (documentWorker) {
      console.log('✅ [Instrumentation] Worker de génération de documents démarré')
    } else {
      console.warn('⚠️  [Instrumentation] Worker de génération de documents non démarré')
      console.warn('   Vérifiez que REDIS_URL est configuré et que Redis est accessible')
    }

    if (emailWorker) {
      console.log("✅ [Instrumentation] Worker d'envoi d'emails démarré")
    } else {
      console.warn("⚠️  [Instrumentation] Worker d'envoi d'emails non démarré")
      console.warn('   Vérifiez que REDIS_URL est configuré et que Redis est accessible')
    }

    if (!documentWorker && !emailWorker) {
      console.error('❌ [Instrumentation] Aucun worker démarré!')
      console.error('   Les jobs BullMQ ne seront pas traités.')
      console.error(
        '   Solution: Vérifiez votre configuration Redis ou démarrez les workers manuellement avec: npm run workers'
      )
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error("❌ [Instrumentation] Erreur lors de l'initialisation des workers:", errorMessage)
    console.error('   Stack:', error instanceof Error ? error.stack : 'N/A')
    console.error('   Les workers peuvent être démarrés manuellement avec: npm run workers')
  }
}
