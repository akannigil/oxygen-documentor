import { Queue, QueueOptions } from 'bullmq'
import Redis from 'ioredis'

/**
 * Configuration Redis pour BullMQ
 */
export function createRedisConnection(): Redis | null {
  const redisUrl = process.env['REDIS_URL']
  
  if (!redisUrl) {
    console.warn('⚠️  REDIS_URL non configuré, queues BullMQ désactivées')
    return null
  }

  // Option pour désactiver Redis complètement via variable d'environnement
  if (process.env['REDIS_DISABLED'] === 'true') {
    console.warn('⚠️  Redis désactivé via REDIS_DISABLED=true')
    return null
  }

  try {
    const redis = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times) => {
        // Limiter les tentatives de reconnexion
        if (times > 3) {
          console.error('❌ Redis: Échec de connexion après 3 tentatives. Les queues BullMQ sont désactivées.')
          console.error('💡 Pour démarrer Redis localement: docker-compose up -d redis')
          console.error('💡 Pour désactiver Redis: définir REDIS_DISABLED=true dans votre .env')
          return null // Arrêter les tentatives
        }
        // Délai exponentiel entre les tentatives
        const delay = Math.min(times * 200, 2000)
        return delay
      },
      reconnectOnError: (err) => {
        // Ne pas reconnecter automatiquement sur certaines erreurs critiques
        const targetError = 'ECONNREFUSED'
        if (err.message.includes(targetError)) {
          return false
        }
        return true
      },
    })

    let connectionFailed = false

    redis.on('error', (error) => {
      // Éviter de spammer les logs avec les mêmes erreurs
      if (!connectionFailed) {
        connectionFailed = true
        console.error('❌ Redis connection error:', error.message || error)
        if (error.code === 'ECONNREFUSED') {
          console.error('💡 Redis n\'est pas accessible. Pour démarrer Redis:')
          console.error('   docker-compose up -d redis')
          console.error('💡 Ou désactivez Redis en définissant REDIS_DISABLED=true')
        }
      }
    })

    redis.on('connect', () => {
      connectionFailed = false
      console.log('✅ Redis connecté')
    })

    redis.on('ready', () => {
      connectionFailed = false
      console.log('✅ Redis prêt')
    })

    redis.on('close', () => {
      if (!connectionFailed) {
        console.warn('⚠️  Redis: connexion fermée')
      }
    })

    return redis
  } catch (error) {
    console.error('❌ Échec de création de la connexion Redis:', error)
    return null
  }
}

const redisConnection = createRedisConnection()

/**
 * Options par défaut pour les queues BullMQ
 */
const getDefaultQueueOptions = (): QueueOptions | null => {
  if (!redisConnection) return null
  
  return {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        age: 24 * 3600, // Garder les jobs complétés pendant 24h
        count: 1000,
      },
      removeOnFail: {
        age: 7 * 24 * 3600, // Garder les jobs échoués pendant 7 jours
      },
    },
  }
}

const defaultQueueOptions = getDefaultQueueOptions()

/**
 * Queue pour la génération de documents
 */
export const documentGenerationQueue = redisConnection && defaultQueueOptions
  ? new Queue('document-generation', defaultQueueOptions)
  : null

/**
 * Queue pour l'envoi d'emails
 */
export const emailSendingQueue = redisConnection && defaultQueueOptions
  ? new Queue('email-sending', defaultQueueOptions)
  : null

/**
 * Vérifie si les queues sont disponibles
 */
export function areQueuesAvailable(): boolean {
  return redisConnection !== null && documentGenerationQueue !== null && emailSendingQueue !== null
}

/**
 * Obtient le statut d'une queue
 */
export async function getQueueStatus(queueName: 'document-generation' | 'email-sending') {
  if (!redisConnection) {
    return {
      available: false,
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
    }
  }

  const queue = queueName === 'document-generation' ? documentGenerationQueue : emailSendingQueue
  if (!queue) {
    return {
      available: false,
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
    }
  }

  const [waiting, active, completed, failed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
  ])

  return {
    available: true,
    waiting,
    active,
    completed,
    failed,
  }
}

