/**
 * Types partagés pour l'application
 */

export type TemplateType = 'pdf' | 'image' | 'docx' | 'pptx'
export type OutputFormat = 'docx' | 'pdf'

/**
 * Options de personnalisation pour les QR codes
 */
export interface QRCodeOptions {
  /**
   * Largeur du QR code en pixels
   * @default basé sur field.w
   */
  width?: number
  
  /**
   * Marge autour du QR code (en modules)
   * @default 1
   */
  margin?: number
  
  /**
   * Niveau de correction d'erreur
   * @default 'M'
   */
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
  
  /**
   * Couleurs du QR code
   */
  color?: {
    dark?: string // Couleur hex pour les modules foncés (défaut: "#000000")
    light?: string // Couleur hex pour les modules clairs (défaut: "#FFFFFF")
  }
}

/**
 * Configuration d'authentification pour les QR codes de certificats
 */
export interface QRCodeCertificateAuth {
  /**
   * Active l'authentification de certificat
   */
  enabled: boolean
  
  /**
   * URL de base pour la vérification (ex: "https://example.com/verify")
   */
  verificationBaseUrl?: string
  
  /**
   * Durée de validité en secondes (optionnel)
   */
  expiresIn?: number
  
  /**
   * Inclure le hash du document pour vérifier l'intégrité
   */
  includeDocumentHash?: boolean
  
  /**
   * Champs à utiliser pour construire les données du certificat
   */
  certificateFields?: {
    certificateId?: string // Clé pour l'ID du certificat
    holderName?: string // Clé pour le nom du titulaire
    title?: string // Clé pour le titre/formation
    issueDate?: string // Clé pour la date d'émission
    issuer?: string // Clé pour l'organisation émettrice
    grade?: string // Clé pour la note/grade
    expiryDate?: string // Clé pour la date d'expiration
  }
}

/**
 * Configuration pour l'URL de stockage dans le QR code
 */
export interface QRCodeStorageUrl {
  /**
   * Active l'intégration de l'URL de stockage
   */
  enabled: boolean
  
  /**
   * Type d'URL à générer
   */
  urlType?: 'signed' | 'public' // signed: URL signée temporaire, public: URL publique
  
  /**
   * Durée de validité en secondes pour les URLs signées
   * @default 3600 (1 heure)
   */
  expiresIn?: number
}

export interface TemplateField {
  key: string
  x: number
  y: number
  w: number
  h: number
  fontSize?: number
  align?: 'left' | 'center' | 'right'
  type: 'text' | 'qrcode' | 'date' | 'number'
  format?: string // Format optionnel (e.g., "YYYY-MM-DD" pour dates, mask pour textes)
  fontFamily?: 'Helvetica' | 'Helvetica-Bold' | 'Times-Roman' | 'Times-Bold' | 'Courier' | 'Courier-Bold'
  textColor?: string // Couleur hex (e.g., "#000000")
  backgroundColor?: string // Couleur de fond hex
  borderColor?: string // Couleur de bordure hex
  borderWidth?: number // Épaisseur de bordure
  
  /**
   * Options de personnalisation pour les QR codes (uniquement si type === 'qrcode')
   */
  qrcodeOptions?: QRCodeOptions
  
  /**
   * Configuration d'authentification pour les QR codes de certificats
   */
  qrcodeAuth?: QRCodeCertificateAuth
  
  /**
   * Configuration pour intégrer l'URL de stockage dans le QR code
   */
  qrcodeStorageUrl?: QRCodeStorageUrl
}

export interface TemplateVariable {
  name: string
  occurrences: number
  context?: string
}

/**
 * Configuration d'un QR Code pour les templates DOCX
 * Permet de définir comment générer le contenu du QR Code à partir des variables
 */
export interface DOCXQRCodeConfig {
  /**
   * Placeholder dans le template DOCX (ex: "{{qrcode_verification}}")
   */
  placeholder: string
  
  /**
   * Pattern du contenu du QR Code, peut contenir des variables
   * Ex: "https://verify.example.com/{{id}}/{{code}}"
   * Ex: "BEGIN:VCARD\nFN:{{nom}} {{prenom}}\nEND:VCARD"
   */
  contentPattern: string
  
  /**
   * Type de contenu du QR Code (optionnel, pour assistance)
   */
  contentType?: 'url' | 'text' | 'vcard' | 'email' | 'phone' | 'custom'
  
  /**
   * Options visuelles du QR Code
   */
  options?: QRCodeOptions
  
  /**
   * Configuration d'authentification (pour certificats)
   */
  auth?: QRCodeCertificateAuth
  
  /**
   * Configuration pour URL de stockage
   */
  storageUrl?: QRCodeStorageUrl
}

export interface DocumentData {
  [key: string]: string | number | Date
}

export interface ImportRow {
  [column: string]: string | number
}

export interface ColumnMapping {
  column: string
  fieldKey: string
  type?: 'string' | 'date' | 'number'
}

export type DocumentStatus = 'generated' | 'sent' | 'failed'

export type UserRole = 'owner' | 'editor' | 'viewer'

