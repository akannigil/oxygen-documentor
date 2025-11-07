# Guide complet : Génération de QR codes

Ce guide explique comment intégrer et générer des QR codes dans vos documents (PDF, DOCX, Images).

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Types de QR codes supportés](#types-de-qr-codes-supportés)
3. [Génération de QR codes](#génération-de-qr-codes)
4. [Intégration dans les documents](#intégration-dans-les-documents)
5. [Configuration avancée](#configuration-avancée)
6. [Exemples pratiques](#exemples-pratiques)
7. [API Reference](#api-reference)

## Vue d'ensemble

Le système supporte la génération de QR codes pour différents types de contenu :

- Texte brut
- URLs
- Emails
- Téléphone / SMS
- vCard (carte de visite)
- WiFi
- Géolocalisation
- Événements calendrier
- Données personnalisées

### Architecture

```
lib/qrcode/
├── generator.ts          # Générateur principal de QR codes
├── docx-integration.ts   # Intégration avec documents DOCX
└── index.ts              # Point d'entrée du module

shared/schemas/
└── qrcode.ts             # Schémas de validation Zod
```

## Types de QR codes supportés

### 1. Texte brut

```typescript
{
  type: 'text',
  data: {
    text: 'Votre texte ici'
  }
}
```

**Cas d'usage :** Message simple, code de référence, numéro de série.

### 2. URL

```typescript
{
  type: 'url',
  data: {
    url: 'https://example.com'
  }
}
```

**Cas d'usage :** Lien vers un site web, page de suivi, portail client.

### 3. Email

```typescript
{
  type: 'email',
  data: {
    email: 'contact@example.com',
    subject: 'Sujet du mail',      // Optionnel
    body: 'Corps du message'       // Optionnel
  }
}
```

**Cas d'usage :** Contact rapide, support client, feedback.

### 4. Téléphone

```typescript
{
  type: 'tel',
  data: {
    phone: '+33123456789'
  }
}
```

**Cas d'usage :** Numéro de support, contact commercial.

### 5. SMS

```typescript
{
  type: 'sms',
  data: {
    phone: '+33123456789',
    message: 'Message pré-rempli'  // Optionnel
  }
}
```

**Cas d'usage :** Confirmation de commande, activation de service.

### 6. vCard (Carte de visite)

```typescript
{
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
    address: '123 Rue de la Paix, 75001 Paris'
  }
}
```

**Cas d'usage :** Carte de visite numérique, badge événement.

### 7. WiFi

```typescript
{
  type: 'wifi',
  data: {
    ssid: 'NomDuReseau',
    password: 'MotDePasse',
    security: 'WPA',  // 'WPA', 'WEP', ou 'nopass'
    hidden: false
  }
}
```

**Cas d'usage :** Partage d'accès WiFi, configuration réseau invités.

### 8. Géolocalisation

```typescript
{
  type: 'geo',
  data: {
    latitude: 48.8566,
    longitude: 2.3522
  }
}
```

**Cas d'usage :** Adresse de livraison, point de rendez-vous.

### 9. Événement calendrier

```typescript
{
  type: 'event',
  data: {
    title: 'Réunion importante',
    location: 'Salle de conférence A',
    description: 'Discussion sur le projet X',
    start: '2025-11-15T14:00:00Z',
    end: '2025-11-15T16:00:00Z'
  }
}
```

**Cas d'usage :** Invitation événement, rendez-vous client.

### 10. Données personnalisées

```typescript
{
  type: 'custom',
  data: {
    orderId: '12345',
    customerId: 'CUST-001',
    amount: 99.99,
    status: 'pending'
  }
}
```

**Cas d'usage :** Traçabilité, données structurées pour application mobile.

## Génération de QR codes

### Installation

Le package `qrcode` est déjà inclus dans les dépendances du projet.

### Import

```typescript
import {
  generateQRCodeBuffer,
  generateQRCodeDataURL,
  generateQRCodeFromContent,
  formatQRCodeContent,
  validateQRCodeContent,
  type QRCodeOptions,
  type QRCodeContent,
} from '@/lib/qrcode'
```

### Génération simple

```typescript
// Générer un QR code simple (texte)
const qrBuffer = await generateQRCodeBuffer('https://example.com')

// Avec options
const qrBuffer = await generateQRCodeBuffer('https://example.com', {
  width: 300,
  margin: 2,
  errorCorrectionLevel: 'H',
  color: {
    dark: '#000000',
    light: '#FFFFFF',
  },
})
```

### Génération avec contenu structuré

```typescript
// Créer le contenu
const content: QRCodeContent = {
  type: 'vcard',
  data: {
    firstName: 'Jean',
    lastName: 'Dupont',
    email: 'jean.dupont@example.com',
    phone: '+33123456789',
  },
}

// Valider le contenu
validateQRCodeContent(content) // Lance une erreur si invalide

// Générer le QR code
const qrBuffer = await generateQRCodeFromContent(content, {
  width: 250,
  errorCorrectionLevel: 'M',
})
```

### Format DataURL (pour HTML)

```typescript
const qrDataURL = await generateQRCodeDataURL('https://example.com')
// Résultat: "data:image/png;base64,iVBORw0KG..."

// Utilisation dans HTML
<img src={qrDataURL} alt="QR Code" />
```

## Intégration dans les documents

### 1. Documents PDF / Images

Les QR codes sont déjà intégrés dans le système de génération PDF via `lib/pdf/generator.ts`.

#### Dans le schéma de champs

```typescript
const field: TemplateField = {
  key: 'tracking_url',
  type: 'qrcode',
  x: 450,
  y: 50,
  w: 100,
  h: 100,
}
```

#### Génération

```typescript
import { generateDocumentFromTemplate } from '@/lib/pdf/generator'

const pdfBuffer = await generateDocumentFromTemplate(
  templateBuffer,
  'application/pdf',
  fields, // Inclut les champs de type 'qrcode'
  {
    tracking_url: 'https://tracking.example.com/order/12345',
  }
)
```

### 2. Documents DOCX

Pour les documents DOCX, utilisez des **placeholders** dans le template Word.

#### Étape 1 : Préparer le template DOCX

Dans votre document Word, ajoutez un placeholder là où vous voulez le QR code :

```
Scannez ce QR code pour accéder à votre espace client :
{{qrcode_portal}}
```

#### Étape 2 : Générer le document avec QR code

```typescript
import { generateDOCX } from '@/lib/generators/docx'

const docxBuffer = await generateDOCX(templateBuffer, {
  variables: {
    nom: 'Dupont',
    prenom: 'Jean',
    email: 'jean.dupont@example.com',
  },
  qrcodes: {
    '{{qrcode_portal}}': 'https://portal.example.com/client/12345',
    '{{qrcode_contact}}': 'mailto:support@example.com',
  },
  qrcodeOptions: {
    width: 200,
    margin: 1,
    errorCorrectionLevel: 'M',
  },
})
```

#### Étape 3 : Génération avancée avec contenu structuré

```typescript
import { formatQRCodeContent, type QRCodeContent } from '@/lib/qrcode'

// Créer un vCard
const vcardContent: QRCodeContent = {
  type: 'vcard',
  data: {
    firstName: 'Jean',
    lastName: 'Dupont',
    email: 'jean.dupont@example.com',
    phone: '+33123456789',
    organization: 'Entreprise SA',
  },
}

// Formater le contenu
const vcardData = formatQRCodeContent(vcardContent)

// Générer le document
const docxBuffer = await generateDOCX(templateBuffer, {
  variables: {
    nom: 'Dupont',
  },
  qrcodes: {
    '{{qrcode_vcard}}': vcardData,
  },
})
```

### 3. Insertion manuelle dans DOCX

Pour plus de contrôle, utilisez l'insertion directe :

```typescript
import { insertQRCodeInDOCX, insertMultipleQRCodesInDOCX } from '@/lib/qrcode'

// Insertion unique
const updatedBuffer = await insertQRCodeInDOCX(docxBuffer, '{{qrcode}}', 'https://example.com', {
  width: 200,
  docxWidth: 914400, // 1 pouce en EMUs
  docxHeight: 914400,
  altText: 'QR Code - Accès client',
})

// Insertions multiples
const updatedBuffer = await insertMultipleQRCodesInDOCX(docxBuffer, [
  {
    placeholder: '{{qrcode_url}}',
    data: 'https://example.com',
    options: { width: 150 },
  },
  {
    placeholder: '{{qrcode_email}}',
    data: 'mailto:contact@example.com',
    options: { width: 150 },
  },
])
```

## Configuration avancée

### Options de génération

```typescript
interface QRCodeOptions {
  // Largeur du QR code en pixels (50-2000)
  width?: number // Défaut: 200

  // Marge autour du QR code en modules (0-10)
  margin?: number // Défaut: 1

  // Niveau de correction d'erreur
  // L: ~7%, M: ~15%, Q: ~25%, H: ~30%
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H' // Défaut: 'M'

  // Type d'image
  type?: 'image/png' | 'image/jpeg' // Défaut: 'image/png'

  // Qualité JPEG (0-1)
  quality?: number // Défaut: 0.92

  // Couleurs personnalisées
  color?: {
    dark?: string // Défaut: '#000000'
    light?: string // Défaut: '#FFFFFF'
  }
}
```

### Choix du niveau de correction d'erreur

| Niveau | Correction | Recommandation                                  |
| ------ | ---------- | ----------------------------------------------- |
| L      | ~7%        | Documents propres, pas de risque de dégradation |
| M      | ~15%       | **Recommandé** - Usage général                  |
| Q      | ~25%       | Environnements difficiles (impression, usure)   |
| H      | ~30%       | Conditions extrêmes, logo sur le QR code        |

**Note :** Plus le niveau est élevé, plus le QR code est dense.

### Tailles recommandées

| Usage                | Taille (pixels) | Taille (cm) |
| -------------------- | --------------- | ----------- |
| Badge événement      | 150-200         | 2-3 cm      |
| Document A4          | 200-300         | 3-5 cm      |
| Affiche              | 400-600         | 7-10 cm     |
| Panneau publicitaire | 800-1200        | 15-20 cm    |

**Règle générale :** Le QR code doit être scannable à une distance de 10× sa taille.

### Conversion pixels ↔ EMUs (pour DOCX)

```typescript
// 1 pixel ≈ 9525 EMUs (à 96 DPI)
function pixelsToEMUs(pixels: number): number {
  return Math.round(pixels * 9525)
}

// 1 pouce = 914400 EMUs
// 1 cm ≈ 360000 EMUs
const tailleCm = 3
const tailleEMUs = tailleCm * 360000 // 1080000 EMUs
```

## Exemples pratiques

### Exemple 1 : Suivi de commande

```typescript
import { generateDOCX } from '@/lib/generators/docx'

const orderData = {
  orderId: 'CMD-2024-001',
  customerName: 'Jean Dupont',
  totalAmount: 149.99,
}

const trackingUrl = `https://tracking.example.com/order/${orderData.orderId}`

const docxBuffer = await generateDOCX(templateBuffer, {
  variables: {
    order_id: orderData.orderId,
    customer_name: orderData.customerName,
    total_amount: orderData.totalAmount,
  },
  qrcodes: {
    '{{qrcode_tracking}}': trackingUrl,
  },
  qrcodeOptions: {
    width: 250,
    errorCorrectionLevel: 'H', // Haute correction pour impression
  },
})
```

### Exemple 2 : Badge événement avec vCard

```typescript
import { formatQRCodeContent, generateQRCodeFromContent } from '@/lib/qrcode'

const participantData = {
  firstName: 'Marie',
  lastName: 'Martin',
  email: 'marie.martin@example.com',
  phone: '+33987654321',
  organization: 'TechCorp',
  title: 'CTO',
}

const vcardContent = {
  type: 'vcard' as const,
  data: participantData,
}

const qrBuffer = await generateQRCodeFromContent(vcardContent, {
  width: 200,
  errorCorrectionLevel: 'H',
  color: {
    dark: '#1a73e8', // QR code en bleu
    light: '#ffffff',
  },
})

// Utiliser ce buffer dans votre système de badges
```

### Exemple 3 : Certificat avec QR code de vérification

```typescript
import { generateDOCX } from '@/lib/generators/docx'
import { formatQRCodeContent } from '@/lib/qrcode'

const certificateData = {
  studentName: 'Pierre Durand',
  courseName: 'Formation TypeScript Avancé',
  date: '2024-11-02',
  certificateId: 'CERT-2024-TS-456',
}

// URL de vérification
const verificationUrl = `https://certificates.example.com/verify/${certificateData.certificateId}`

// Données structurées pour l'application mobile
const verificationData = formatQRCodeContent({
  type: 'custom',
  data: {
    type: 'certificate',
    id: certificateData.certificateId,
    studentName: certificateData.studentName,
    courseName: certificateData.courseName,
    issueDate: certificateData.date,
    verificationUrl: verificationUrl,
  },
})

const docxBuffer = await generateDOCX(templateBuffer, {
  variables: {
    student_name: certificateData.studentName,
    course_name: certificateData.courseName,
    date: certificateData.date,
    certificate_id: certificateData.certificateId,
  },
  qrcodes: {
    '{{qrcode_verification}}': verificationData,
  },
  qrcodeOptions: {
    width: 180,
    errorCorrectionLevel: 'Q',
  },
})
```

### Exemple 4 : Invitation événement

```typescript
import { formatQRCodeContent } from '@/lib/qrcode'

const eventData = {
  title: 'Conférence Tech 2024',
  location: 'Centre des Congrès, Paris',
  description: 'Conférence annuelle sur les technologies web',
  start: '2024-12-10T09:00:00Z',
  end: '2024-12-10T18:00:00Z',
}

const eventQRData = formatQRCodeContent({
  type: 'event',
  data: eventData,
})

const docxBuffer = await generateDOCX(templateBuffer, {
  variables: {
    event_title: eventData.title,
    event_location: eventData.location,
  },
  qrcodes: {
    '{{qrcode_event}}': eventQRData,
  },
})
```

### Exemple 5 : Partage WiFi

```typescript
import { formatQRCodeContent } from '@/lib/qrcode'

const wifiData = formatQRCodeContent({
  type: 'wifi',
  data: {
    ssid: 'Reseau_Invites',
    password: 'MotDePasse2024',
    security: 'WPA',
  },
})

// Générer un document avec le QR code WiFi
const docxBuffer = await generateDOCX(templateBuffer, {
  variables: {
    wifi_name: 'Reseau_Invites',
  },
  qrcodes: {
    '{{qrcode_wifi}}': wifiData,
  },
  qrcodeOptions: {
    width: 250,
    errorCorrectionLevel: 'L', // WiFi n'a pas besoin de haute correction
  },
})
```

## API Reference

### Fonctions principales

#### `generateQRCodeBuffer(data, options?)`

Génère un QR code au format Buffer PNG.

**Paramètres :**

- `data: string` - Données à encoder
- `options?: QRCodeOptions` - Options de génération

**Retourne :** `Promise<Buffer>`

---

#### `generateQRCodeDataURL(data, options?)`

Génère un QR code au format DataURL (base64).

**Paramètres :**

- `data: string` - Données à encoder
- `options?: QRCodeOptions` - Options de génération

**Retourne :** `Promise<string>`

---

#### `generateQRCodeFromContent(content, options?)`

Génère un QR code à partir d'un contenu structuré.

**Paramètres :**

- `content: QRCodeContent` - Contenu structuré (vCard, URL, etc.)
- `options?: QRCodeOptions` - Options de génération

**Retourne :** `Promise<Buffer>`

---

#### `formatQRCodeContent(content)`

Formate un contenu structuré en chaîne pour QR code.

**Paramètres :**

- `content: QRCodeContent` - Contenu structuré

**Retourne :** `string`

---

#### `validateQRCodeContent(content)`

Valide un contenu de QR code.

**Paramètres :**

- `content: QRCodeContent` - Contenu à valider

**Retourne :** `boolean` (lance une erreur si invalide)

---

#### `insertQRCodeInDOCX(docxBuffer, placeholder, qrData, options?)`

Insère un QR code dans un document DOCX.

**Paramètres :**

- `docxBuffer: Buffer` - Buffer du document DOCX
- `placeholder: string` - Placeholder à remplacer (ex: '{{qrcode}}')
- `qrData: string` - Données du QR code
- `options?: QRCodeInsertOptions` - Options d'insertion

**Retourne :** `Promise<Buffer>`

---

#### `insertMultipleQRCodesInDOCX(docxBuffer, qrCodes)`

Insère plusieurs QR codes dans un document DOCX.

**Paramètres :**

- `docxBuffer: Buffer` - Buffer du document DOCX
- `qrCodes: Array<{placeholder, data, options?}>` - Tableau de QR codes

**Retourne :** `Promise<Buffer>`

## Bonnes pratiques

### 1. Choix du contenu

✅ **Bon :**

- URLs courtes et propres
- Données structurées cohérentes
- Information pertinente et actuelle

❌ **Mauvais :**

- URLs trop longues (>200 caractères)
- Données sensibles non chiffrées
- Information obsolète

### 2. Taille et qualité

✅ **Bon :**

- Adapter la taille au support
- Utiliser une marge suffisante
- Choisir le bon niveau de correction

❌ **Mauvais :**

- QR code trop petit pour la distance de scan
- Pas de marge (difficile à scanner)
- Niveau de correction inadapté

### 3. Test et validation

✅ **Bon :**

- Tester avec plusieurs appareils
- Vérifier la lisibilité après impression
- Valider le contenu avant génération

❌ **Mauvais :**

- Ne pas tester avant production
- Ignorer les erreurs de validation
- Oublier de vérifier le rendu final

### 4. Accessibilité

✅ **Bon :**

- Ajouter un texte explicatif
- Fournir une alternative (URL écrite)
- Utiliser un texte alt descriptif

❌ **Mauvais :**

- QR code seul sans contexte
- Pas d'alternative pour non-mobiles
- Manque d'instructions

## Dépannage

### Problème : QR code illisible

**Solutions :**

1. Augmenter la taille (width)
2. Augmenter le niveau de correction (Q ou H)
3. Vérifier les marges
4. Simplifier le contenu

### Problème : Erreur d'insertion dans DOCX

**Solutions :**

1. Vérifier que le placeholder existe dans le document
2. S'assurer que le placeholder n'est pas fragmenté dans le XML
3. Utiliser un placeholder simple ({{qrcode}} plutôt que {{qr_code_très_long}})

### Problème : Données trop longues

**Solutions :**

1. Utiliser une URL courte (service de raccourcissement)
2. Réduire les informations dans le vCard
3. Diviser en plusieurs QR codes

### Problème : QR code pixelisé

**Solutions :**

1. Augmenter la largeur (width)
2. Utiliser PNG plutôt que JPEG
3. Pour JPEG, augmenter la qualité (0.95+)

## Ressources supplémentaires

- [Documentation QRCode npm](https://www.npmjs.com/package/qrcode)
- [Spécification QR Code ISO/IEC 18004](https://www.iso.org/standard/62021.html)
- [vCard 3.0 Specification](https://www.rfc-editor.org/rfc/rfc2426)
- [Guide des niveaux de correction](https://www.qrcode.com/en/about/error_correction.html)
