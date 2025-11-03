/**
 * Exemples d'utilisation de l'authentification de certificats via QR code
 * 
 * Ce fichier démontre comment générer des certificats sécurisés avec
 * signature cryptographique et vérification d'authenticité.
 */

import {
  generateQRCodeBuffer,
} from '@/lib/qrcode'
import {
  generateAuthenticatedCertificate,
  verifyCertificateSignature,
  generateSimpleAuthUrl,
  verifySimpleAuthUrl,
  generateDocumentHash,
  type CertificateAuthConfig,
  type CertificateData,
} from '@/lib/qrcode/certificate-auth'
import { generateDOCX } from '@/lib/generators/docx'

// ============================================================================
// Configuration globale (À adapter selon votre environnement)
// ============================================================================

const authConfig: CertificateAuthConfig = {
  // ⚠️ EN PRODUCTION : Utiliser process.env.CERTIFICATE_SECRET_KEY
  secretKey: process.env['CERTIFICATE_SECRET_KEY'] ?? 'your-secret-key-change-in-production',
  verificationBaseUrl: 'https://certificates.example.com/verify',
  algorithm: 'sha256',
  expiresIn: 10 * 365 * 24 * 60 * 60, // 10 ans en secondes
}

// ============================================================================
// EXEMPLE 1 : Certificat de formation avec authentification complète
// ============================================================================

async function exempleBasicAuthentication() {
  console.log('=== Exemple 1 : Certificat authentifié (données complètes) ===')
  
  const certificateData: CertificateData = {
    certificateId: 'CERT-2024-TS-001',
    holderName: 'Jean Dupont',
    title: 'Formation TypeScript Avancé',
    issueDate: '2024-11-02T10:00:00Z',
    issuer: 'Académie Tech France',
    grade: 'Excellent (18/20)',
    metadata: {
      duration: '40 heures',
      instructor: 'Prof. Martin',
      location: 'Paris',
    },
  }
  
  // Générer le certificat authentifié
  const authenticated = generateAuthenticatedCertificate(
    certificateData,
    authConfig
  )
  
  console.log('✓ Certificat généré')
  console.log(`  ID: ${authenticated.certificate.certificateId}`)
  console.log(`  Signature: ${authenticated.signature.substring(0, 16)}...`)
  console.log(`  Timestamp: ${new Date(authenticated.timestamp).toISOString()}`)
  console.log(`  URL: ${authenticated.verificationUrl}`)
  
  // Générer le QR code
  const qrBuffer = await generateQRCodeBuffer(authenticated.qrCodeData, {
    width: 250,
    errorCorrectionLevel: 'Q', // Correction moyenne pour documents imprimés
  })
  
  console.log(`✓ QR code généré : ${qrBuffer.length} bytes`)
  
  // Vérifier la signature (simulation de scan)
  const isValid = verifyCertificateSignature(
    authenticated.qrCodeData,
    authConfig.secretKey
  )
  
  console.log(`✓ Vérification: ${isValid ? 'VALIDE ✓' : 'INVALIDE ✗'}`)
  
  return { authenticated, qrBuffer }
}

// ============================================================================
// EXEMPLE 2 : Certificat avec vérification d'intégrité du document
// ============================================================================

async function exempleCertificateWithDocumentHash(templateBuffer: Buffer) {
  console.log('=== Exemple 2 : Certificat avec hash du document ===')
  
  const certificateData: CertificateData = {
    certificateId: 'CERT-2024-SEC-002',
    holderName: 'Marie Martin',
    title: 'Formation Cybersécurité',
    issueDate: '2024-11-02T14:30:00Z',
    issuer: 'CyberSec Academy',
    grade: 'Excellent',
    expiryDate: '2029-11-02T23:59:59Z',
  }
  
  // 1. Générer d'abord le document sans QR code
  let tempBuffer = await generateDOCX(templateBuffer, {
    variables: {
      certificate_id: certificateData.certificateId,
      holder_name: certificateData.holderName,
      title: certificateData.title,
      issue_date: new Date(certificateData.issueDate).toLocaleDateString('fr-FR'),
      issuer: certificateData.issuer,
      grade: certificateData.grade ?? '',
    },
  })
  
  console.log('✓ Document temporaire généré')
  
  // 2. Calculer le hash du document (sans QR code)
  const documentHash = generateDocumentHash(tempBuffer)
  console.log(`✓ Hash du document: ${documentHash.substring(0, 16)}...`)
  
  // 3. Générer le certificat authentifié avec le hash
  const authenticated = generateAuthenticatedCertificate(
    certificateData,
    authConfig,
    tempBuffer
  )
  
  console.log('✓ Certificat authentifié avec hash du document')
  
  // 4. Générer le document final avec le QR code
  const finalBuffer = await generateDOCX(templateBuffer, {
    variables: {
      certificate_id: certificateData.certificateId,
      holder_name: certificateData.holderName,
      title: certificateData.title,
      issue_date: new Date(certificateData.issueDate).toLocaleDateString('fr-FR'),
      issuer: certificateData.issuer,
      grade: certificateData.grade ?? '',
    },
    qrcodes: {
      '{{qrcode_verification}}': authenticated.qrCodeData,
    },
    qrcodeOptions: {
      width: 200,
      errorCorrectionLevel: 'Q',
    },
  })
  
  console.log('✓ Document final généré avec QR code')
  
  // 5. Vérification (simulation)
  const isValid = verifyCertificateSignature(
    authenticated.qrCodeData,
    authConfig.secretKey,
    tempBuffer // Vérifier avec le document original
  )
  
  console.log(`✓ Vérification complète: ${isValid ? 'VALIDE ✓' : 'INVALIDE ✗'}`)
  
  return finalBuffer
}

// ============================================================================
// EXEMPLE 3 : URL d'authentification simple (QR code plus léger)
// ============================================================================

async function exempleSimpleAuthUrl() {
  console.log('=== Exemple 3 : URL d\'authentification simple ===')
  
  const certificateData: CertificateData = {
    certificateId: 'CERT-2024-QUICK-003',
    holderName: 'Pierre Durand',
    title: 'Atelier React & Next.js',
    issueDate: '2024-11-02T16:00:00Z',
    issuer: 'WebDev Institute',
  }
  
  // Générer une URL simple (plus légère, QR code moins dense)
  const authUrl = generateSimpleAuthUrl(certificateData, authConfig)
  
  console.log('✓ URL générée:', authUrl)
  
  // Générer le QR code avec l'URL
  const qrBuffer = await generateQRCodeBuffer(authUrl, {
    width: 180,
    errorCorrectionLevel: 'M',
  })
  
  console.log(`✓ QR code généré : ${qrBuffer.length} bytes (plus léger)`)
  
  // Vérification de l'URL
  const verification = verifySimpleAuthUrl(authUrl, authConfig.secretKey)
  
  if (verification) {
    console.log('✓ URL valide')
    console.log(`  Certificate ID: ${verification.certificateId}`)
    console.log(`  Timestamp: ${new Date(verification.timestamp).toISOString()}`)
  } else {
    console.log('✗ URL invalide')
  }
  
  return { authUrl, qrBuffer }
}

// ============================================================================
// EXEMPLE 4 : Diplôme universitaire avec métadonnées étendues
// ============================================================================

async function exempleDiplomeUniversitaire(templateBuffer: Buffer) {
  console.log('=== Exemple 4 : Diplôme universitaire ===')
  
  const certificateData: CertificateData = {
    certificateId: 'DIPLOME-2024-MASTER-004',
    holderName: 'Sophie Bernard',
    title: 'Master Informatique - Spécialité Intelligence Artificielle',
    issueDate: '2024-07-15T10:00:00Z',
    issuer: 'Université Paris Tech',
    grade: 'Mention Très Bien',
    metadata: {
      level: 'Bac+5',
      ects: 120,
      specialization: 'Intelligence Artificielle',
      honors: 'Félicitations du jury',
      thesis: 'Machine Learning pour la détection de fraudes',
      thesisGrade: '19/20',
    },
  }
  
  // Générer le certificat avec toutes les métadonnées
  const authenticated = generateAuthenticatedCertificate(
    certificateData,
    authConfig
  )
  
  console.log('✓ Diplôme authentifié')
  console.log(`  Niveau: ${certificateData.metadata?.level}`)
  console.log(`  ECTS: ${certificateData.metadata?.ects}`)
  console.log(`  Mention: ${certificateData.grade}`)
  
  // Générer le document
  const docxBuffer = await generateDOCX(templateBuffer, {
    variables: {
      certificate_id: certificateData.certificateId,
      holder_name: certificateData.holderName,
      title: certificateData.title,
      issue_date: new Date(certificateData.issueDate).toLocaleDateString('fr-FR'),
      issuer: certificateData.issuer,
      grade: certificateData.grade ?? '',
      level: String(certificateData.metadata?.level ?? ''),
      ects: String(certificateData.metadata?.ects ?? ''),
      specialization: String(certificateData.metadata?.specialization ?? ''),
    },
    qrcodes: {
      '{{qrcode_verification}}': authenticated.qrCodeData,
    },
    qrcodeOptions: {
      width: 220,
      errorCorrectionLevel: 'H', // Haute correction pour document officiel
    },
  })
  
  console.log('✓ Document diplôme généré')
  
  return docxBuffer
}

// ============================================================================
// EXEMPLE 5 : Certificat médical (avec expiration)
// ============================================================================

async function exempleCertificatMedical() {
  console.log('=== Exemple 5 : Certificat médical avec expiration ===')
  
  const certificateData: CertificateData = {
    certificateId: 'CERT-MED-2024-005',
    holderName: 'Dr. Laurent Petit',
    title: 'Certificat de Formation Continue en Cardiologie',
    issueDate: '2024-11-02T09:00:00Z',
    issuer: 'Ordre National des Médecins',
    expiryDate: '2025-11-02T23:59:59Z', // Expire dans 1 an
    metadata: {
      speciality: 'Cardiologie',
      hours: '30 heures',
      type: 'Formation Continue Obligatoire',
    },
  }
  
  // Configuration avec expiration courte (1 an)
  const medicalAuthConfig: CertificateAuthConfig = {
    ...authConfig,
    expiresIn: 365 * 24 * 60 * 60, // 1 an
  }
  
  const authenticated = generateAuthenticatedCertificate(
    certificateData,
    medicalAuthConfig
  )
  
  console.log('✓ Certificat médical authentifié')
  console.log(`  Valide jusqu'au: ${certificateData.expiryDate}`)
  console.log(`  QR code expire le: ${new Date(authenticated.expiresAt!).toISOString()}`)
  
  // Générer le QR code
  const qrBuffer = await generateQRCodeBuffer(authenticated.qrCodeData, {
    width: 200,
    errorCorrectionLevel: 'H',
  })
  
  console.log(`✓ QR code généré : ${qrBuffer.length} bytes`)
  
  return { authenticated, qrBuffer }
}

// ============================================================================
// EXEMPLE 6 : Attestation professionnelle (habilitation)
// ============================================================================

async function exempleAttestationProfessionnelle() {
  console.log('=== Exemple 6 : Attestation d\'habilitation électrique ===')
  
  const certificateData: CertificateData = {
    certificateId: 'HAB-ELEC-2024-006',
    holderName: 'Marc Dubois',
    title: 'Habilitation Électrique B2V',
    issueDate: '2024-11-02T14:00:00Z',
    issuer: 'APAVE Formation',
    expiryDate: '2027-11-02T23:59:59Z', // 3 ans
    metadata: {
      type: 'Habilitation Électrique',
      level: 'B2V',
      domain: 'Travaux sous tension',
      training_hours: '21 heures',
      instructor: 'Jean Martin',
    },
  }
  
  // Configuration stricte pour habilitations
  const habilitationConfig: CertificateAuthConfig = {
    ...authConfig,
    algorithm: 'sha512', // Algorithme plus fort
    expiresIn: 3 * 365 * 24 * 60 * 60, // 3 ans
  }
  
  const authenticated = generateAuthenticatedCertificate(
    certificateData,
    habilitationConfig
  )
  
  console.log('✓ Attestation d\'habilitation authentifiée')
  console.log(`  Niveau: ${certificateData.metadata?.level}`)
  console.log(`  Algorithme: ${habilitationConfig.algorithm}`)
  console.log(`  Validité: 3 ans`)
  
  // URL simple pour scan rapide sur chantier
  const quickUrl = generateSimpleAuthUrl(certificateData, habilitationConfig)
  
  console.log(`✓ URL de vérification rapide générée`)
  console.log(`  ${quickUrl}`)
  
  return authenticated
}

// ============================================================================
// EXEMPLE 7 : API de vérification (Backend)
// ============================================================================

/**
 * Exemple d'endpoint API pour vérifier un certificat
 * 
 * À implémenter dans votre backend (Express, Fastify, etc.)
 */
function exempleAPIVerification() {
  console.log('=== Exemple 7 : API de vérification (pseudo-code) ===')
  
  console.log(`
  // Exemple d'endpoint Express.js
  
  import { verifyCertificateSignature } from '@/lib/qrcode/certificate-auth'
  
  app.post('/api/certificates/verify', async (req, res) => {
    const { qrCodeData } = req.body
    
    if (!qrCodeData) {
      return res.status(400).json({ error: 'qrCodeData requis' })
    }
    
    try {
      // Vérifier la signature
      const isValid = verifyCertificateSignature(
        qrCodeData,
        process.env.CERTIFICATE_SECRET_KEY!
      )
      
      if (!isValid) {
        return res.status(401).json({
          valid: false,
          error: 'Signature invalide ou certificat falsifié'
        })
      }
      
      // Parser les données
      const payload = JSON.parse(qrCodeData)
      
      // Vérifier dans la base de données
      const dbCertificate = await db.certificates.findOne({
        id: payload.certificate.id
      })
      
      if (!dbCertificate) {
        return res.status(404).json({
          valid: false,
          error: 'Certificat non trouvé'
        })
      }
      
      // Vérifier si révoqué
      if (dbCertificate.revoked) {
        return res.status(403).json({
          valid: false,
          error: 'Certificat révoqué',
          revokedAt: dbCertificate.revokedAt,
          reason: dbCertificate.revocationReason
        })
      }
      
      // Tout est OK
      return res.json({
        valid: true,
        certificate: payload.certificate,
        verification: {
          timestamp: payload.verification.timestamp,
          verifiedAt: new Date().toISOString()
        }
      })
      
    } catch (error) {
      return res.status(500).json({
        valid: false,
        error: 'Erreur lors de la vérification'
      })
    }
  })
  
  // Endpoint pour vérification par ID (URL simple)
  app.get('/api/certificates/verify/:id', async (req, res) => {
    const { id } = req.params
    const token = req.query.token as string
    
    if (!token) {
      return res.status(400).json({ error: 'Token requis' })
    }
    
    const url = \`https://certificates.example.com/verify/\${id}?token=\${token}\`
    
    const verification = verifySimpleAuthUrl(
      url,
      process.env.CERTIFICATE_SECRET_KEY!
    )
    
    if (!verification) {
      return res.status(401).json({
        valid: false,
        error: 'Token invalide ou expiré'
      })
    }
    
    // Récupérer les détails depuis la DB
    const certificate = await db.certificates.findOne({ id })
    
    if (!certificate) {
      return res.status(404).json({ valid: false, error: 'Non trouvé' })
    }
    
    return res.json({
      valid: true,
      certificate,
      verification
    })
  })
  `)
}

// ============================================================================
// EXEMPLE 8 : Tests de falsification
// ============================================================================

async function exempleTestsFalsification() {
  console.log('=== Exemple 8 : Tests de sécurité ===')
  
  const certificateData: CertificateData = {
    certificateId: 'CERT-2024-TEST-008',
    holderName: 'Test User',
    title: 'Test Certificate',
    issueDate: '2024-11-02T10:00:00Z',
    issuer: 'Test Authority',
  }
  
  // Générer un certificat valide
  const authenticated = generateAuthenticatedCertificate(
    certificateData,
    authConfig
  )
  
  console.log('✓ Certificat valide généré')
  
  // Test 1 : Vérification normale (doit passer)
  const test1 = verifyCertificateSignature(
    authenticated.qrCodeData,
    authConfig.secretKey
  )
  console.log(`  Test 1 - Certificat valide: ${test1 ? '✓ PASS' : '✗ FAIL'}`)
  
  // Test 2 : Modification des données (doit échouer)
  const tamperedData = JSON.parse(authenticated.qrCodeData)
  tamperedData.certificate.holder = 'Hacker'
  const test2 = verifyCertificateSignature(
    JSON.stringify(tamperedData),
    authConfig.secretKey
  )
  console.log(`  Test 2 - Données modifiées: ${!test2 ? '✓ PASS (rejeté)' : '✗ FAIL (accepté!)'}`)
  
  // Test 3 : Mauvaise clé secrète (doit échouer)
  const test3 = verifyCertificateSignature(
    authenticated.qrCodeData,
    'wrong-secret-key'
  )
  console.log(`  Test 3 - Mauvaise clé: ${!test3 ? '✓ PASS (rejeté)' : '✗ FAIL (accepté!)'}`)
  
  // Test 4 : QR code expiré
  const expiredConfig: CertificateAuthConfig = {
    ...authConfig,
    expiresIn: -3600, // Expiré il y a 1 heure
  }
  const expiredCert = generateAuthenticatedCertificate(
    certificateData,
    expiredConfig
  )
  const test4 = verifyCertificateSignature(
    expiredCert.qrCodeData,
    authConfig.secretKey
  )
  console.log(`  Test 4 - Certificat expiré: ${!test4 ? '✓ PASS (rejeté)' : '✗ FAIL (accepté!)'}`)
  
  console.log('✓ Tests de sécurité terminés')
}

// ============================================================================
// Exécution des exemples
// ============================================================================

export async function runCertificateAuthExamples() {
  try {
    console.log('\n🔐 Démarrage des exemples d\'authentification de certificats\n')
    
    await exempleBasicAuthentication()
    console.log('')
    
    await exempleSimpleAuthUrl()
    console.log('')
    
    await exempleCertificatMedical()
    console.log('')
    
    await exempleAttestationProfessionnelle()
    console.log('')
    
    await exempleTestsFalsification()
    console.log('')
    
    exempleAPIVerification()
    console.log('')
    
    console.log('✅ Tous les exemples d\'authentification ont été exécutés !\n')
    
    // Note : Les exemples avec template nécessitent un buffer
    // const fs = require('fs')
    // const templateBuffer = fs.readFileSync('template-certificate.docx')
    // await exempleCertificateWithDocumentHash(templateBuffer)
    // await exempleDiplomeUniversitaire(templateBuffer)
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution des exemples :', error)
    throw error
  }
}

// Pour exécuter les exemples
// runCertificateAuthExamples().catch(console.error)

