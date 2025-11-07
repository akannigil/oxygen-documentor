# Intégration de l'authentification des certificats dans le workflow

## 🎯 Objectif

Ce guide explique comment utiliser l'authentification automatique des certificats directement dans le workflow de génération de documents, sans code supplémentaire.

## ✨ Nouveauté : Authentification automatique

L'authentification des certificats est maintenant **intégrée dans `generateDOCX`**. Plus besoin de code manuel pour générer des QR codes authentifiés !

## 📋 Prérequis

### 1. Configuration des variables d'environnement

```bash
# Générer une clé secrète
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Ajouter dans .env
CERTIFICATE_SECRET_KEY=votre_cle_generee_ci_dessus
VERIFICATION_BASE_URL=https://certificates.votredomaine.com/verify
```

### 2. Template DOCX avec placeholder

Dans votre template Word, ajoutez :

```
Certificat délivré à {{holder_name}}
pour la formation {{title}}

Date : {{issue_date}}
Note : {{grade}}

Scannez ce QR code pour vérifier l'authenticité :
{{qrcode_verification}}
```

## 🚀 Utilisation

### Méthode 1 : Détection automatique (Recommandée)

Le système détecte automatiquement les données de certificat depuis les variables.

**Champs détectés automatiquement :**

- `certificate_id`, `certificateId`, `id` → ID du certificat
- `holder_name`, `holderName`, `student_name`, `name` → Titulaire
- `title`, `course_name`, `formation` → Titre/Formation
- `issue_date`, `issueDate`, `date` → Date d'émission
- `issuer`, `organization`, `organisme` → Émetteur
- `grade`, `note`, `mention` → Note/Mention

```typescript
import { generateDOCX } from '@/lib/generators/docx'

const docxBuffer = await generateDOCX(templateBuffer, {
  variables: {
    certificate_id: 'CERT-2024-001',
    holder_name: 'Jean Dupont',
    title: 'Formation TypeScript Avancé',
    issue_date: new Date('2024-11-02'),
    issuer: 'Académie Tech',
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
```

C'est tout ! Le QR code authentifié est automatiquement généré et inséré.

### Méthode 2 : Configuration manuelle

Pour un contrôle total sur les données du certificat :

```typescript
const docxBuffer = await generateDOCX(templateBuffer, {
  variables: {
    // Vos variables habituelles
    holder_name: 'Marie Martin',
    course: 'Cybersécurité',
    // ...
  },
  certificate: {
    enabled: true,

    // Données manuelles du certificat
    data: {
      certificateId: 'CERT-2024-SEC-002',
      holderName: 'Marie Martin',
      title: 'Formation Cybersécurité',
      issueDate: '2024-11-02T14:30:00Z',
      issuer: 'CyberSec Academy',
      grade: 'Excellent',
      expiryDate: '2029-11-02T23:59:59Z',
      metadata: {
        duration: '40 heures',
        instructor: 'Prof. Dupont',
      },
    },
  },
})
```

### Méthode 3 : Avec hash du document (Sécurité maximale)

Pour vérifier que le document n'a pas été modifié après génération :

```typescript
const docxBuffer = await generateDOCX(templateBuffer, {
  variables: {
    certificate_id: 'CERT-2024-003',
    holder_name: 'Pierre Durand',
    title: 'Diplôme Master Informatique',
    issue_date: new Date(),
    issuer: 'Université Paris Tech',
  },
  certificate: {
    enabled: true,
    includeDocumentHash: true, // ✅ Active la vérification d'intégrité
  },
})
```

### Méthode 4 : Configuration personnalisée

```typescript
const docxBuffer = await generateDOCX(templateBuffer, {
  variables: {
    certificate_id: 'HAB-ELEC-2024-001',
    holder_name: 'Marc Dubois',
    title: 'Habilitation Électrique B2V',
    // ...
  },
  certificate: {
    enabled: true,

    // Placeholder personnalisé (si différent de {{qrcode_verification}})
    qrcodePlaceholder: '{{qr_auth}}',

    // Configuration d'authentification personnalisée
    authConfig: {
      secretKey: process.env['CUSTOM_SECRET_KEY']!,
      verificationBaseUrl: 'https://custom-domain.com/verify',
      algorithm: 'sha512', // Algorithme plus fort
      expiresIn: 3 * 365 * 24 * 60 * 60, // 3 ans
    },
  },

  // Options du QR code
  qrcodeOptions: {
    width: 220,
    errorCorrectionLevel: 'H', // Haute correction pour documents officiels
  },
})
```

## 🔧 Intégration dans l'API

### Mise à jour de l'API route

Modifiez `app/api/projects/[id]/generate/route.ts` :

```typescript
// Détecter si c'est un certificat
const isCertificate =
  template.name.toLowerCase().includes('certificat') ||
  template.name.toLowerCase().includes('diplome') ||
  template.name.toLowerCase().includes('attestation')

const docxBuffer = await generateDOCX(templateBuffer, {
  variables: data,

  // Activer automatiquement l'authentification pour les certificats
  certificate: isCertificate
    ? {
        enabled: true,
        includeDocumentHash: true, // Recommandé pour les certificats officiels
      }
    : undefined,
})
```

### Option : Paramètre utilisateur

Permettre à l'utilisateur d'activer l'authentification :

```typescript
interface GenerateRequestBody {
  templateId: string
  rows: Array<Record<string, string | number>>
  outputFormat?: 'docx' | 'pdf'
  // ✨ Nouveau paramètre
  enableCertificateAuth?: boolean
}

const body: GenerateRequestBody = await request.json()

const docxBuffer = await generateDOCX(templateBuffer, {
  variables: data,
  certificate: body.enableCertificateAuth
    ? {
        enabled: true,
      }
    : undefined,
})
```

## 📊 Schéma du workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    GÉNÉRATION DOCUMENT                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  generateDOCX(templateBuffer, options)                           │
│                                                                  │
│  1. Remplir les variables ({{holder_name}}, {{title}}, etc.)   │
│  2. Générer le document initial                                  │
│  3. Si certificate.enabled = true :                              │
│     ├─ Détecter les données de certificat                       │
│     ├─ Générer signature HMAC                                    │
│     ├─ (Optionnel) Calculer hash du document                    │
│     ├─ Créer JSON signé avec toutes les données                 │
│     └─ Générer QR code et insérer dans {{qrcode_verification}}  │
│  4. Retourner le document final                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
                    Document authentifié ✅
```

## 🎨 Exemples de cas d'usage

### Exemple 1 : Certificat de formation simple

```typescript
const certificat = await generateDOCX(templateBuffer, {
  variables: {
    certificate_id: 'FORM-2024-001',
    holder_name: 'Sophie Bernard',
    title: 'Formation React & Next.js',
    date: new Date(),
    issuer: 'WebDev Academy',
    grade: 'Excellent',
  },
  formats: {
    date: 'DD/MM/YYYY',
  },
  certificate: {
    enabled: true, // ← Activation simple
  },
})
```

### Exemple 2 : Diplôme universitaire

```typescript
const diplome = await generateDOCX(templateBuffer, {
  variables: {
    certificate_id: 'DIPLOME-2024-M2-042',
    holder_name: 'Thomas Leroy',
    title: 'Master 2 Informatique - Intelligence Artificielle',
    issue_date: new Date('2024-07-15'),
    issuer: 'Université Paris Tech',
    grade: 'Mention Très Bien',
    // Métadonnées supplémentaires
    ects: 120,
    level: 'Bac+5',
    specialization: 'Intelligence Artificielle',
  },
  certificate: {
    enabled: true,
    includeDocumentHash: true, // Document officiel
    data: {
      metadata: {
        ects: 120,
        level: 'Bac+5',
        specialization: 'Intelligence Artificielle',
        honors: 'Félicitations du jury',
      },
    },
  },
  qrcodeOptions: {
    width: 220,
    errorCorrectionLevel: 'H', // Haute correction
  },
})
```

### Exemple 3 : Habilitation professionnelle

```typescript
const habilitation = await generateDOCX(templateBuffer, {
  variables: {
    certificate_id: 'HAB-ELEC-2024-078',
    holder_name: 'Laurent Petit',
    title: 'Habilitation Électrique B2V',
    issue_date: new Date(),
    issuer: 'APAVE Formation',
  },
  certificate: {
    enabled: true,
    authConfig: {
      secretKey: process.env['CERTIFICATE_SECRET_KEY']!,
      verificationBaseUrl: 'https://habilitations.apave.fr/verify',
      algorithm: 'sha512', // Sécurité renforcée
      expiresIn: 3 * 365 * 24 * 60 * 60, // 3 ans
    },
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
```

### Exemple 4 : Certificat médical

```typescript
const certificatMedical = await generateDOCX(templateBuffer, {
  variables: {
    certificate_id: 'MED-2024-001',
    holder_name: 'Dr. Marie Dubois',
    title: 'Formation Continue en Cardiologie',
    issue_date: new Date(),
    issuer: 'Ordre National des Médecins',
  },
  certificate: {
    enabled: true,
    authConfig: {
      expiresIn: 365 * 24 * 60 * 60, // 1 an (formation continue)
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
})
```

## ⚙️ Configuration avancée

### Désactiver pour certains templates

```typescript
const blacklist = ['template_facture', 'template_devis']

const shouldAuthenticate =
  !blacklist.includes(template.name) &&
  (template.name.includes('certificat') || template.name.includes('diplome'))

const docxBuffer = await generateDOCX(templateBuffer, {
  variables: data,
  certificate: shouldAuthenticate
    ? {
        enabled: true,
      }
    : undefined,
})
```

### Logging et monitoring

```typescript
if (options.certificate?.enabled) {
  const authenticated = generateAuthenticatedCertificate(...)

  // Logger la génération
  await db.certificateAudit.create({
    certificateId: authenticated.certificate.certificateId,
    holderName: authenticated.certificate.holderName,
    generatedAt: new Date(),
    signature: authenticated.signature,
    userId: session.user.id,
  })

  console.log(`✓ Certificat authentifié généré: ${authenticated.certificate.certificateId}`)
}
```

## 🔍 Vérification

### Backend : API de vérification

Créez un endpoint pour vérifier les certificats scannés :

```typescript
// app/api/certificates/verify/route.ts
import { verifyCertificateSignature } from '@/lib/qrcode/certificate-auth'

export async function POST(request: Request) {
  const { qrCodeData } = await request.json()

  const isValid = verifyCertificateSignature(qrCodeData, process.env['CERTIFICATE_SECRET_KEY']!)

  if (!isValid) {
    return NextResponse.json({ valid: false, error: 'Signature invalide' }, { status: 401 })
  }

  const payload = JSON.parse(qrCodeData)

  // Vérifier en base de données
  const cert = await db.certificate.findUnique({
    where: { id: payload.certificate.id },
  })

  if (cert?.revoked) {
    return NextResponse.json({ valid: false, error: 'Certificat révoqué' }, { status: 403 })
  }

  return NextResponse.json({
    valid: true,
    certificate: payload.certificate,
  })
}
```

## 📚 Résumé

### ✅ Avantages de l'intégration

1. **Simplicité** : Un seul paramètre `certificate: { enabled: true }`
2. **Automatique** : Détection des données de certificat
3. **Sécurisé** : Signature HMAC infalsifiable
4. **Flexible** : Configuration personnalisable
5. **Transparent** : Pas de changement dans le workflow existant

### 🎯 Points clés

- **Activer** : `certificate: { enabled: true }`
- **Détecter** : Noms de variables reconnus automatiquement
- **Sécuriser** : Configurer `CERTIFICATE_SECRET_KEY`
- **Vérifier** : Implémenter l'API de vérification

### 📖 Documentation complète

- [Guide complet](./GUIDE_AUTHENTIFICATION_CERTIFICATS.md)
- [Configuration](./CONFIGURATION_CERTIFICATS.md)
- [Exemples de code](../examples/certificate-auth-usage.ts)

## 🚀 Migration rapide

### Avant (code manuel)

```typescript
// ❌ Complexe et verbeux
const authenticated = generateAuthenticatedCertificate(certificateData, authConfig)
const docxBuffer = await generateDOCX(templateBuffer, {
  variables: data,
  qrcodes: {
    '{{qrcode_verification}}': authenticated.qrCodeData,
  },
})
```

### Après (intégré)

```typescript
// ✅ Simple et élégant
const docxBuffer = await generateDOCX(templateBuffer, {
  variables: data,
  certificate: { enabled: true }, // C'est tout !
})
```

---

**Version** : 1.0  
**Date** : 3 novembre 2024  
**Auteur** : Oxygen Document Team
