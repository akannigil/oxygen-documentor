/**
 * Gestion du stockage local des données du dernier email envoyé
 * Permet de maintenir les données (sujet, template HTML, etc.) entre les envois
 */

export interface LastEmailData {
  subject: string
  htmlTemplate: string
  from: string
  fromName: string
  replyTo: string
  cc: string
  bcc: string
  attachDocument: boolean
  additionalAttachmentUrl?: string
  additionalAttachmentFilename?: string
  additionalAttachmentContentType?: string
}

const STORAGE_KEY = 'oxygen_last_email_data'

/**
 * Sauvegarde les données du dernier email envoyé dans localStorage
 */
export function saveLastEmailData(data: Partial<LastEmailData>): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const existing = loadLastEmailData()
    const merged: LastEmailData = {
      subject: data.subject ?? existing.subject ?? '',
      htmlTemplate: data.htmlTemplate ?? existing.htmlTemplate ?? '',
      from: data.from ?? existing.from ?? '',
      fromName: data.fromName ?? existing.fromName ?? '',
      replyTo: data.replyTo ?? existing.replyTo ?? '',
      cc: data.cc ?? existing.cc ?? '',
      bcc: data.bcc ?? existing.bcc ?? '',
      attachDocument: data.attachDocument ?? existing.attachDocument ?? true,
      additionalAttachmentUrl: data.additionalAttachmentUrl ?? existing.additionalAttachmentUrl,
      additionalAttachmentFilename: data.additionalAttachmentFilename ?? existing.additionalAttachmentFilename,
      additionalAttachmentContentType: data.additionalAttachmentContentType ?? existing.additionalAttachmentContentType,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des données email:', error)
  }
}

/**
 * Charge les données du dernier email envoyé depuis localStorage
 */
export function loadLastEmailData(): LastEmailData {
  if (typeof window === 'undefined') {
    return getDefaultEmailData()
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return getDefaultEmailData()
    }
    const parsed = JSON.parse(stored) as Partial<LastEmailData>
    return {
      subject: parsed.subject ?? '',
      htmlTemplate: parsed.htmlTemplate ?? '',
      from: parsed.from ?? '',
      fromName: parsed.fromName ?? '',
      replyTo: parsed.replyTo ?? '',
      cc: parsed.cc ?? '',
      bcc: parsed.bcc ?? '',
      attachDocument: parsed.attachDocument ?? true,
      additionalAttachmentUrl: parsed.additionalAttachmentUrl,
      additionalAttachmentFilename: parsed.additionalAttachmentFilename,
      additionalAttachmentContentType: parsed.additionalAttachmentContentType,
    }
  } catch (error) {
    console.error('Erreur lors du chargement des données email:', error)
    return getDefaultEmailData()
  }
}

/**
 * Retourne les données par défaut pour un email
 */
function getDefaultEmailData(): LastEmailData {
  return {
    subject: '',
    htmlTemplate: '',
    from: '',
    fromName: '',
    replyTo: '',
    cc: '',
    bcc: '',
    attachDocument: true,
  }
}

