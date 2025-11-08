import type { EmailAdapter } from './adapters'
import { ResendEmailAdapter, SMTPEmailAdapter } from './adapters'

/**
 * Types de providers email supportés
 */
export type EmailProviderType = 'resend' | 'smtp'

/**
 * Configuration de base pour tous les types de providers
 */
export interface BaseEmailConfig {
  provider: EmailProviderType
  // Informations optionnelles pour les templates
  organizationName?: string
  appName?: string
  contactEmail?: string
  from?: string
  fromName?: string
  replyTo?: string
}

/**
 * Configuration pour Resend
 */
export interface ResendEmailConfig extends BaseEmailConfig {
  provider: 'resend'
  apiKey: string
  from: string
}

/**
 * Configuration pour SMTP (Nodemailer)
 */
export interface SMTPEmailConfig extends BaseEmailConfig {
  provider: 'smtp'
  host: string
  port: number
  secure: boolean
  user: string
  password: string
  from?: string
}

/**
 * Union de toutes les configurations possibles
 */
export type EmailConfig = ResendEmailConfig | SMTPEmailConfig

/**
 * Crée un adaptateur email à partir d'une configuration JSON
 */
export function createEmailAdapterFromConfig(config: EmailConfig | null | undefined): EmailAdapter | null {
  if (!config) {
    return null
  }

  switch (config.provider) {
    case 'resend': {
      const resendConfig = config as ResendEmailConfig
      if (!resendConfig.apiKey || !resendConfig.from) {
        console.warn('Configuration Resend incomplète (apiKey ou from manquant)')
        return null
      }
      return new ResendEmailAdapter(resendConfig.apiKey, resendConfig.from)
    }

    case 'smtp': {
      const smtpConfig = config as SMTPEmailConfig
      if (!smtpConfig.host || !smtpConfig.port || !smtpConfig.user || !smtpConfig.password) {
        console.warn('Configuration SMTP incomplète')
        return null
      }
      return new SMTPEmailAdapter({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        user: smtpConfig.user,
        password: smtpConfig.password,
        ...(smtpConfig.from ? { from: smtpConfig.from } : {}),
      })
    }

    default:
      console.warn(`Provider email non supporté: ${(config as { provider?: string }).provider}`)
      return null
  }
}

