import crypto from 'crypto'

/**
 * Configuration de l'authentification des certificats
 */
export interface CertificateAuthConfig {
  /**
   * Clé secrète pour la signature HMAC
   * En production, utiliser une variable d'environnement sécurisée
   */
  secretKey: string

  /**
   * URL de base pour la vérification
   * Ex: 'https://certificates.example.com/verify'
   */
  verificationBaseUrl: string

  /**
   * Algorithme de hash (défaut: 'sha256')
   */
  algorithm?: 'sha256' | 'sha512'

  /**
   * Durée de validité du QR code en secondes (optionnel)
   * Si défini, le QR code expirera après cette durée
   */
  expiresIn?: number
}

/**
 * Données du certificat à authentifier
 */
export interface CertificateData {
  /**
   * ID unique du certificat
   */
  certificateId: string

  /**
   * Nom du titulaire
   */
  holderName: string

  /**
   * Titre/Nom du cours/formation
   */
  title: string

  /**
   * Date d'émission (ISO 8601)
   */
  issueDate: string

  /**
   * Organisation émettrice
   */
  issuer: string

  /**
   * Note/Grade (optionnel)
   */
  grade?: string

  /**
   * Date d'expiration (optionnel)
   */
  expiryDate?: string

  /**
   * Métadonnées additionnelles (optionnel)
   */
  metadata?: Record<string, string | number | boolean>
}

/**
 * Résultat de la génération d'un certificat authentifié
 */
export interface AuthenticatedCertificate {
  /**
   * Données du certificat
   */
  certificate: CertificateData

  /**
   * Signature HMAC des données
   */
  signature: string

  /**
   * Horodatage de la génération
   */
  timestamp: number

  /**
   * Date d'expiration du QR code (timestamp Unix, optionnel)
   */
  expiresAt?: number

  /**
   * Hash du document (optionnel, pour vérifier l'intégrité du PDF/DOCX)
   */
  documentHash?: string

  /**
   * URL de vérification complète
   */
  verificationUrl: string

  /**
   * Données formatées pour le QR code (JSON stringifié)
   */
  qrCodeData: string
}

/**
 * Génère un hash SHA-256 d'un buffer
 */
export function generateDocumentHash(documentBuffer: Buffer): string {
  return crypto.createHash('sha256').update(documentBuffer).digest('hex')
}

/**
 * Crée une signature HMAC des données du certificat
 */
function createSignature(
  data: CertificateData,
  timestamp: number,
  secretKey: string,
  algorithm: 'sha256' | 'sha512' = 'sha256',
  documentHash?: string,
  expiresAt?: number
): string {
  // Créer une chaîne canonique des données à signer
  const payload = JSON.stringify({
    certificateId: data.certificateId,
    holderName: data.holderName,
    title: data.title,
    issueDate: data.issueDate,
    issuer: data.issuer,
    grade: data.grade,
    expiryDate: data.expiryDate,
    timestamp,
    expiresAt,
    documentHash,
  })

  // Générer la signature HMAC
  const hmac = crypto.createHmac(algorithm, secretKey)
  hmac.update(payload)

  return hmac.digest('hex')
}

/**
 * Génère un certificat authentifié avec QR code signé
 *
 * @param certificateData Données du certificat
 * @param config Configuration d'authentification
 * @param documentBuffer Buffer du document (optionnel, pour hash d'intégrité)
 * @returns Certificat authentifié avec données QR code
 *
 * @example
 * ```typescript
 * const config: CertificateAuthConfig = {
 *   secretKey: process.env.CERTIFICATE_SECRET_KEY!,
 *   verificationBaseUrl: 'https://certificates.example.com/verify',
 *   algorithm: 'sha256',
 *   expiresIn: 365 * 24 * 60 * 60 // 1 an
 * }
 *
 * const certificateData: CertificateData = {
 *   certificateId: 'CERT-2024-001',
 *   holderName: 'Jean Dupont',
 *   title: 'Formation TypeScript Avancé',
 *   issueDate: '2024-11-02T10:00:00Z',
 *   issuer: 'Académie Tech',
 *   grade: 'Excellent'
 * }
 *
 * const authenticated = generateAuthenticatedCertificate(
 *   certificateData,
 *   config,
 *   documentBuffer // Optionnel
 * )
 *
 * // Utiliser authenticated.qrCodeData pour générer le QR code
 * ```
 */
export function generateAuthenticatedCertificate(
  certificateData: CertificateData,
  config: CertificateAuthConfig,
  documentBuffer?: Buffer
): AuthenticatedCertificate {
  // Validation
  if (!config.secretKey) {
    throw new Error("secretKey est requis pour l'authentification")
  }

  if (!config.verificationBaseUrl) {
    throw new Error('verificationBaseUrl est requis')
  }

  if (!certificateData.certificateId) {
    throw new Error('certificateId est requis')
  }

  // Horodatage actuel
  const timestamp = Date.now()

  // Calculer l'expiration si définie
  const expiresAt = config.expiresIn ? timestamp + config.expiresIn * 1000 : undefined

  // Générer le hash du document si fourni
  const documentHash = documentBuffer ? generateDocumentHash(documentBuffer) : undefined

  // Créer la signature
  const signature = createSignature(
    certificateData,
    timestamp,
    config.secretKey,
    config.algorithm,
    documentHash,
    expiresAt
  )

  // Construire l'URL de vérification
  const verificationUrl = `${config.verificationBaseUrl}/${certificateData.certificateId}`

  // Préparer les données pour le QR code
  const qrPayload = {
    type: 'certificate_verification',
    version: '1.0',
    certificate: {
      id: certificateData.certificateId,
      holder: certificateData.holderName,
      title: certificateData.title,
      issueDate: certificateData.issueDate,
      issuer: certificateData.issuer,
      grade: certificateData.grade,
      expiryDate: certificateData.expiryDate,
      metadata: certificateData.metadata,
    },
    verification: {
      signature,
      timestamp,
      expiresAt,
      documentHash,
      algorithm: config.algorithm ?? 'sha256',
    },
    url: verificationUrl,
  }

  const result: AuthenticatedCertificate = {
    certificate: certificateData,
    signature,
    timestamp,
    verificationUrl,
    qrCodeData: JSON.stringify(qrPayload),
  }

  // Ajouter les propriétés optionnelles seulement si définies
  if (expiresAt !== undefined) {
    result.expiresAt = expiresAt
  }

  if (documentHash !== undefined) {
    result.documentHash = documentHash
  }

  return result
}

/**
 * Vérifie la signature d'un certificat authentifié
 *
 * @param qrCodeData Données extraites du QR code (JSON)
 * @param secretKey Clé secrète utilisée pour la signature
 * @param documentBuffer Buffer du document à vérifier (optionnel)
 * @returns true si la signature est valide, false sinon
 *
 * @example
 * ```typescript
 * const isValid = verifyCertificateSignature(
 *   scannedQrData,
 *   process.env.CERTIFICATE_SECRET_KEY!,
 *   documentBuffer
 * )
 *
 * if (isValid) {
 *   console.log('✓ Certificat authentique')
 * } else {
 *   console.log('✗ Certificat invalide ou falsifié')
 * }
 * ```
 */
export function verifyCertificateSignature(
  qrCodeData: string,
  secretKey: string,
  documentBuffer?: Buffer
): boolean {
  try {
    const payload = JSON.parse(qrCodeData)

    // Vérifier la version
    if (payload.version !== '1.0') {
      console.error('Version de payload non supportée')
      return false
    }

    // Vérifier l'expiration
    if (payload.verification.expiresAt) {
      const now = Date.now()
      if (now > payload.verification.expiresAt) {
        console.error('Le certificat a expiré')
        return false
      }
    }

    // Vérifier le hash du document si fourni
    if (payload.verification.documentHash && documentBuffer) {
      const computedHash = generateDocumentHash(documentBuffer)
      if (computedHash !== payload.verification.documentHash) {
        console.error('Le hash du document ne correspond pas')
        return false
      }
    }

    // Reconstruire les données du certificat
    const certificateData: CertificateData = {
      certificateId: payload.certificate.id,
      holderName: payload.certificate.holder,
      title: payload.certificate.title,
      issueDate: payload.certificate.issueDate,
      issuer: payload.certificate.issuer,
      grade: payload.certificate.grade,
      expiryDate: payload.certificate.expiryDate,
      metadata: payload.certificate.metadata,
    }

    // Recalculer la signature
    const expectedSignature = createSignature(
      certificateData,
      payload.verification.timestamp,
      secretKey,
      payload.verification.algorithm ?? 'sha256',
      payload.verification.documentHash,
      payload.verification.expiresAt
    )

    // Comparer les signatures de manière sécurisée (timing attack resistant)
    return crypto.timingSafeEqual(
      Buffer.from(payload.verification.signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  } catch (error) {
    console.error('Erreur lors de la vérification:', error)
    return false
  }
}

/**
 * Génère un QR code d'authentification simplifié (URL uniquement)
 *
 * Cette méthode génère une URL de vérification qui inclut un token JWT-like
 * pour une authentification plus légère (sans toutes les données dans le QR)
 *
 * @param certificateData Données du certificat
 * @param config Configuration d'authentification
 * @returns URL d'authentification avec token
 */
export function generateSimpleAuthUrl(
  certificateData: CertificateData,
  config: CertificateAuthConfig
): string {
  const timestamp = Date.now()
  const expiresAt = config.expiresIn ? timestamp + config.expiresIn * 1000 : undefined

  // Créer un payload minimal
  const payload = JSON.stringify({
    id: certificateData.certificateId,
    ts: timestamp,
    exp: expiresAt,
  })

  // Encoder en base64
  const encodedPayload = Buffer.from(payload).toString('base64url')

  // Créer une signature du payload
  const hmac = crypto.createHmac(config.algorithm ?? 'sha256', config.secretKey)
  hmac.update(encodedPayload)
  const signature = hmac.digest('base64url')

  // Construire l'URL avec le token
  return `${config.verificationBaseUrl}/${certificateData.certificateId}?token=${encodedPayload}.${signature}`
}

/**
 * Vérifie une URL d'authentification simple
 *
 * @param url URL complète scannée depuis le QR code
 * @param secretKey Clé secrète utilisée pour la signature
 * @returns Objet avec le certificateId et la validité, ou null si invalide
 */
export function verifySimpleAuthUrl(
  url: string,
  secretKey: string
): { certificateId: string; timestamp: number; expiresAt?: number } | null {
  try {
    const urlObj = new URL(url)
    const token = urlObj.searchParams.get('token')

    if (!token) {
      return null
    }

    const [encodedPayload, signature] = token.split('.')

    if (!encodedPayload || !signature) {
      return null
    }

    // Vérifier la signature
    const hmac = crypto.createHmac('sha256', secretKey)
    hmac.update(encodedPayload)
    const expectedSignature = hmac.digest('base64url')

    if (signature !== expectedSignature) {
      return null
    }

    // Décoder le payload
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString())

    // Vérifier l'expiration
    if (payload.exp && Date.now() > payload.exp) {
      return null
    }

    return {
      certificateId: payload.id,
      timestamp: payload.ts,
      expiresAt: payload.exp,
    }
  } catch (error) {
    console.error("Erreur lors de la vérification de l'URL:", error)
    return null
  }
}
