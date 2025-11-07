/**
 * Exemples d'utilisation de la génération de QR codes
 *
 * Ce fichier contient des exemples concrets d'utilisation
 * du module de génération de QR codes dans différents scénarios.
 */

import {
  generateQRCodeBuffer,
  generateQRCodeFromContent,
  formatQRCodeContent,
  type QRCodeContent,
  generateAuthenticatedCertificate,
  type CertificateAuthConfig,
  type CertificateData,
} from '@/lib/qrcode'
import { generateDOCX } from '@/lib/generators/docx'

// ============================================================================
// EXEMPLE 1 : QR Code simple (URL)
// ============================================================================

export async function exempleSimpleURL() {
  console.log('=== Exemple 1 : QR Code URL simple ===')

  const url = 'https://example.com'
  const qrBuffer = await generateQRCodeBuffer(url, {
    width: 200,
    margin: 1,
    errorCorrectionLevel: 'M',
  })

  console.log(`✓ QR code généré : ${qrBuffer.length} bytes`)

  // Vous pouvez maintenant :
  // - Sauvegarder le buffer dans un fichier
  // - L'envoyer via une API
  // - L'insérer dans un document
}

// ============================================================================
// EXEMPLE 2 : Carte de visite numérique (vCard)
// ============================================================================

export async function exempleVCard() {
  console.log('=== Exemple 2 : vCard ===')

  const content: QRCodeContent = {
    type: 'vcard',
    data: {
      firstName: 'Jean',
      lastName: 'Dupont',
      organization: 'Entreprise SA',
      title: 'Directeur Commercial',
      phone: '+33123456789',
      mobile: '+33987654321',
      email: 'jean.dupont@example.com',
      website: 'https://example.com',
      address: '123 Rue de la Paix, 75001 Paris',
    },
  }

  const qrBuffer = await generateQRCodeFromContent(content, {
    width: 250,
    errorCorrectionLevel: 'H', // Haute correction pour impression
  })

  console.log(`✓ vCard QR code généré : ${qrBuffer.length} bytes`)

  // Formater en texte pour voir le contenu
  const vcardText = formatQRCodeContent(content)
  console.log('Contenu vCard :', vcardText)
}

// ============================================================================
// EXEMPLE 3 : Document DOCX avec suivi de commande
// ============================================================================

export async function exempleDocumentCommande(templateBuffer: Buffer) {
  console.log('=== Exemple 3 : Document de commande avec QR code ===')

  const orderData = {
    orderId: 'CMD-2024-001',
    customerName: 'Marie Martin',
    email: 'marie.martin@example.com',
    totalAmount: 149.99,
    orderDate: new Date('2024-11-02'),
  }

  // URL de suivi de commande
  const trackingUrl = `https://tracking.example.com/order/${orderData.orderId}`

  // Générer le document avec variables et QR code
  const docxBuffer = await generateDOCX(templateBuffer, {
    variables: {
      order_id: orderData.orderId,
      customer_name: orderData.customerName,
      customer_email: orderData.email,
      total_amount: orderData.totalAmount,
      order_date: orderData.orderDate,
    },
    formats: {
      total_amount: '0.00',
      order_date: 'DD/MM/YYYY',
    },
    qrcodes: {
      '{{qrcode_tracking}}': trackingUrl,
    },
    qrcodeOptions: {
      width: 250,
      errorCorrectionLevel: 'H',
    },
  })

  console.log(`✓ Document généré : ${docxBuffer.length} bytes`)

  return docxBuffer
}

// ============================================================================
// EXEMPLE 4 : Badge événement avec vCard et événement
// ============================================================================

export async function exempleBadgeEvenement(templateBuffer: Buffer) {
  console.log('=== Exemple 4 : Badge événement ===')

  const participantData = {
    firstName: 'Sophie',
    lastName: 'Bernard',
    email: 'sophie.bernard@example.com',
    phone: '+33123456789',
    organization: 'TechCorp',
    title: 'Développeuse Senior',
  }

  const eventData = {
    title: 'Conférence Tech 2024',
    location: 'Centre des Congrès, Paris',
    description: 'Conférence annuelle sur les technologies web',
    start: '2024-12-10T09:00:00Z',
    end: '2024-12-10T18:00:00Z',
  }

  // QR code vCard pour le contact
  const vcardData = formatQRCodeContent({
    type: 'vcard',
    data: participantData,
  })

  // QR code événement
  const eventQRData = formatQRCodeContent({
    type: 'event',
    data: eventData,
  })

  const docxBuffer = await generateDOCX(templateBuffer, {
    variables: {
      participant_name: `${participantData.firstName} ${participantData.lastName}`,
      participant_title: participantData.title,
      participant_org: participantData.organization,
      event_title: eventData.title,
      event_location: eventData.location,
    },
    qrcodes: {
      '{{qrcode_contact}}': vcardData,
      '{{qrcode_event}}': eventQRData,
    },
    qrcodeOptions: {
      width: 180,
      errorCorrectionLevel: 'Q',
    },
  })

  console.log(`✓ Badge généré : ${docxBuffer.length} bytes`)

  return docxBuffer
}

// ============================================================================
// EXEMPLE 5 : Certificat avec QR code de vérification (BASIQUE)
// ============================================================================

export async function exempleCertificat(templateBuffer: Buffer) {
  console.log('=== Exemple 5 : Certificat avec vérification (basique) ===')

  const certificateData = {
    studentName: 'Pierre Durand',
    courseName: 'Formation TypeScript Avancé',
    date: new Date('2024-11-02'),
    certificateId: 'CERT-2024-TS-456',
    instructor: 'Prof. Martin',
    grade: 'Excellent',
  }

  // URL de vérification publique
  const verificationUrl = `https://certificates.example.com/verify/${certificateData.certificateId}`

  // Données structurées pour application mobile (scan avancé)
  const verificationData = formatQRCodeContent({
    type: 'custom',
    data: {
      type: 'certificate',
      id: certificateData.certificateId,
      studentName: certificateData.studentName,
      courseName: certificateData.courseName,
      issueDate: certificateData.date.toISOString(),
      grade: certificateData.grade,
      verificationUrl: verificationUrl,
      // ⚠️ ATTENTION : Ceci n'est PAS une vraie signature cryptographique
      // Pour une vraie authentification, voir exempleCertificatAuthentifie()
      signature: 'abc123...', // Placeholder - non sécurisé
    },
  })

  const docxBuffer = await generateDOCX(templateBuffer, {
    variables: {
      student_name: certificateData.studentName,
      course_name: certificateData.courseName,
      date: certificateData.date,
      certificate_id: certificateData.certificateId,
      instructor: certificateData.instructor,
      grade: certificateData.grade,
    },
    formats: {
      date: 'DD/MM/YYYY',
    },
    qrcodes: {
      '{{qrcode_verification}}': verificationData,
    },
    qrcodeOptions: {
      width: 180,
      errorCorrectionLevel: 'Q',
    },
  })

  console.log(`✓ Certificat généré : ${docxBuffer.length} bytes`)
  console.log(`  URL de vérification : ${verificationUrl}`)
  console.log(`  ⚠️  Ce certificat n'est PAS authentifié cryptographiquement`)
  console.log(`  💡 Pour une vraie authentification, voir certificate-auth-usage.ts`)

  return docxBuffer
}

// ============================================================================
// EXEMPLE 5B : Certificat avec authentification cryptographique (SÉCURISÉ)
// ============================================================================

export async function exempleCertificatAuthentifie(templateBuffer: Buffer) {
  console.log('=== Exemple 5B : Certificat authentifié (sécurisé) ===')

  // Configuration d'authentification
  const authConfig: CertificateAuthConfig = {
    secretKey: process.env['CERTIFICATE_SECRET_KEY'] ?? 'demo-key-change-in-production',
    verificationBaseUrl: 'https://certificates.example.com/verify',
    algorithm: 'sha256',
    expiresIn: 10 * 365 * 24 * 60 * 60, // 10 ans
  }

  const certificateData: CertificateData = {
    certificateId: 'CERT-2024-TS-456',
    holderName: 'Pierre Durand',
    title: 'Formation TypeScript Avancé',
    issueDate: '2024-11-02T10:00:00Z',
    issuer: 'Académie Tech',
    grade: 'Excellent',
    metadata: {
      instructor: 'Prof. Martin',
      duration: '40 heures',
    },
  }

  // Générer le certificat authentifié avec signature cryptographique
  const authenticated = generateAuthenticatedCertificate(certificateData, authConfig)

  console.log(`✓ Certificat authentifié généré`)
  console.log(`  ID: ${authenticated.certificate.certificateId}`)
  console.log(`  Signature: ${authenticated.signature.substring(0, 16)}...`)
  console.log(`  URL: ${authenticated.verificationUrl}`)

  // Générer le document avec le QR code authentifié
  const docxBuffer = await generateDOCX(templateBuffer, {
    variables: {
      student_name: certificateData.holderName,
      course_name: certificateData.title,
      date: new Date(certificateData.issueDate),
      certificate_id: certificateData.certificateId,
      instructor: String(certificateData.metadata?.['instructor'] ?? ''),
      grade: certificateData.grade ?? '',
    },
    formats: {
      date: 'DD/MM/YYYY',
    },
    qrcodes: {
      '{{qrcode_verification}}': authenticated.qrCodeData,
    },
    qrcodeOptions: {
      width: 200,
      errorCorrectionLevel: 'Q',
    },
  })

  console.log(`✓ Document généré : ${docxBuffer.length} bytes`)
  console.log(`  🔐 Certificat protégé par signature HMAC SHA-256`)
  console.log(`  📖 Voir docs/GUIDE_AUTHENTIFICATION_CERTIFICATS.md pour plus d'infos`)

  return docxBuffer
}

// ============================================================================
// EXEMPLE 6 : Invitation avec QR codes multiples
// ============================================================================

export async function exempleInvitation(templateBuffer: Buffer) {
  console.log('=== Exemple 6 : Invitation avec QR codes multiples ===')

  const invitationData = {
    guestName: 'Lucie Petit',
    eventName: 'Soirée de Gala 2024',
    eventDate: new Date('2024-12-15T19:00:00Z'),
    venue: 'Grand Hôtel, Paris',
    invitationCode: 'INV-2024-789',
  }

  // QR code 1 : Confirmation de présence (email pré-rempli)
  const confirmationEmailData = formatQRCodeContent({
    type: 'email',
    data: {
      email: 'rsvp@example.com',
      subject: `Confirmation - ${invitationData.invitationCode}`,
      body: `Je confirme ma présence à ${invitationData.eventName}`,
    },
  })

  // QR code 2 : Localisation du lieu
  const locationData = formatQRCodeContent({
    type: 'geo',
    data: {
      latitude: 48.8566,
      longitude: 2.3522,
    },
  })

  // QR code 3 : Ajout au calendrier
  const calendarData = formatQRCodeContent({
    type: 'event',
    data: {
      title: invitationData.eventName,
      location: invitationData.venue,
      description: `Code d'invitation : ${invitationData.invitationCode}`,
      start: invitationData.eventDate.toISOString(),
      end: new Date(invitationData.eventDate.getTime() + 4 * 60 * 60 * 1000).toISOString(), // +4h
    },
  })

  // QR code 4 : Code d'accès (données personnalisées)
  const accessCodeData = formatQRCodeContent({
    type: 'custom',
    data: {
      type: 'invitation',
      code: invitationData.invitationCode,
      guestName: invitationData.guestName,
      eventDate: invitationData.eventDate.toISOString(),
    },
  })

  const docxBuffer = await generateDOCX(templateBuffer, {
    variables: {
      guest_name: invitationData.guestName,
      event_name: invitationData.eventName,
      event_date: invitationData.eventDate,
      venue: invitationData.venue,
      invitation_code: invitationData.invitationCode,
    },
    formats: {
      event_date: 'DD/MM/YYYY',
    },
    qrcodes: {
      '{{qrcode_confirm}}': confirmationEmailData,
      '{{qrcode_location}}': locationData,
      '{{qrcode_calendar}}': calendarData,
      '{{qrcode_access}}': accessCodeData,
    },
    qrcodeOptions: {
      width: 150,
      errorCorrectionLevel: 'M',
    },
  })

  console.log(`✓ Invitation générée : ${docxBuffer.length} bytes`)
  console.log(`  4 QR codes insérés`)

  return docxBuffer
}

// ============================================================================
// EXEMPLE 7 : Partage WiFi
// ============================================================================

export async function exemplePartageWiFi() {
  console.log('=== Exemple 7 : Partage WiFi ===')

  const wifiData = formatQRCodeContent({
    type: 'wifi',
    data: {
      ssid: 'Reseau_Invites',
      password: 'MotDePasse2024!',
      security: 'WPA',
      hidden: false,
    },
  })

  const qrBuffer = await generateQRCodeBuffer(wifiData, {
    width: 300,
    errorCorrectionLevel: 'L', // WiFi n'a pas besoin de haute correction
  })

  console.log(`✓ QR code WiFi généré : ${qrBuffer.length} bytes`)
  console.log(`  Les utilisateurs peuvent scanner pour se connecter automatiquement`)

  return qrBuffer
}

// ============================================================================
// EXEMPLE 8 : Système de traçabilité produit
// ============================================================================

export async function exempleTracabiliteProduit() {
  console.log('=== Exemple 8 : Traçabilité produit ===')

  const productData = {
    sku: 'PROD-2024-001',
    name: 'Widget Premium',
    batch: 'BATCH-456',
    manufactureDate: '2024-11-01',
    expiryDate: '2025-11-01',
    location: 'Entrepôt A - Allée 3 - Étagère 12',
  }

  // Créer des données structurées pour le système de traçabilité
  const traceabilityData = formatQRCodeContent({
    type: 'custom',
    data: {
      type: 'product',
      sku: productData.sku,
      batch: productData.batch,
      mfgDate: productData.manufactureDate,
      expDate: productData.expiryDate,
      location: productData.location,
      trackingUrl: `https://tracking.example.com/product/${productData.sku}`,
    },
  })

  const qrBuffer = await generateQRCodeBuffer(traceabilityData, {
    width: 200,
    errorCorrectionLevel: 'Q', // Bonne correction pour étiquettes
  })

  console.log(`✓ QR code traçabilité généré : ${qrBuffer.length} bytes`)
  console.log(`  Produit : ${productData.name} (${productData.sku})`)

  return qrBuffer
}

// ============================================================================
// EXEMPLE 9 : Menu restaurant avec QR code personnalisé
// ============================================================================

export async function exempleMenuRestaurant() {
  console.log('=== Exemple 9 : Menu restaurant ===')

  const restaurantData = {
    name: 'Le Gourmet',
    table: 15,
    menuUrl: 'https://menu.example.com',
    orderUrl: 'https://order.example.com/table/15',
  }

  // QR code pour accéder au menu et commander
  const menuData = formatQRCodeContent({
    type: 'custom',
    data: {
      type: 'restaurant_table',
      restaurant: restaurantData.name,
      table: restaurantData.table,
      menuUrl: restaurantData.menuUrl,
      orderUrl: restaurantData.orderUrl,
      timestamp: new Date().toISOString(),
    },
  })

  const qrBuffer = await generateQRCodeBuffer(menuData, {
    width: 250,
    errorCorrectionLevel: 'M',
  })

  console.log(`✓ QR code menu généré : ${qrBuffer.length} bytes`)
  console.log(`  Table ${restaurantData.table} - ${restaurantData.name}`)

  return qrBuffer
}

// ============================================================================
// EXEMPLE 10 : QR Code avec couleurs personnalisées
// ============================================================================

export async function exempleCouleursPersonnalisees() {
  console.log('=== Exemple 10 : QR code avec couleurs personnalisées ===')

  const url = 'https://brand.example.com'

  // QR code aux couleurs de la marque
  const qrBuffer = await generateQRCodeBuffer(url, {
    width: 300,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#1a73e8', // Bleu de la marque
      light: '#ffffff', // Fond blanc
    },
  })

  console.log(`✓ QR code personnalisé généré : ${qrBuffer.length} bytes`)
  console.log(`  Couleurs : #1a73e8 sur #ffffff`)

  return qrBuffer
}

// ============================================================================
// Exécution des exemples
// ============================================================================

export async function runQrCodeExamples() {
  try {
    console.log('\n🚀 Démarrage des exemples de génération QR codes\n')

    // Exemples sans template DOCX
    await exempleSimpleURL()
    console.log('')

    await exempleVCard()
    console.log('')

    await exemplePartageWiFi()
    console.log('')

    await exempleTracabiliteProduit()
    console.log('')

    await exempleMenuRestaurant()
    console.log('')

    await exempleCouleursPersonnalisees()
    console.log('')

    console.log('✅ Tous les exemples ont été exécutés avec succès !\n')

    // Note : Les exemples avec template DOCX nécessitent un buffer de template
    // Pour les exécuter, fournissez un templateBuffer :
    //
    // const fs = require('fs')
    // const templateBuffer = fs.readFileSync('template.docx')
    // await exempleDocumentCommande(templateBuffer)
    // await exempleBadgeEvenement(templateBuffer)
    // await exempleCertificat(templateBuffer)
    // await exempleInvitation(templateBuffer)
  } catch (error) {
    console.error("❌ Erreur lors de l'exécution des exemples :", error)
    throw error
  }
}

// Pour exécuter les exemples dans un contexte Node.js :
// runAllExamples().catch(console.error)
