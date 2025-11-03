/**
 * Intégration des QR codes dans le workflow de génération de documents
 * 
 * Ce module fournit des fonctions pour générer le contenu des QR codes
 * en tenant compte de l'authentification, des URLs de stockage et des options de personnalisation
 */

import type { TemplateField } from '@/shared/types'
import {
  generateAuthenticatedCertificate,
  generateDocumentHash,
  type CertificateAuthConfig,
  type CertificateData,
} from './certificate-auth'
import { generateQRCodeBuffer } from './generator'
import type { QRCodeOptions } from './generator'

/**
 * Options pour générer le contenu d'un QR code dans le workflow
 */
export interface QRCodeWorkflowOptions {
  /**
   * Champ template contenant les options QR code
   */
  field: TemplateField
  
  /**
   * Données du document actuel
   */
  data: Record<string, string | number | Date>
  
  /**
   * Chemin du fichier document dans le stockage (pour URLs de stockage)
   */
  documentFilePath?: string
  
  /**
   * Buffer du document (pour hash d'intégrité)
   */
  documentBuffer?: Buffer
  
  /**
   * Configuration d'authentification (secretKey, verificationBaseUrl, etc.)
   */
  authConfig?: CertificateAuthConfig
  
  /**
   * Instance du storage adapter pour générer les URLs
   */
  getStorageUrl?: (filePath: string, signed?: boolean, expiresIn?: number) => Promise<string>
}

/**
 * Génère le contenu du QR code selon la configuration du champ
 */
export async function generateQRCodeContent(
  options: QRCodeWorkflowOptions
): Promise<string> {
  const { field, data, documentFilePath, documentBuffer, authConfig, getStorageUrl } = options
  
  // Si l'authentification est activée
  if (field.qrcodeAuth?.enabled && authConfig) {
    const certificateData = buildCertificateData(field, data)
    const authenticated = generateAuthenticatedCertificate(
      certificateData,
      {
        ...authConfig,
        expiresIn: field.qrcodeAuth.expiresIn ?? authConfig.expiresIn,
        verificationBaseUrl: field.qrcodeAuth.verificationBaseUrl ?? authConfig.verificationBaseUrl,
      },
      field.qrcodeAuth.includeDocumentHash ? documentBuffer : undefined
    )
    return authenticated.qrCodeData
  }
  
  // Si l'URL de stockage est activée
  if (field.qrcodeStorageUrl?.enabled && documentFilePath && getStorageUrl) {
    const expiresIn = field.qrcodeStorageUrl.expiresIn ?? 3600
    const useSigned = field.qrcodeStorageUrl.urlType === 'signed' || field.qrcodeStorageUrl.urlType === undefined
    
    try {
      const storageUrl = await getStorageUrl(documentFilePath, useSigned, expiresIn)
      
      // Si on a aussi une valeur de base, on peut combiner (optionnel)
      const baseValue = getFieldValue(field, data)
      if (baseValue && baseValue !== storageUrl) {
        // Optionnel: combiner la valeur de base avec l'URL de stockage
        return `${baseValue}\n${storageUrl}`
      }
      
      return storageUrl
    } catch (error) {
      console.error('Error generating storage URL for QR code:', error)
      // Fallback vers valeur de base
    }
  }
  
  // Valeur par défaut: utiliser la valeur du champ
  return getFieldValue(field, data)
}

/**
 * Construit les données du certificat à partir des champs configurés
 */
function buildCertificateData(
  field: TemplateField,
  data: Record<string, string | number | Date>
): CertificateData {
  const fields = field.qrcodeAuth?.certificateFields
  
  if (!fields) {
    throw new Error('certificateFields requis pour l\'authentification de certificat')
  }
  
  const getFieldValue = (key?: string): string | undefined => {
    if (!key) return undefined
    const value = data[key]
    if (value === undefined || value === null) return undefined
    if (value instanceof Date) return value.toISOString()
    return String(value)
  }
  
  return {
    certificateId: getFieldValue(fields.certificateId) || 'UNKNOWN',
    holderName: getFieldValue(fields.holderName) || '',
    title: getFieldValue(fields.title) || '',
    issueDate: getFieldValue(fields.issueDate) || new Date().toISOString(),
    issuer: getFieldValue(fields.issuer) || '',
    grade: getFieldValue(fields.grade),
    expiryDate: getFieldValue(fields.expiryDate),
  }
}

/**
 * Obtient la valeur du champ depuis les données
 */
function getFieldValue(
  field: TemplateField,
  data: Record<string, string | number | Date>
): string {
  const value = data[field.key]
  if (value === undefined || value === null) return ''
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

/**
 * Génère un QR code avec toutes les options appliquées
 */
export async function generateQRCodeWithOptions(
  content: string,
  field: TemplateField,
  defaultWidth: number
): Promise<Buffer> {
  const options: QRCodeOptions = {
    width: field.qrcodeOptions?.width ?? defaultWidth,
    margin: field.qrcodeOptions?.margin ?? 1,
    errorCorrectionLevel: field.qrcodeOptions?.errorCorrectionLevel ?? 'M',
    color: field.qrcodeOptions?.color,
  }
  
  return generateQRCodeBuffer(content, options)
}

