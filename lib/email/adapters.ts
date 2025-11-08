import nodemailer from 'nodemailer'
import { Resend } from 'resend'

export interface EmailAdapter {
  send(options: {
    to: string | string[]
    subject: string
    html: string
    text?: string
    from?: string
    replyTo?: string
    cc?: string | string[]
    bcc?: string | string[]
    attachments?: Array<{
      filename: string
      content: Buffer
      contentType?: string
    }>
  }): Promise<{ messageId?: string; success: boolean; error?: string }>
}

/**
 * Adaptateur email utilisant Nodemailer (SMTP)
 */
export class SMTPEmailAdapter implements EmailAdapter {
  private transporter: nodemailer.Transporter

  constructor(config: {
    host: string
    port: number
    secure: boolean
    user: string
    password: string
    from?: string
  }) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.password,
      },
    })
  }

  async send(options: {
    to: string | string[]
    subject: string
    html: string
    text?: string
    from?: string
    replyTo?: string
    cc?: string | string[]
    bcc?: string | string[]
    attachments?: Array<{
      filename: string
      content: Buffer
      contentType?: string
    }>
  }): Promise<{ messageId?: string; success: boolean; error?: string }> {
    try {
      const info = await this.transporter.sendMail({
        from: options.from,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
        ...(options.cc && { cc: Array.isArray(options.cc) ? options.cc.join(', ') : options.cc }),
        ...(options.bcc && {
          bcc: Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc,
        }),
        attachments: options.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
        })),
      })

      return {
        success: true,
        messageId: info.messageId,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return {
        success: false,
        error: errorMessage,
      }
    }
  }
}

/**
 * Adaptateur email utilisant Resend
 */
export class ResendEmailAdapter implements EmailAdapter {
  private client: Resend
  private from: string

  constructor(apiKey: string, from: string) {
    this.client = new Resend(apiKey)
    this.from = from
  }

  async send(options: {
    to: string | string[]
    subject: string
    html: string
    text?: string
    from?: string
    replyTo?: string
    cc?: string | string[]
    bcc?: string | string[]
    attachments?: Array<{
      filename: string
      content: Buffer
      contentType?: string
    }>
  }): Promise<{ messageId?: string; success: boolean; error?: string }> {
    try {
      const recipients = Array.isArray(options.to) ? options.to : [options.to]

      const emailOptions: {
        from: string
        to: string[]
        subject: string
        html: string
        text?: string
        replyTo?: string
        cc?: string[]
        bcc?: string[]
        attachments?: Array<{ filename: string; content: string }>
      } = {
        from: options.from || this.from,
        to: recipients,
        subject: options.subject,
        html: options.html,
      }

      if (options.text) {
        emailOptions.text = options.text
      }

      if (options.replyTo) {
        emailOptions.replyTo = options.replyTo
      }

      if (options.cc) {
        emailOptions.cc = Array.isArray(options.cc) ? options.cc : [options.cc]
      }

      if (options.bcc) {
        emailOptions.bcc = Array.isArray(options.bcc) ? options.bcc : [options.bcc]
      }

      if (options.attachments && options.attachments.length > 0) {
        emailOptions.attachments = options.attachments.map((att) => ({
          filename: att.filename,
          content: att.content.toString('base64'),
        }))
      }

      const result = await this.client.emails.send(emailOptions)

      if (result.error) {
        return {
          success: false,
          error: result.error.message || 'Erreur Resend inconnue',
        }
      }

      return {
        success: true,
        messageId: result.data?.id,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return {
        success: false,
        error: errorMessage,
      }
    }
  }
}

/**
 * @deprecated Cette fonction n'est plus utilisée. Utilisez createEmailAdapterFromConfig() depuis lib/email/config.ts
 * Cette fonction est conservée pour compatibilité mais ne devrait plus être appelée.
 * La configuration email est maintenant gérée par projet via la base de données.
 */
export function createEmailAdapter(): EmailAdapter | null {
  console.warn(
    'createEmailAdapter() est déprécié. Utilisez createEmailAdapterFromConfig() avec la configuration du projet.'
  )
  return null
}

/**
 * @deprecated Cette constante n'est plus utilisée. L'adaptateur email doit être créé
 * à partir de la configuration du projet via createEmailAdapterFromConfig().
 */
export const emailAdapter = null
