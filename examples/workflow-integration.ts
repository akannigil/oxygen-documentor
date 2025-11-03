/**
 * Exemples d'intégration de l'authentification dans le workflow de génération
 * 
 * Ce fichier démontre comment utiliser l'authentification automatique
 * des certificats directement via generateDOCX()
 */

import { generateDOCX } from '@/lib/generators/docx'
import { readFile } from 'fs/promises'

// ============================================================================
// EXEMPLE 1 : Détection automatique (Le plus simple)
// ============================================================================

export async function exempleDetectionAutomatique() {
  console.log('=== Exemple 1 : Détection automatique ===')
  
  // Charger le template
  const templateBuffer = await readFile('./templates/certificat.docx')
  
  // Générer le certificat avec authentification automatique
  const docxBuffer = await generateDOCX(templateBuffer, {
    variables: {
      // Champs détectés automatiquement pour le certificat
      certificate_id: 'CERT-2024-001',
      holder_name: 'Jean Dupont',
      title: 'Formation TypeScript Avancé',
      issue_date: new Date('2024-11-02'),
      issuer: 'Académie Tech France',
      grade: 'Excellent',
    },
    formats: {
      issue_date: 'DD/MM/YYYY',
    },
    // ✨ ACTIVER L'AUTHENTIFICATION
    certificate: {
      enabled: true, // C'est tout ! Les données sont détectées automatiquement
    },
  })
  
  console.log(`✓ Certificat authentifié généré : ${docxBuffer.length} bytes`)
  console.log(`  Le QR code a été automatiquement inséré dans {{qrcode_verification}}`)
  
  return docxBuffer
}

// ============================================================================
// EXEMPLE 2 : Configuration manuelle complète
// ============================================================================

export async function exempleConfigurationManuelle() {
  console.log('=== Exemple 2 : Configuration manuelle ===')
  
  const templateBuffer = await readFile('./templates/diplome.docx')
  
  const docxBuffer = await generateDOCX(templateBuffer, {
    variables: {
      // Variables normales du template
      student: 'Marie Martin',
      formation: 'Cybersécurité',
      date_diplome: new Date('2024-07-15'),
      universite: 'Université Paris Tech',
      mention: 'Très Bien',
    },
    certificate: {
      enabled: true,
      
      // Données manuelles du certificat (remplace la détection automatique)
      data: {
        certificateId: 'DIPLOME-2024-M2-042',
        holderName: 'Marie Martin',
        title: 'Master 2 Informatique - Intelligence Artificielle',
        issueDate: '2024-07-15T10:00:00Z',
        issuer: 'Université Paris Tech',
        grade: 'Mention Très Bien',
        metadata: {
          level: 'Bac+5',
          ects: 120,
          specialization: 'Intelligence Artificielle',
          honors: 'Félicitations du jury',
        },
      },
    },
    qrcodeOptions: {
      width: 220,
      errorCorrectionLevel: 'H', // Haute correction pour document officiel
    },
  })
  
  console.log(`✓ Diplôme authentifié généré : ${docxBuffer.length} bytes`)
  
  return docxBuffer
}

// ============================================================================
// EXEMPLE 3 : Avec hash du document (Sécurité maximale)
// ============================================================================

export async function exempleAvecHashDocument() {
  console.log('=== Exemple 3 : Avec hash du document ===')
  
  const templateBuffer = await readFile('./templates/attestation.docx')
  
  const docxBuffer = await generateDOCX(templateBuffer, {
    variables: {
      certificate_id: 'HAB-ELEC-2024-078',
      holder_name: 'Laurent Petit',
      title: 'Habilitation Électrique B2V',
      issue_date: new Date(),
      issuer: 'APAVE Formation',
      expiry_date: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000),
    },
    certificate: {
      enabled: true,
      
      // ✅ Activer la vérification d'intégrité du document
      includeDocumentHash: true,
      
      data: {
        expiryDate: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: {
          level: 'B2V',
          domain: 'Travaux sous tension',
          training_hours: '21 heures',
        },
      },
    },
  })
  
  console.log(`✓ Attestation avec hash du document généré`)
  console.log(`  Le QR code contient le hash SHA-256 du document`)
  console.log(`  Toute modification du document invalidera la vérification`)
  
  return docxBuffer
}

// ============================================================================
// EXEMPLE 4 : Configuration personnalisée (Algorithme SHA-512)
// ============================================================================

export async function exempleConfigurationPersonnalisee() {
  console.log('=== Exemple 4 : Configuration personnalisée ===')
  
  const templateBuffer = await readFile('./templates/certificat_medical.docx')
  
  const docxBuffer = await generateDOCX(templateBuffer, {
    variables: {
      certificate_id: 'MED-2024-001',
      holder_name: 'Dr. Sophie Durand',
      title: 'Formation Continue en Cardiologie',
      issue_date: new Date(),
      issuer: 'Ordre National des Médecins',
    },
    certificate: {
      enabled: true,
      
      // Configuration d'authentification personnalisée
      authConfig: {
        secretKey: process.env['CERTIFICATE_SECRET_KEY']!,
        verificationBaseUrl: 'https://medical-certs.example.com/verify',
        algorithm: 'sha512', // Algorithme plus fort
        expiresIn: 365 * 24 * 60 * 60, // 1 an
      },
      
      data: {
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: {
          speciality: 'Cardiologie',
          hours: '30 heures',
          type: 'Formation Continue Obligatoire',
        },
      },
    },
    qrcodeOptions: {
      width: 200,
      errorCorrectionLevel: 'H',
    },
  })
  
  console.log(`✓ Certificat médical généré avec SHA-512`)
  
  return docxBuffer
}

// ============================================================================
// EXEMPLE 5 : Génération en lot (workflow API)
// ============================================================================

export async function exempleGenerationEnLot() {
  console.log('=== Exemple 5 : Génération en lot ===')
  
  const templateBuffer = await readFile('./templates/certificat.docx')
  
  // Données de plusieurs étudiants
  const students = [
    {
      id: 'CERT-2024-001',
      name: 'Alice Martin',
      course: 'React & Next.js',
      grade: 'Excellent',
    },
    {
      id: 'CERT-2024-002',
      name: 'Bob Dupont',
      course: 'React & Next.js',
      grade: 'Bien',
    },
    {
      id: 'CERT-2024-003',
      name: 'Charlie Durand',
      course: 'React & Next.js',
      grade: 'Très Bien',
    },
  ]
  
  const documents: Buffer[] = []
  
  for (const student of students) {
    const docxBuffer = await generateDOCX(templateBuffer, {
      variables: {
        certificate_id: student.id,
        holder_name: student.name,
        title: `Formation ${student.course}`,
        issue_date: new Date(),
        issuer: 'WebDev Academy',
        grade: student.grade,
      },
      certificate: {
        enabled: true, // Chaque certificat est authentifié individuellement
      },
    })
    
    documents.push(docxBuffer)
    console.log(`✓ Certificat ${student.id} généré pour ${student.name}`)
  }
  
  console.log(`✓ ${documents.length} certificats authentifiés générés`)
  
  return documents
}

// ============================================================================
// EXEMPLE 6 : Simulation du workflow API
// ============================================================================

export async function exempleWorkflowAPI() {
  console.log('=== Exemple 6 : Simulation workflow API ===')
  
  // Simuler une requête API
  const requestData = {
    templateId: 'template_certificat',
    rows: [
      {
        certificate_id: 'CERT-2024-010',
        holder_name: 'Emma Leroy',
        title: 'Formation Python Data Science',
        issue_date: '2024-11-02',
        issuer: 'DataCamp Academy',
        grade: 'Excellent',
      },
    ],
    enableCertificateAuth: true, // Paramètre utilisateur
  }
  
  // Charger le template
  const templateBuffer = await readFile('./templates/certificat.docx')
  
  // Générer le document
  for (const data of requestData.rows) {
    const docxBuffer = await generateDOCX(templateBuffer, {
      variables: data,
      
      // Activer selon le paramètre utilisateur
      ...(requestData.enableCertificateAuth ? {
        certificate: {
          enabled: true,
        },
      } : {}),
    })
    
    console.log(`✓ Document généré : ${docxBuffer.length} bytes`)
    console.log(`  Authentification : ${requestData.enableCertificateAuth ? 'Activée ✅' : 'Désactivée ❌'}`)
    
    // Sauvegarder, envoyer par email, etc.
    return docxBuffer
  }
}

// ============================================================================
// EXEMPLE 7 : Détection conditionnelle (template name)
// ============================================================================

export async function exempleDetectionConditionnelle() {
  console.log('=== Exemple 7 : Détection conditionnelle ===')
  
  // Simuler des templates différents
  const templates = [
    { name: 'certificat_formation', isCertificate: true },
    { name: 'facture_client', isCertificate: false },
    { name: 'diplome_universitaire', isCertificate: true },
    { name: 'devis_projet', isCertificate: false },
  ]
  
  for (const template of templates) {
    // Détecter si c'est un certificat
    const shouldAuthenticate = template.name.includes('certificat') ||
                               template.name.includes('diplome') ||
                               template.name.includes('attestation')
    
    console.log(`Template: ${template.name}`)
    console.log(`  Authentification: ${shouldAuthenticate ? 'OUI ✅' : 'NON ❌'}`)
    
    // Dans votre code réel :
    /*
    const docxBuffer = await generateDOCX(templateBuffer, {
      variables: data,
      ...(shouldAuthenticate ? {
        certificate: {
          enabled: true,
        },
      } : {}),
    })
    */
  }
}

// ============================================================================
// EXEMPLE 8 : Gestion d'erreurs
// ============================================================================

export async function exempleGestionErreurs() {
  console.log('=== Exemple 8 : Gestion d\'erreurs ===')
  
  const templateBuffer = await readFile('./templates/certificat.docx')
  
  try {
    // Tenter de générer sans CERTIFICATE_SECRET_KEY
    await generateDOCX(templateBuffer, {
      variables: {
        certificate_id: 'CERT-2024-001',
        holder_name: 'Test User',
        title: 'Test Certificate',
        issue_date: new Date(),
        issuer: 'Test Issuer',
      },
      certificate: {
        enabled: true,
        authConfig: {
          secretKey: '', // Clé vide
          verificationBaseUrl: 'https://test.com',
          algorithm: 'sha256',
        },
      },
    })
    
    console.log('Document généré')
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('CERTIFICATE_SECRET_KEY')) {
        console.error('❌ Erreur : Clé secrète non configurée')
        console.error('   Solution : Configurez CERTIFICATE_SECRET_KEY dans .env')
        console.error('   Voir : docs/CONFIGURATION_CERTIFICATS.md')
      } else {
        console.error('❌ Erreur :', error.message)
      }
    }
  }
}

// ============================================================================
// EXEMPLE 9 : QR codes combinés (authentification + URL simple)
// ============================================================================

export async function exempleQRCodesCombines() {
  console.log('=== Exemple 9 : QR codes combinés ===')
  
  const templateBuffer = await readFile('./templates/certificat_complet.docx')
  
  const docxBuffer = await generateDOCX(templateBuffer, {
    variables: {
      certificate_id: 'CERT-2024-100',
      holder_name: 'Thomas Bernard',
      title: 'Formation Full Stack Developer',
      issue_date: new Date(),
      issuer: 'Code Academy',
      grade: 'Excellent',
    },
    
    // QR codes manuels supplémentaires
    qrcodes: {
      '{{qrcode_website}}': 'https://www.codeacademy.com',
      '{{qrcode_contact}}': 'mailto:contact@codeacademy.com',
    },
    
    // + QR code authentifié automatique
    certificate: {
      enabled: true,
      // Sera inséré dans {{qrcode_verification}}
    },
    
    qrcodeOptions: {
      width: 180,
      errorCorrectionLevel: 'Q',
    },
  })
  
  console.log(`✓ Document généré avec 3 QR codes :`)
  console.log(`  1. QR code authentifié ({{qrcode_verification}})`)
  console.log(`  2. QR code site web ({{qrcode_website}})`)
  console.log(`  3. QR code contact ({{qrcode_contact}})`)
  
  return docxBuffer
}

// ============================================================================
// Exécution des exemples
// ============================================================================

export async function runWorkflowIntegrationExamples() {
  try {
    console.log('\n🔄 Démarrage des exemples d\'intégration workflow\n')
    
    // Note : Ces exemples nécessitent des templates DOCX
    // Décommentez pour exécuter avec vos templates
    
    // await exempleDetectionAutomatique()
    // console.log('')
    
    // await exempleConfigurationManuelle()
    // console.log('')
    
    // await exempleAvecHashDocument()
    // console.log('')
    
    // await exempleConfigurationPersonnalisee()
    // console.log('')
    
    // await exempleGenerationEnLot()
    // console.log('')
    
    // await exempleWorkflowAPI()
    // console.log('')
    
    await exempleDetectionConditionnelle()
    console.log('')
    
    await exempleGestionErreurs()
    console.log('')
    
    console.log('✅ Exemples d\'intégration terminés !\n')
    console.log('💡 Pour utiliser ces exemples avec vos propres templates :')
    console.log('   1. Décommentez les exemples ci-dessus')
    console.log('   2. Placez vos templates DOCX dans ./templates/')
    console.log('   3. Configurez CERTIFICATE_SECRET_KEY dans .env')
    console.log('   4. Exécutez : ts-node examples/workflow-integration.ts')
    console.log('')
    console.log('📖 Documentation complète :')
    console.log('   - docs/INTEGRATION_WORKFLOW_CERTIFICATS.md')
    console.log('   - docs/GUIDE_AUTHENTIFICATION_CERTIFICATS.md')
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution des exemples :', error)
    throw error
  }
}

// Pour exécuter
// runWorkflowIntegrationExamples().catch(console.error)

