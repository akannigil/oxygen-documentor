# Implémentation complète : Génération de QR Codes

## 📋 Vue d'ensemble

Cette implémentation fournit un système complet de génération de QR codes pour les documents PDF, DOCX et images, avec support de multiples types de contenu (URL, vCard, WiFi, événements, etc.).

## 🎯 Fonctionnalités

### ✅ Types de QR codes supportés

- ✅ **Texte brut** - Messages simples, codes de référence
- ✅ **URL** - Liens vers sites web, portails clients
- ✅ **Email** - Contact avec sujet et corps pré-remplis
- ✅ **Téléphone** - Numéro de téléphone à composer
- ✅ **SMS** - Message texte pré-rempli
- ✅ **vCard** - Carte de visite numérique complète
- ✅ **WiFi** - Connexion réseau automatique
- ✅ **Géolocalisation** - Coordonnées GPS
- ✅ **Événement** - Ajout au calendrier (iCal)
- ✅ **Personnalisé** - Données JSON structurées

### ✅ Formats de documents supportés

- ✅ **PDF** - Génération directe avec `pdf-lib`
- ✅ **DOCX** - Insertion via placeholders `{{qrcode}}`
- ✅ **Images** - Fond PDF/PNG/JPG avec overlay QR code

### ✅ Options de configuration

- ✅ Taille configurable (50-2000 pixels)
- ✅ Marge ajustable (0-10 modules)
- ✅ 4 niveaux de correction d'erreur (L, M, Q, H)
- ✅ Couleurs personnalisées (hex)
- ✅ Format PNG ou JPEG
- ✅ Qualité JPEG ajustable

## 📁 Structure des fichiers

### Fichiers créés

```
lib/qrcode/
├── generator.ts              # Module principal de génération
├── docx-integration.ts       # Intégration DOCX spécifique
└── index.ts                  # Point d'entrée et exports

lib/generators/
└── docx.ts                   # Mis à jour avec support QR codes

shared/schemas/
└── qrcode.ts                 # Schémas de validation Zod

docs/
├── GUIDE_QR_CODES.md         # Guide complet et détaillé
└── QRCODE_QUICKSTART.md      # Guide de démarrage rapide

examples/
└── qrcode-usage.ts           # 10 exemples pratiques

README_QRCODE_IMPLEMENTATION.md  # Ce fichier
```

## 🚀 Installation

Les dépendances sont déjà installées :

- ✅ `qrcode` - Génération de QR codes
- ✅ `@xmldom/xmldom` - Manipulation XML pour DOCX

## 📖 Documentation

### 1. Guide de démarrage rapide

**Fichier :** [`docs/QRCODE_QUICKSTART.md`](docs/QRCODE_QUICKSTART.md)

Exemples simples pour démarrer en 5 minutes :

- QR code URL simple
- Intégration dans DOCX
- vCard, WiFi, événements
- Options communes

### 2. Guide complet

**Fichier :** [`docs/GUIDE_QR_CODES.md`](docs/GUIDE_QR_CODES.md)

Documentation exhaustive incluant :

- Tous les types de QR codes avec exemples
- Configuration avancée
- Intégration dans les documents
- API Reference complète
- Bonnes pratiques
- Dépannage

### 3. Exemples pratiques

**Fichier :** [`examples/qrcode-usage.ts`](examples/qrcode-usage.ts)

10 exemples complets prêts à l'emploi :

1. QR Code URL simple
2. Carte de visite (vCard)
3. Document de commande avec suivi
4. Badge événement
5. Certificat avec vérification
6. Invitation multi-QR codes
7. Partage WiFi
8. Système de traçabilité produit
9. Menu restaurant
10. QR code avec couleurs personnalisées

## 🔧 Utilisation

### Import de base

```typescript
import {
  generateQRCodeBuffer,
  generateQRCodeFromContent,
  formatQRCodeContent,
  validateQRCodeContent,
  type QRCodeContent,
  type QRCodeOptions,
} from '@/lib/qrcode'
```

### Génération simple

```typescript
// QR code URL
const qrBuffer = await generateQRCodeBuffer('https://example.com')

// Avec options
const qrBuffer = await generateQRCodeBuffer('https://example.com', {
  width: 300,
  errorCorrectionLevel: 'H',
})
```

### Génération avec contenu structuré

```typescript
// vCard
const qrBuffer = await generateQRCodeFromContent(
  {
    type: 'vcard',
    data: {
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean.dupont@example.com',
      phone: '+33123456789',
    },
  },
  {
    width: 250,
    errorCorrectionLevel: 'M',
  }
)
```

### Intégration DOCX

```typescript
import { generateDOCX } from '@/lib/generators/docx'

const docxBuffer = await generateDOCX(templateBuffer, {
  variables: {
    nom: 'Dupont',
    prenom: 'Jean',
  },
  qrcodes: {
    '{{qrcode_url}}': 'https://example.com',
    '{{qrcode_email}}': 'mailto:contact@example.com',
  },
  qrcodeOptions: {
    width: 200,
    errorCorrectionLevel: 'M',
  },
})
```

### Intégration PDF

```typescript
import { generateDocumentFromTemplate } from '@/lib/pdf/generator'

const fields: TemplateField[] = [
  {
    key: 'tracking_url',
    type: 'qrcode',
    x: 450,
    y: 50,
    w: 100,
    h: 100,
  },
]

const pdfBuffer = await generateDocumentFromTemplate(templateBuffer, 'application/pdf', fields, {
  tracking_url: 'https://tracking.example.com/order/12345',
})
```

## 🎨 Types de contenu

### 1. URL

```typescript
{ type: 'url', data: { url: 'https://example.com' } }
```

### 2. Email

```typescript
{
  type: 'email',
  data: {
    email: 'contact@example.com',
    subject: 'Sujet',
    body: 'Message'
  }
}
```

### 3. vCard (Carte de visite)

```typescript
{
  type: 'vcard',
  data: {
    firstName: 'Jean',
    lastName: 'Dupont',
    organization: 'Entreprise SA',
    title: 'Directeur',
    phone: '+33123456789',
    email: 'jean.dupont@example.com'
  }
}
```

### 4. WiFi

```typescript
{
  type: 'wifi',
  data: {
    ssid: 'MonReseau',
    password: 'MotDePasse',
    security: 'WPA'
  }
}
```

### 5. Événement

```typescript
{
  type: 'event',
  data: {
    title: 'Réunion',
    location: 'Salle A',
    start: '2024-12-15T14:00:00Z',
    end: '2024-12-15T16:00:00Z'
  }
}
```

### 6. Géolocalisation

```typescript
{
  type: 'geo',
  data: {
    latitude: 48.8566,
    longitude: 2.3522
  }
}
```

### 7. Données personnalisées

```typescript
{
  type: 'custom',
  data: {
    orderId: '12345',
    customerId: 'CUST-001',
    status: 'pending'
  }
}
```

## 🔒 Validation

Tous les schémas de validation Zod sont disponibles :

```typescript
import {
  qrCodeContentSchema,
  qrCodeOptionsSchema,
  generateQRCodeRequestSchema,
} from '@/shared/schemas/qrcode'

// Validation automatique
const validated = qrCodeContentSchema.parse(content)
```

## 📊 Workflow complet

### Pour documents DOCX

1. **Créer un template Word** avec des placeholders :

   ```
   Nom : {{nom}}
   Email : {{email}}

   Scannez ce QR code :
   {{qrcode_portal}}
   ```

2. **Générer le document** :

   ```typescript
   const docxBuffer = await generateDOCX(templateBuffer, {
     variables: { nom: 'Dupont', email: 'email@example.com' },
     qrcodes: { '{{qrcode_portal}}': 'https://portal.example.com' },
   })
   ```

3. **Optionnel : Convertir en PDF** :
   ```typescript
   const pdfBuffer = await convertDOCXToPDFWithStyles(docxBuffer)
   ```

### Pour documents PDF/Images

1. **Définir les champs** avec type `qrcode` :

   ```typescript
   const fields = [{ key: 'tracking_url', type: 'qrcode', x: 450, y: 50, w: 100, h: 100 }]
   ```

2. **Générer le document** :
   ```typescript
   const pdfBuffer = await generateDocumentFromTemplate(templateBuffer, 'application/pdf', fields, {
     tracking_url: 'https://example.com',
   })
   ```

## 🎯 Cas d'usage recommandés

### 1. **Suivi de commandes**

- QR code avec URL de suivi
- Niveau de correction : H (impression)
- Taille : 250-300 pixels

### 2. **Badges événements**

- QR code vCard pour contact
- QR code événement pour calendrier
- Niveau de correction : Q
- Taille : 180-200 pixels

### 3. **Certificats**

- QR code de vérification avec URL
- Données structurées (custom)
- Niveau de correction : Q
- Taille : 180-200 pixels

### 4. **Partage WiFi**

- QR code WiFi
- Niveau de correction : L (pas besoin de haute correction)
- Taille : 250-300 pixels

### 5. **Traçabilité produits**

- QR code personnalisé (custom)
- Niveau de correction : Q (étiquettes)
- Taille : 200 pixels

## 🛠️ API Reference rapide

### Fonctions principales

| Fonction                                                  | Usage             | Retour            |
| --------------------------------------------------------- | ----------------- | ----------------- |
| `generateQRCodeBuffer(data, options?)`                    | QR code simple    | `Promise<Buffer>` |
| `generateQRCodeDataURL(data, options?)`                   | QR code base64    | `Promise<string>` |
| `generateQRCodeFromContent(content, options?)`            | QR code structuré | `Promise<Buffer>` |
| `formatQRCodeContent(content)`                            | Formater contenu  | `string`          |
| `validateQRCodeContent(content)`                          | Valider contenu   | `boolean`         |
| `insertQRCodeInDOCX(buffer, placeholder, data, options?)` | Insertion DOCX    | `Promise<Buffer>` |

### Options communes

```typescript
{
  width: 200,                    // Taille (pixels)
  margin: 1,                     // Marge (modules)
  errorCorrectionLevel: 'M',     // L, M, Q, H
  type: 'image/png',             // PNG ou JPEG
  quality: 0.92,                 // Qualité JPEG (0-1)
  color: {
    dark: '#000000',             // Couleur QR code
    light: '#FFFFFF'             // Couleur fond
  }
}
```

## ✅ Tests et validation

### Tester la génération

```typescript
import { runAllExamples } from '../examples/qrcode-usage'

// Exécuter tous les exemples
await runAllExamples()
```

### Valider un QR code

```typescript
import { validateQRCodeContent } from '@/lib/qrcode'

try {
  validateQRCodeContent(content)
  console.log('✓ Contenu valide')
} catch (error) {
  console.error('✗ Erreur de validation :', error.message)
}
```

## 🔍 Dépannage

### QR code illisible

- ✓ Augmenter `width` (300+)
- ✓ Augmenter `errorCorrectionLevel` ('H')
- ✓ Augmenter `margin` (2+)
- ✓ Simplifier le contenu

### Erreur d'insertion DOCX

- ✓ Vérifier que le placeholder existe
- ✓ Utiliser un placeholder simple (`{{qrcode}}`)
- ✓ Vérifier que le placeholder n'est pas fragmenté

### Données trop longues

- ✓ Utiliser une URL courte
- ✓ Réduire le contenu du vCard
- ✓ Diviser en plusieurs QR codes

### QR code pixelisé

- ✓ Augmenter `width`
- ✓ Utiliser PNG au lieu de JPEG
- ✓ Augmenter `quality` pour JPEG (0.95+)

## 🎓 Formation

### Niveau débutant

1. Lire [`QRCODE_QUICKSTART.md`](docs/QRCODE_QUICKSTART.md)
2. Tester les exemples 1-3 de [`qrcode-usage.ts`](examples/qrcode-usage.ts)
3. Générer un QR code simple dans votre projet

### Niveau intermédiaire

1. Lire [`GUIDE_QR_CODES.md`](docs/GUIDE_QR_CODES.md) (sections 1-4)
2. Tester les exemples 4-7 de [`qrcode-usage.ts`](examples/qrcode-usage.ts)
3. Intégrer des QR codes dans vos templates DOCX

### Niveau avancé

1. Lire [`GUIDE_QR_CODES.md`](docs/GUIDE_QR_CODES.md) (complet)
2. Tester les exemples 8-10 de [`qrcode-usage.ts`](examples/qrcode-usage.ts)
3. Créer des QR codes personnalisés (custom)
4. Implémenter un système de vérification

## 📈 Prochaines étapes

### Améliorations possibles

- [ ] Support des logos sur QR codes
- [ ] QR codes SVG (vectoriel)
- [ ] QR codes dynamiques (avec analytics)
- [ ] Module image pour docxtemplater (intégration native)
- [ ] Interface UI pour configurer les QR codes
- [ ] Prévisualisation en temps réel
- [ ] Export batch de QR codes

### Intégrations recommandées

- [ ] API REST pour génération de QR codes
- [ ] Composant React pour preview
- [ ] Service de raccourcissement d'URL
- [ ] Système de tracking des scans
- [ ] Base de données de QR codes générés

## 📞 Support

Pour toute question ou problème :

1. Consultez la [documentation complète](docs/GUIDE_QR_CODES.md)
2. Vérifiez les [exemples](examples/qrcode-usage.ts)
3. Consultez la section [Dépannage](docs/GUIDE_QR_CODES.md#dépannage)

## 📝 Notes techniques

### Compatibilité

- ✅ Node.js 18+
- ✅ Next.js 15
- ✅ TypeScript 5.5
- ✅ React 19

### Performances

- Génération d'un QR code : ~10-50ms
- Insertion dans DOCX : ~50-200ms (selon taille du document)
- Génération PDF avec QR code : ~100-500ms

### Limites

- Taille maximale des données : ~2953 bytes (mode alphanumérique)
- Formats images : PNG, JPEG uniquement
- QR codes DOCX : Un placeholder par QR code

## 📚 Ressources externes

- [Documentation QRCode npm](https://www.npmjs.com/package/qrcode)
- [Spécification QR Code ISO/IEC 18004](https://www.iso.org/standard/62021.html)
- [vCard 3.0 RFC 2426](https://www.rfc-editor.org/rfc/rfc2426)
- [Guide des niveaux de correction](https://www.qrcode.com/en/about/error_correction.html)

---

**Auteur :** Implémentation complète du système de génération de QR codes  
**Date :** 2024-11-02  
**Version :** 1.0.0
