/**
 * Point d'entrée principal pour le module queue
 */

export {
  documentGenerationQueue,
  emailSendingQueue,
  areQueuesAvailable,
  getQueueStatus,
} from './queues'
export { createRedisConnection } from './queues'
export {
  initializeWorkers,
  createDocumentGenerationWorker,
  createEmailSendingWorker,
} from './workers'
export type { DocumentGenerationJobData, DocumentGenerationJobResult } from './workers'
export type { EmailSendingJobData } from './workers'
