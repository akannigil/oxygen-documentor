import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { insertMultipleQRCodesInDOCX } from '@/lib/qrcode'
import {
  generateAuthenticatedCertificate,
  type CertificateAuthConfig,
  type CertificateData,
} from '@/lib/qrcode/certificate-auth'
import type { DOCXQRCodeConfig } from '@/shared/types'
import { applyVariableStyles, type DOCXStyleOptions } from './docx-style-module'
import { embedGoogleFontInDOCX, POPULAR_GOOGLE_FONTS } from './google-fonts'

/**
 * Formate une valeur selon son type pour DOCX
 */
function formatValueForDOCX(value: string | number | Date | undefined, format?: string): string {
  if (value === undefined || value === null || value === '') {
    return ''
  }

  // Dates
  if (value instanceof Date) {
    if (format === 'YYYY-MM-DD') {
      return value.toISOString().split('T')[0] || ''
    } else if (format === 'DD/MM/YYYY') {
      const day = String(value.getDate()).padStart(2, '0')
      const month = String(value.getMonth() + 1).padStart(2, '0')
      const year = value.getFullYear()
      return `${day}/${month}/${year}`
    }
    return value.toLocaleDateString('fr-FR')
  }

  // Nombres
  if (typeof value === 'number') {
    if (format && format.includes('.')) {
      const decimals = format.split('.')[1]?.length ?? 2
      return value.toFixed(decimals)
    }
    return value.toString()
  }

  // Texte
  const text = String(value)
  if (format) {
    switch (format.toLowerCase()) {
      case 'uppercase':
        return text.toUpperCase()
      case 'lowercase':
        return text.toLowerCase()
      case 'capitalize':
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
    }
  }
  
  return text
}

export interface GenerateDOCXOptions {
  /**
   * Variables à remplacer dans le template
   */
  variables: Record<string, string | number | Date>
  
  /**
   * Mapping des champs du template aux formats (optionnel)
   * Ex: { date: 'DD/MM/YYYY', montant: '0.00' }
   */
  formats?: Record<string, string>
  
  /**
   * Configuration des QR codes à générer
   * Chaque entrée définit un placeholder et les données du QR code
   * Ex: { '{{qrcode_url}}': 'https://example.com' }
   */
  qrcodes?: Record<string, string>
  
  /**
   * Options de génération des QR codes (taille, marge, etc.)
   */
  qrcodeOptions?: {
    width?: number
    margin?: number
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
  }
  
  /**
   * Configurations des QR Codes DOCX avec patterns dynamiques (nouvelle méthode)
   * Remplace progressivement qrcodes et permet des QR Codes avec variables
   */
  qrcodeConfigs?: DOCXQRCodeConfig[]
  
  /**
   * (Avancé) Chemin du fichier final pour ce document, utilisé pour générer une URL de stockage
   * Ex: "projects/{projectId}/documents/{documentId}.docx"
   */
  documentFilePath?: string

  /**
   * (Avancé) Callback pour obtenir l'URL de stockage (signée ou publique)
   */
  getStorageUrl?: (filePath: string, signed?: boolean, expiresIn?: number) => Promise<string>

  /**
   * Configuration des styles pour les variables DOCX (optionnel)
   * Permet de définir la police, la taille et autres propriétés de style pour les variables
   */
  styleOptions?: DOCXStyleOptions

  /**
   * Configuration pour authentification de certificat (optionnel)
   * Si fournie, génère automatiquement un QR code authentifié
   */
  certificate?: {
    /**
     * Activer l'authentification de certificat
     */
    enabled: boolean
    
    /**
     * Données du certificat (détectées automatiquement depuis variables si non fournies)
     */
    data?: Partial<CertificateData>
    
    /**
     * Configuration d'authentification
     */
    authConfig?: CertificateAuthConfig
    
    /**
     * Placeholder du QR code dans le template
     * @default '{{qrcode_verification}}'
     */
    qrcodePlaceholder?: string
    
    /**
     * Inclure le hash du document pour vérifier l'intégrité
     * @default false
     */
    includeDocumentHash?: boolean
  }
}

/**
 * Détecte et extrait automatiquement les données de certificat depuis les variables
 */
function detectCertificateData(variables: Record<string, string | number | Date>): Partial<CertificateData> {
  const data: Partial<CertificateData> = {}
  
  // Détection des champs communs de certificat
  const idFields = ['certificate_id', 'certificateId', 'id', 'cert_id']
  const holderFields = ['holder_name', 'holderName', 'student_name', 'participant_name', 'name']
  const titleFields = ['title', 'course_name', 'formation', 'training']
  const issueDateFields = ['issue_date', 'issueDate', 'date', 'creation_date']
  const issuerFields = ['issuer', 'organization', 'organisme', 'emetteur']
  const gradeFields = ['grade', 'note', 'mention', 'result']
  
  // Extraire les champs
  for (const [key, value] of Object.entries(variables)) {
    const lowerKey = key.toLowerCase()
    
    if (idFields.includes(lowerKey)) {
      data.certificateId = String(value)
    } else if (holderFields.includes(lowerKey)) {
      data.holderName = String(value)
    } else if (titleFields.includes(lowerKey)) {
      data.title = String(value)
    } else if (issueDateFields.includes(lowerKey)) {
      const dateValue = value instanceof Date ? value.toISOString() : String(value)
      data.issueDate = dateValue
    } else if (issuerFields.includes(lowerKey)) {
      data.issuer = String(value)
    } else if (gradeFields.includes(lowerKey)) {
      data.grade = String(value)
    }
  }
  
  return data
}

/**
 * Génère un document DOCX à partir d'un template et de données
 * 
 * @param templateBuffer Buffer du template DOCX contenant des variables {{...}}
 * @param options Options de génération
 * @returns Buffer du document DOCX généré
 */
export async function generateDOCX(
  templateBuffer: Buffer,
  options: GenerateDOCXOptions
): Promise<Buffer> {
  try {
    const zip = new PizZip(templateBuffer)

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: {
        start: '{{',
        end: '}}',
      },
    })

    // Formater les données selon les formats spécifiés
    const formattedData: Record<string, string> = {}

    for (const [key, value] of Object.entries(options.variables)) {
      const format = options.formats?.[key]
      formattedData[key] = formatValueForDOCX(value, format)
    }

    // Préserver les placeholders QR code pour qu'ils ne soient pas supprimés par docxtemplater
    // On les ajoute à formattedData avec leur valeur placeholder pour qu'ils restent dans le document
    if (options.qrcodeConfigs && options.qrcodeConfigs.length > 0) {
      for (const config of options.qrcodeConfigs) {
        // Extraire le nom de la variable du placeholder (ex: "{{qrcode_verification}}" -> "qrcode_verification")
        const placeholderMatch = config.placeholder.match(/^\{\{([^}]+)\}\}$/)
        if (placeholderMatch && placeholderMatch[1]) {
          const placeholderKey = placeholderMatch[1]
          // Ajouter le placeholder avec sa valeur complète pour qu'il ne soit pas supprimé
          formattedData[placeholderKey] = config.placeholder
        }
      }
    }

    // Préserver aussi les placeholders QR code de l'ancienne méthode
    if (options.qrcodes && Object.keys(options.qrcodes).length > 0) {
      for (const placeholder of Object.keys(options.qrcodes)) {
        const placeholderMatch = placeholder.match(/^\{\{([^}]+)\}\}$/)
        if (placeholderMatch && placeholderMatch[1]) {
          const placeholderKey = placeholderMatch[1]
          formattedData[placeholderKey] = placeholder
        }
      }
    }

    // Préserver le placeholder de certificat si activé
    if (options.certificate?.enabled) {
      const placeholder = options.certificate.qrcodePlaceholder ?? '{{qrcode_verification}}'
      const placeholderMatch = placeholder.match(/^\{\{([^}]+)\}\}$/)
      if (placeholderMatch && placeholderMatch[1]) {
        const placeholderKey = placeholderMatch[1]
        formattedData[placeholderKey] = placeholder
      }
    }

    // Rendre le template avec les données
    doc.render(formattedData)

    // Appliquer les styles aux variables si configuré
    if (options.styleOptions) {
      // Vérifier si une Google Font est utilisée
      const fontFamily = options.styleOptions.defaultStyle?.fontFamily || 
                        Object.values(options.styleOptions.variableStyles || {})[0]?.fontFamily
      
      if (fontFamily && POPULAR_GOOGLE_FONTS[fontFamily]) {
        // Télécharger et intégrer la Google Font
        try {
          const zip = doc.getZip()
          const variant = options.styleOptions.defaultStyle?.bold ? 'bold' : 'regular'
          await embedGoogleFontInDOCX(zip, fontFamily, variant)
        } catch (error) {
          console.warn(`Impossible d'intégrer la Google Font ${fontFamily}:`, error)
          // Continuer sans intégrer la police (le document utilisera une police de substitution)
        }
      }
      
      applyVariableStyles(doc.getZip(), formattedData, options.styleOptions)
    }

    // Générer le buffer initial
    const buffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    })

    const finalBuffer = Buffer.from(buffer)

    // Préparer les QR codes à insérer
    const qrCodeInsertions: Array<{
      placeholder: string
      data: string
      options?: {
        width?: number
        margin?: number
        errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
        color?: {
          dark?: string
          light?: string
        }
      }
    }> = []

    // Traiter les QR codes depuis qrcodeConfigs (nouvelle méthode)
    if (options.qrcodeConfigs && options.qrcodeConfigs.length > 0) {
      for (const config of options.qrcodeConfigs) {
        let qrContent: string
        let qrOptions: {
          width: number
          margin: number
          errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H'
          color?: { dark?: string; light?: string }
        } = {
          width: config.options?.width ?? 200,
          margin: config.options?.margin ?? 1,
          errorCorrectionLevel: (config.options?.errorCorrectionLevel ?? 'M') as
            | 'L'
            | 'M'
            | 'Q'
            | 'H',
          ...(config.options?.color && { color: config.options.color }),
        }

        // Si l'authentification est activée
        if (config.auth?.enabled) {
          // Configuration d'authentification par défaut
          const defaultAuthConfig: CertificateAuthConfig = {
            secretKey: process.env['CERTIFICATE_SECRET_KEY'] ?? '',
            verificationBaseUrl:
              process.env['CERTIFICATE_VERIFICATION_BASE_URL'] ??
              process.env['VERIFICATION_BASE_URL'] ??
              'https://certificates.example.com/verify',
            algorithm: 'sha256' as const,
            expiresIn: config.auth.expiresIn ?? 10 * 365 * 24 * 60 * 60, // 10 ans par défaut
          }

          const authConfig: CertificateAuthConfig = {
            secretKey: process.env['CERTIFICATE_SECRET_KEY'] ?? '',
            verificationBaseUrl:
              config.auth.verificationBaseUrl ?? defaultAuthConfig.verificationBaseUrl,
            ...(defaultAuthConfig.algorithm && { algorithm: defaultAuthConfig.algorithm }),
            ...(config.auth.expiresIn !== undefined && { expiresIn: config.auth.expiresIn }),
            ...(config.auth.expiresIn === undefined &&
              defaultAuthConfig.expiresIn !== undefined && {
                expiresIn: defaultAuthConfig.expiresIn,
              }),
          }

          if (!authConfig.secretKey) {
            throw new Error(
              'CERTIFICATE_SECRET_KEY non configurée - voir docs/CONFIGURATION_CERTIFICATS.md'
            )
          }

          // Construire les données du certificat depuis les variables
          const certificateFields = config.auth.certificateFields
          const getFieldValue = (key?: string): string | undefined => {
            if (!key) return undefined
            const value = options.variables[key]
            if (value === undefined || value === null) return undefined
            if (value instanceof Date) return value.toISOString()
            return String(value)
          }

          // Détecter les données si certificateFields n'est pas fourni
          if (!certificateFields) {
            const detectedData = detectCertificateData(options.variables)
            const certificateData: CertificateData = {
              certificateId: detectedData.certificateId ?? 'UNKNOWN',
              holderName: detectedData.holderName ?? 'Unknown',
              title: detectedData.title ?? 'Certificate',
              issueDate: detectedData.issueDate ?? new Date().toISOString(),
              issuer: detectedData.issuer ?? 'Unknown Issuer',
              ...(detectedData.grade && { grade: detectedData.grade }),
              ...(detectedData.expiryDate && { expiryDate: detectedData.expiryDate }),
            }

            // Générer le certificat authentifié
            let documentHashBuffer: Buffer | undefined
            if (config.auth.includeDocumentHash) {
              documentHashBuffer = finalBuffer
            }

            const authenticated = generateAuthenticatedCertificate(
              certificateData,
              authConfig,
              documentHashBuffer
            )

            qrContent = authenticated.qrCodeData
            // Utiliser un niveau de correction plus élevé pour les certificats authentifiés
            qrOptions.errorCorrectionLevel = 'Q'
          } else {
            // Utiliser les champs configurés
            const certificateData: CertificateData = {
              certificateId: getFieldValue(certificateFields.certificateId) || 'UNKNOWN',
              holderName: getFieldValue(certificateFields.holderName) || 'Unknown',
              title: getFieldValue(certificateFields.title) || 'Certificate',
              issueDate: getFieldValue(certificateFields.issueDate) || new Date().toISOString(),
              issuer: getFieldValue(certificateFields.issuer) || 'Unknown Issuer',
              ...(certificateFields.grade && getFieldValue(certificateFields.grade)
                ? { grade: getFieldValue(certificateFields.grade)! }
                : {}),
              ...(certificateFields.expiryDate && getFieldValue(certificateFields.expiryDate)
                ? { expiryDate: getFieldValue(certificateFields.expiryDate)! }
                : {}),
            }

            // Générer le certificat authentifié
            let documentHashBuffer: Buffer | undefined
            if (config.auth.includeDocumentHash) {
              documentHashBuffer = finalBuffer
            }

            const authenticated = generateAuthenticatedCertificate(
              certificateData,
              authConfig,
              documentHashBuffer
            )

            qrContent = authenticated.qrCodeData
            // Utiliser un niveau de correction plus élevé pour les certificats authentifiés
            qrOptions = { ...qrOptions, errorCorrectionLevel: 'Q' as const }
          }
        } else {
          // Remplacer les variables dans le pattern de contenu
          qrContent = config.contentPattern
          Object.entries(options.variables).forEach(([key, value]) => {
            const variablePattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
            qrContent = qrContent.replace(variablePattern, String(value))
          })

          // Support explicite d'un placeholder interne pour le chemin de fichier final
          // Permet des patterns stables de type: https://app.example.com/redirect?path={{document_file_path}}
          if (options.documentFilePath) {
            qrContent = qrContent.replace(/\{\{document_file_path\}\}/g, options.documentFilePath)
          }

          // Intégration URL de stockage si demandée ou si le pattern le requiert
          const wantsStorageUrl = Boolean(config.storageUrl?.enabled) || qrContent.includes('{{storage_url}}')
          if (wantsStorageUrl) {
            if (!options.documentFilePath || !options.getStorageUrl) {
              throw new Error(
                'Intégration URL de stockage demandée pour un QR Code mais documentFilePath/getStorageUrl non fournis à generateDOCX()'
              )
            }

            const useSigned = (config.storageUrl?.urlType ?? 'signed') === 'signed'
            const expiresIn = config.storageUrl?.expiresIn ?? 3600
            const storageUrl = await options.getStorageUrl(options.documentFilePath, useSigned, expiresIn)

            if (qrContent.trim().length === 0 || qrContent.trim() === '{{storage_url}}') {
              qrContent = storageUrl
            } else {
              // Remplacer toutes les occurrences explicites
              qrContent = qrContent.replace(/\{\{storage_url\}\}/g, storageUrl)
            }
          }
        }

        qrCodeInsertions.push({
          placeholder: config.placeholder,
          data: qrContent,
          options: qrOptions,
        })
      }
    }

    // Traiter les QR codes manuels si spécifiés (ancienne méthode, pour rétrocompatibilité)
    if (options.qrcodes && Object.keys(options.qrcodes).length > 0) {
      Object.entries(options.qrcodes).forEach(([placeholder, data]) => {
        qrCodeInsertions.push({
          placeholder,
          data,
          options: {
            width: options.qrcodeOptions?.width ?? 200,
            margin: options.qrcodeOptions?.margin ?? 1,
            errorCorrectionLevel: options.qrcodeOptions?.errorCorrectionLevel ?? 'M',
          },
        })
      })
    }

    // Traiter l'authentification de certificat si activée
    if (options.certificate?.enabled) {
      // Configuration par défaut
      const defaultAuthConfig: CertificateAuthConfig = {
        secretKey: process.env['CERTIFICATE_SECRET_KEY'] ?? '',
        verificationBaseUrl:
          process.env['VERIFICATION_BASE_URL'] ?? 'https://certificates.example.com/verify',
        algorithm: 'sha256',
        expiresIn: 10 * 365 * 24 * 60 * 60, // 10 ans
      }

      const authConfig = options.certificate.authConfig ?? defaultAuthConfig

      if (!authConfig.secretKey) {
        throw new Error(
          'CERTIFICATE_SECRET_KEY non configurée - voir docs/CONFIGURATION_CERTIFICATS.md'
        )
      }

      // Détecter ou utiliser les données de certificat fournies
      const detectedData = detectCertificateData(options.variables)
      const certificateData: CertificateData = {
        certificateId:
          options.certificate.data?.certificateId ?? detectedData.certificateId ?? 'UNKNOWN',
        holderName: options.certificate.data?.holderName ?? detectedData.holderName ?? 'Unknown',
        title: options.certificate.data?.title ?? detectedData.title ?? 'Certificate',
        issueDate:
          options.certificate.data?.issueDate ?? detectedData.issueDate ?? new Date().toISOString(),
        issuer: options.certificate.data?.issuer ?? detectedData.issuer ?? 'Unknown Issuer',
      }

      // Ajouter les propriétés optionnelles seulement si définies
      const grade = options.certificate.data?.grade ?? detectedData.grade
      if (grade) {
        certificateData.grade = grade
      }

      if (options.certificate.data?.expiryDate) {
        certificateData.expiryDate = options.certificate.data.expiryDate
      }

      if (options.certificate.data?.metadata) {
        certificateData.metadata = options.certificate.data.metadata
      }

      // Générer le certificat authentifié
      let documentHashBuffer: Buffer | undefined

      if (options.certificate.includeDocumentHash) {
        // Utiliser le buffer actuel pour calculer le hash
        documentHashBuffer = finalBuffer
      }

      const authenticated = generateAuthenticatedCertificate(
        certificateData,
        authConfig,
        documentHashBuffer
      )

      // Ajouter le QR code authentifié
      const placeholder = options.certificate.qrcodePlaceholder ?? '{{qrcode_verification}}'
      qrCodeInsertions.push({
        placeholder,
        data: authenticated.qrCodeData,
        options: {
          width: options.qrcodeOptions?.width ?? 200,
          margin: options.qrcodeOptions?.margin ?? 1,
          errorCorrectionLevel: options.qrcodeOptions?.errorCorrectionLevel ?? 'Q',
        },
      })
    }

    // Insérer tous les QR codes
    if (qrCodeInsertions.length > 0) {
      const updatedBuffer = await insertMultipleQRCodesInDOCX(finalBuffer, qrCodeInsertions)
      return Buffer.from(updatedBuffer)
    }

    return finalBuffer
  } catch (error) {
    // Gestion améliorée des erreurs de docxtemplater
    if (error instanceof Error) {
      // @ts-expect-error - docxtemplater ajoute des propriétés personnalisées à Error
      if (error.properties && error.properties.errors instanceof Array) {
        // @ts-expect-error - docxtemplater structure d'erreur non typée
        const errorMessages = error.properties.errors
          .map((e: { properties?: { explanation?: string }; message?: string }) => {
            if (e.properties?.explanation) {
              return e.properties.explanation
            }
            if (e.message) {
              return e.message
            }
            return String(e)
          })
          .filter(Boolean)
          .join('\n')
        
        throw new Error(`Erreur de template DOCX:\n${errorMessages}`)
      }
      
      throw new Error(`Erreur lors de la génération DOCX: ${error.message}`)
    }
    
    throw new Error('Erreur inconnue lors de la génération DOCX')
  }
}

/**
 * DÉPRÉCIÉ: Utiliser generateQRCodeBuffer de @/lib/qrcode à la place
 * 
 * @deprecated Utiliser import { generateQRCodeBuffer } from '@/lib/qrcode'
 */
export { generateQRCodeBuffer } from '@/lib/qrcode'

