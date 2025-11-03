/**
 * Module de génération de QR codes
 * 
 * Fournit des utilitaires pour générer des QR codes dans différents formats
 * et pour différents types de contenu (URL, email, vCard, WiFi, etc.)
 */

export {
  generateQRCodeBuffer,
  generateQRCodeDataURL,
  generateQRCodeFromContent,
  generateQRCodeDataURLFromContent,
  formatQRCodeContent,
  validateQRCodeContent,
  type QRCodeOptions,
  type QRCodeDataType,
  type QRCodeContent,
} from './generator'

export {
  insertQRCodeInDOCX,
  insertMultipleQRCodesInDOCX,
  type QRCodeInsertOptions,
} from './docx-integration'

export {
  generateAuthenticatedCertificate,
  verifyCertificateSignature,
  generateSimpleAuthUrl,
  verifySimpleAuthUrl,
  generateDocumentHash,
  type CertificateAuthConfig,
  type CertificateData,
  type AuthenticatedCertificate,
} from './certificate-auth'

