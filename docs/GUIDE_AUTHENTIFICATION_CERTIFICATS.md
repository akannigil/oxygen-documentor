# Guide : Authentification de Certificats via QR Code

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Pourquoi authentifier les certificats ?](#pourquoi-authentifier-les-certificats)
3. [Comment ça fonctionne ?](#comment-ça-fonctionne)
4. [Installation et configuration](#installation-et-configuration)
5. [Génération de certificats authentifiés](#génération-de-certificats-authentifiés)
6. [Vérification des certificats](#vérification-des-certificats)
7. [Intégration dans vos documents](#intégration-dans-vos-documents)
8. [Backend - API de vérification](#backend---api-de-vérification)
9. [Sécurité et bonnes pratiques](#sécurité-et-bonnes-pratiques)
10. [Cas d'usage avancés](#cas-dusage-avancés)

---

## Vue d'ensemble

Ce système permet de générer des certificats (diplômes, attestations, habilitations) avec un **QR code signé cryptographiquement**. Le QR code contient :

- ✅ Les données du certificat
- ✅ Une signature HMAC impossible à falsifier
- ✅ Un horodatage
- ✅ Optionnellement : un hash du document pour vérifier son intégrité
- ✅ Une date d'expiration

**Avantages :**
- 🔒 **Infalsifiable** : Toute modification des données invalide la signature
- ⚡ **Vérification instantanée** : Scan du QR code + API = validation en secondes
- 🌐 **Hors ligne possible** : Les données sont dans le QR code
- 📱 **Universel** : Tout smartphone peut scanner
- 🔐 **Traçable** : Chaque certificat a un ID unique

---

## Pourquoi authentifier les certificats ?

### Problèmes sans authentification

❌ **Falsification facile** : Modification du PDF/DOCX avec des outils d'édition  
❌ **Impression frauduleuse** : Impression d'un faux certificat ressemblant  
❌ **Vérification manuelle** : Appels téléphoniques, emails, perte de temps  
❌ **Pas de traçabilité** : Impossible de savoir si un certificat est révoqué  

### Solutions avec authentification

✅ **Signature cryptographique** : Impossible de modifier sans invalider  
✅ **Vérification automatique** : Scan QR code → API → Résultat instantané  
✅ **Révocation possible** : Base de données centrale pour gérer les révocations  
✅ **Audit trail** : Logs de toutes les vérifications  

---

## Comment ça fonctionne ?

### 1. Génération du certificat

```
[Données certificat] + [Clé secrète] 
    ↓ HMAC SHA-256
[Signature cryptographique]
    ↓
[Données + Signature] → Encodage JSON
    ↓
[QR Code]
    ↓
[Insertion dans le document]
```

### 2. Vérification du certificat

```
[Scan du QR Code]
    ↓
[Extraction des données + signature]
    ↓
[Recalcul de la signature avec la clé secrète]
    ↓
[Comparaison des signatures]
    ↓
[VALIDE ✓] ou [INVALIDE ✗]
```

### 3. Composants de sécurité

| Composant | Description | Rôle |
|-----------|-------------|------|
| **HMAC** | Hash-based Message Authentication Code | Signature infalsifiable |
| **Secret Key** | Clé secrète côté serveur | Seul le serveur peut signer |
| **Timestamp** | Horodatage de génération | Anti-rejeu |
| **Document Hash** | Empreinte SHA-256 du fichier | Vérifier que le document n'a pas été modifié |
| **Expiration** | Date limite de validité | Certificats temporaires |

---

## Installation et configuration

### Prérequis

Le module utilise le module natif Node.js `crypto`. Aucune dépendance externe supplémentaire.

### Configuration

```typescript
import { CertificateAuthConfig } from '@/lib/qrcode/certificate-auth'

const authConfig: CertificateAuthConfig = {
  // ⚠️ IMPORTANT : En production, utiliser une variable d'environnement
  secretKey: process.env.CERTIFICATE_SECRET_KEY!,
  
  // URL de base pour la vérification
  verificationBaseUrl: 'https://certificates.votredomaine.com/verify',
  
  // Algorithme de hash (sha256 ou sha512)
  algorithm: 'sha256',
  
  // Durée de validité du QR code (optionnel, en secondes)
  expiresIn: 10 * 365 * 24 * 60 * 60, // 10 ans
}
```

### Génération de la clé secrète

```bash
# Générer une clé aléatoire sécurisée (32 bytes = 256 bits)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Ajouter dans .env
echo "CERTIFICATE_SECRET_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" >> .env
```

⚠️ **CRITIQUE** : Ne JAMAIS committer la clé secrète dans Git !

---

## Génération de certificats authentifiés

### Exemple 1 : Certificat de formation simple

```typescript
import {
  generateAuthenticatedCertificate,
  generateQRCodeBuffer,
  type CertificateData,
} from '@/lib/qrcode'

const certificateData: CertificateData = {
  certificateId: 'CERT-2024-001',
  holderName: 'Jean Dupont',
  title: 'Formation TypeScript Avancé',
  issueDate: '2024-11-02T10:00:00Z',
  issuer: 'Académie Tech',
  grade: 'Excellent',
}

// Générer le certificat authentifié
const authenticated = generateAuthenticatedCertificate(
  certificateData,
  authConfig
)

// Générer le QR code
const qrBuffer = await generateQRCodeBuffer(authenticated.qrCodeData, {
  width: 250,
  errorCorrectionLevel: 'Q',
})

console.log('✓ Certificat authentifié généré')
console.log(`Signature: ${authenticated.signature}`)
console.log(`URL de vérification: ${authenticated.verificationUrl}`)
```

### Exemple 2 : Avec vérification d'intégrité du document

```typescript
import { generateDOCX } from '@/lib/generators/docx'

// 1. Générer un document temporaire (sans QR code)
let tempBuffer = await generateDOCX(templateBuffer, {
  variables: {
    holder_name: 'Jean Dupont',
    title: 'Formation TypeScript',
    // ... autres variables
  },
})

// 2. Générer le certificat authentifié avec le hash du document
const authenticated = generateAuthenticatedCertificate(
  certificateData,
  authConfig,
  tempBuffer // ← Hash calculé automatiquement
)

console.log(`Hash du document: ${authenticated.documentHash}`)

// 3. Générer le document final avec le QR code
const finalBuffer = await generateDOCX(templateBuffer, {
  variables: { /* ... */ },
  qrcodes: {
    '{{qrcode_verification}}': authenticated.qrCodeData,
  },
  qrcodeOptions: {
    width: 200,
    errorCorrectionLevel: 'Q',
  },
})
```

**Avantage** : Si quelqu'un modifie le PDF/DOCX, le hash ne correspondra plus et la vérification échouera.

### Exemple 3 : URL simple (QR code plus léger)

Pour les badges ou étiquettes où l'espace est limité :

```typescript
import { generateSimpleAuthUrl } from '@/lib/qrcode'

const authUrl = generateSimpleAuthUrl(certificateData, authConfig)
// Résultat : https://certificates.example.com/verify/CERT-2024-001?token=eyJpZ...

const qrBuffer = await generateQRCodeBuffer(authUrl, {
  width: 150,
  errorCorrectionLevel: 'M',
})
```

**Différence** :
- ✅ QR code moins dense (plus facile à scanner)
- ✅ URL courte
- ⚠️ Nécessite une API pour récupérer les détails

---

## Vérification des certificats

### Vérification côté serveur

```typescript
import { verifyCertificateSignature } from '@/lib/qrcode'

// Données extraites du QR code scanné
const scannedData = '{"type":"certificate_verification",...}'

const isValid = verifyCertificateSignature(
  scannedData,
  process.env.CERTIFICATE_SECRET_KEY!
)

if (isValid) {
  console.log('✓ Certificat authentique')
} else {
  console.log('✗ Certificat invalide ou falsifié')
}
```

### Vérification avec document

```typescript
const isValid = verifyCertificateSignature(
  scannedData,
  secretKey,
  documentBuffer // Vérifier que le document n'a pas été modifié
)
```

### Vérification URL simple

```typescript
import { verifySimpleAuthUrl } from '@/lib/qrcode'

const verification = verifySimpleAuthUrl(
  scannedUrl,
  process.env.CERTIFICATE_SECRET_KEY!
)

if (verification) {
  console.log(`✓ Certificat valide`)
  console.log(`  ID: ${verification.certificateId}`)
  console.log(`  Timestamp: ${new Date(verification.timestamp).toISOString()}`)
} else {
  console.log('✗ URL invalide ou expirée')
}
```

---

## Intégration dans vos documents

### Template DOCX

Dans votre document Word, ajoutez un placeholder :

```
Certificat délivré à {{holder_name}}
pour la formation {{title}}

Scannez ce QR code pour vérifier l'authenticité :
{{qrcode_verification}}
```

### Génération du document

```typescript
import { generateDOCX } from '@/lib/generators/docx'

const docxBuffer = await generateDOCX(templateBuffer, {
  variables: {
    holder_name: certificateData.holderName,
    title: certificateData.title,
    issue_date: new Date(certificateData.issueDate).toLocaleDateString('fr-FR'),
    certificate_id: certificateData.certificateId,
  },
  qrcodes: {
    '{{qrcode_verification}}': authenticated.qrCodeData,
  },
  qrcodeOptions: {
    width: 200,
    errorCorrectionLevel: 'Q',
  },
})
```

### Positionnement du QR code

**Recommandations :**
- 📄 **Bas de page** : Discret, ne gêne pas le contenu principal
- 📐 **Coin supérieur droit** : Visible, facile à scanner
- 📏 **Taille** : 3-5 cm pour impression A4
- 🔲 **Marge** : Laisser 0.5 cm d'espace blanc autour

---

## Backend - API de vérification

### Architecture recommandée

```
┌─────────────┐
│ Smartphone  │ Scan QR code
└──────┬──────┘
       │ POST /api/certificates/verify
       ↓
┌─────────────────┐
│   API Server    │ Vérifie signature
└──────┬──────────┘
       │ Query
       ↓
┌─────────────────┐
│    Database     │ Vérifie révocation
└─────────────────┘
```

### Exemple Express.js

```typescript
import express from 'express'
import { verifyCertificateSignature } from '@/lib/qrcode/certificate-auth'

const app = express()
app.use(express.json())

// Endpoint de vérification (données complètes dans QR code)
app.post('/api/certificates/verify', async (req, res) => {
  const { qrCodeData } = req.body
  
  if (!qrCodeData) {
    return res.status(400).json({ error: 'qrCodeData requis' })
  }
  
  try {
    // 1. Vérifier la signature cryptographique
    const isValid = verifyCertificateSignature(
      qrCodeData,
      process.env.CERTIFICATE_SECRET_KEY!
    )
    
    if (!isValid) {
      return res.status(401).json({
        valid: false,
        error: 'Signature invalide - certificat possiblement falsifié',
      })
    }
    
    // 2. Parser les données
    const payload = JSON.parse(qrCodeData)
    const certificateId = payload.certificate.id
    
    // 3. Vérifier dans la base de données
    const dbCertificate = await db.certificates.findOne({
      id: certificateId,
    })
    
    if (!dbCertificate) {
      return res.status(404).json({
        valid: false,
        error: 'Certificat non trouvé dans la base de données',
      })
    }
    
    // 4. Vérifier si le certificat a été révoqué
    if (dbCertificate.revoked) {
      return res.status(403).json({
        valid: false,
        error: 'Certificat révoqué',
        revokedAt: dbCertificate.revokedAt,
        reason: dbCertificate.revocationReason,
      })
    }
    
    // 5. Logger la vérification (audit trail)
    await db.verificationLogs.create({
      certificateId,
      verifiedAt: new Date(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })
    
    // 6. Tout est OK
    return res.json({
      valid: true,
      certificate: {
        id: payload.certificate.id,
        holder: payload.certificate.holder,
        title: payload.certificate.title,
        issueDate: payload.certificate.issueDate,
        issuer: payload.certificate.issuer,
        grade: payload.certificate.grade,
      },
      verification: {
        timestamp: payload.verification.timestamp,
        verifiedAt: new Date().toISOString(),
        documentHash: payload.verification.documentHash,
      },
    })
    
  } catch (error) {
    console.error('Erreur lors de la vérification:', error)
    return res.status(500).json({
      valid: false,
      error: 'Erreur interne lors de la vérification',
    })
  }
})

// Endpoint pour URL simple (GET)
app.get('/api/certificates/verify/:id', async (req, res) => {
  const { id } = req.params
  const token = req.query.token as string
  
  if (!token) {
    return res.status(400).json({ error: 'Token requis' })
  }
  
  const url = `${process.env.VERIFICATION_BASE_URL}/${id}?token=${token}`
  
  const verification = verifySimpleAuthUrl(
    url,
    process.env.CERTIFICATE_SECRET_KEY!
  )
  
  if (!verification) {
    return res.status(401).json({
      valid: false,
      error: 'Token invalide ou expiré',
    })
  }
  
  // Récupérer les détails depuis la base de données
  const certificate = await db.certificates.findOne({ id })
  
  if (!certificate) {
    return res.status(404).json({ 
      valid: false, 
      error: 'Certificat non trouvé',
    })
  }
  
  if (certificate.revoked) {
    return res.status(403).json({
      valid: false,
      error: 'Certificat révoqué',
    })
  }
  
  return res.json({
    valid: true,
    certificate,
    verification,
  })
})

app.listen(3000, () => {
  console.log('API de vérification démarrée sur le port 3000')
})
```

### Frontend de vérification

Page web pour scanner et vérifier :

```html
<!DOCTYPE html>
<html>
<head>
  <title>Vérification de Certificat</title>
</head>
<body>
  <h1>Vérification de Certificat</h1>
  
  <button id="scanBtn">Scanner un QR Code</button>
  
  <div id="result"></div>
  
  <script>
    document.getElementById('scanBtn').addEventListener('click', async () => {
      // Utiliser une bibliothèque de scan QR comme html5-qrcode
      const qrCodeData = await scanQRCode() // Fonction de scan
      
      const response = await fetch('/api/certificates/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCodeData })
      })
      
      const result = await response.json()
      
      if (result.valid) {
        document.getElementById('result').innerHTML = `
          <div style="color: green;">
            ✓ Certificat Authentique
            <br>Titulaire: ${result.certificate.holder}
            <br>Formation: ${result.certificate.title}
            <br>Date: ${result.certificate.issueDate}
          </div>
        `
      } else {
        document.getElementById('result').innerHTML = `
          <div style="color: red;">
            ✗ Certificat Invalide
            <br>${result.error}
          </div>
        `
      }
    })
  </script>
</body>
</html>
```

---

## Sécurité et bonnes pratiques

### 🔐 Gestion de la clé secrète

✅ **À FAIRE :**
- Utiliser une variable d'environnement (`process.env.CERTIFICATE_SECRET_KEY`)
- Générer une clé de 256 bits minimum (32 bytes)
- Rotation régulière (tous les 1-2 ans)
- Stocker dans un gestionnaire de secrets (AWS Secrets Manager, HashiCorp Vault)

❌ **À NE PAS FAIRE :**
- Coder en dur dans le code source
- Committer dans Git
- Utiliser une clé faible ou prévisible
- Partager par email ou chat

### 🛡️ Protection contre les attaques

| Attaque | Protection |
|---------|------------|
| **Modification des données** | Signature HMAC invalide si données modifiées |
| **Rejeu** | Timestamp + vérification en DB |
| **Timing attack** | `crypto.timingSafeEqual()` pour comparer les signatures |
| **Brute force** | Utiliser SHA-256 ou SHA-512 |
| **Expiration** | `expiresIn` + vérification côté serveur |

### 📊 Audit et logging

Toujours logger les vérifications :

```typescript
await db.verificationLogs.create({
  certificateId: payload.certificate.id,
  verifiedAt: new Date(),
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  result: isValid ? 'success' : 'failed',
  failureReason: isValid ? null : 'invalid_signature',
})
```

### 🔄 Révocation de certificats

Base de données pour gérer les révocations :

```typescript
interface Certificate {
  id: string
  holderName: string
  title: string
  issueDate: Date
  revoked: boolean
  revokedAt?: Date
  revocationReason?: string
}

// Révoquer un certificat
await db.certificates.update(
  { id: 'CERT-2024-001' },
  {
    revoked: true,
    revokedAt: new Date(),
    revocationReason: 'Fraude détectée',
  }
)
```

---

## Cas d'usage avancés

### 1. Diplômes universitaires

```typescript
const diplomaData: CertificateData = {
  certificateId: 'DIPLOME-2024-MASTER-001',
  holderName: 'Sophie Bernard',
  title: 'Master Informatique - IA',
  issueDate: '2024-07-15T10:00:00Z',
  issuer: 'Université Paris Tech',
  grade: 'Mention Très Bien',
  metadata: {
    level: 'Bac+5',
    ects: 120,
    thesis: 'Machine Learning pour la détection de fraudes',
    thesisGrade: '19/20',
  },
}

const authenticated = generateAuthenticatedCertificate(
  diplomaData,
  {
    ...authConfig,
    expiresIn: undefined, // Pas d'expiration pour un diplôme
  }
)
```

### 2. Habilitations temporaires

```typescript
const habilitationData: CertificateData = {
  certificateId: 'HAB-ELEC-2024-001',
  holderName: 'Marc Dubois',
  title: 'Habilitation Électrique B2V',
  issueDate: '2024-11-02T14:00:00Z',
  issuer: 'APAVE Formation',
  expiryDate: '2027-11-02T23:59:59Z', // Expire dans 3 ans
  metadata: {
    level: 'B2V',
    domain: 'Travaux sous tension',
  },
}

const authenticated = generateAuthenticatedCertificate(
  habilitationData,
  {
    ...authConfig,
    algorithm: 'sha512', // Plus sécurisé pour habilitations
    expiresIn: 3 * 365 * 24 * 60 * 60, // 3 ans
  }
)
```

### 3. Certificats médicaux

```typescript
const medicalCertData: CertificateData = {
  certificateId: 'CERT-MED-2024-001',
  holderName: 'Dr. Laurent Petit',
  title: 'Formation Continue en Cardiologie',
  issueDate: '2024-11-02T09:00:00Z',
  issuer: 'Ordre National des Médecins',
  expiryDate: '2025-11-02T23:59:59Z',
  metadata: {
    speciality: 'Cardiologie',
    hours: '30 heures',
  },
}
```

### 4. Badges événement

```typescript
const badgeData: CertificateData = {
  certificateId: 'BADGE-CONF-2024-001',
  holderName: 'Alice Durand',
  title: 'Participant - Tech Conference 2024',
  issueDate: '2024-12-10T08:00:00Z',
  issuer: 'Tech Events Inc',
  expiryDate: '2024-12-10T20:00:00Z', // Expire le soir même
  metadata: {
    ticketType: 'VIP',
    access: 'All areas',
  },
}

// URL simple pour scan rapide à l'entrée
const quickUrl = generateSimpleAuthUrl(badgeData, authConfig)
```

---

## Résumé

### ✅ Ce que vous devez retenir

1. **Signature HMAC** = Infalsifiable
2. **Clé secrète** = À protéger absolument
3. **Hash du document** = Vérifier l'intégrité
4. **API de vérification** = Validation centralisée
5. **Logs & audit** = Traçabilité

### 🚀 Prochaines étapes

1. Configurer votre `CERTIFICATE_SECRET_KEY`
2. Implémenter l'API de vérification
3. Créer vos templates de certificats
4. Tester avec des faux certificats
5. Déployer en production

### 📚 Ressources

- [Exemples de code](../examples/certificate-auth-usage.ts)
- [Module QR Code](../lib/qrcode/)
- [HMAC (RFC 2104)](https://www.rfc-editor.org/rfc/rfc2104)

---

**Note** : Ce système ne remplace pas une PKI complète (Public Key Infrastructure), mais offre un excellent compromis entre sécurité et simplicité pour la plupart des cas d'usage de certificats.

