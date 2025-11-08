/**
 * Point d'entrée principal pour le module email
 */

export type { EmailAdapter } from './adapters'
export { ResendEmailAdapter, SMTPEmailAdapter } from './adapters'

export { createEmailAdapterFromConfig } from './config'
export type { EmailConfig, EmailProviderType, ResendEmailConfig, SMTPEmailConfig } from './config'

export { getProjectEmailConfig } from './get-config'

export {
  renderEmailTemplate,
  DEFAULT_EMAIL_TEMPLATE,
  DEFAULT_EMAIL_TEXT_TEMPLATE,
} from './templates'
export type { EmailTemplateVariables } from './templates'

export { sendDocumentEmail, sendDocumentEmailsBatch } from './service'
export type { SendDocumentEmailOptions, SendDocumentEmailResult } from './service'
