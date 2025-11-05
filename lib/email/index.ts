/**
 * Point d'entrée principal pour le module email
 */

export { emailAdapter, createEmailAdapter } from './adapters'
export type { EmailAdapter } from './adapters'

export {
  renderEmailTemplate,
  DEFAULT_EMAIL_TEMPLATE,
  DEFAULT_EMAIL_TEXT_TEMPLATE,
} from './templates'
export type { EmailTemplateVariables } from './templates'

export { sendDocumentEmail, sendDocumentEmailsBatch } from './service'
export type {
  SendDocumentEmailOptions,
  SendDocumentEmailResult,
} from './service'

