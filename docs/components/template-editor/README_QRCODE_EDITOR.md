# Éditeur de Templates - Intégration QR Code

Guide pour utiliser l'éditeur visuel de templates avec support QR Code.

---

## 🎯 Vue d'ensemble

L'éditeur `ImprovedTemplateEditor` permet de définir visuellement les zones de champs sur un template PDF ou image, incluant les QR Codes.

## 🖱️ Utilisation de l'éditeur

### 1. Créer une zone de champ

1. **Cliquez et maintenez** le bouton de la souris sur le template
2. **Glissez** pour créer un rectangle
3. **Relâchez** pour finaliser la zone

Le champ est automatiquement créé avec le type "Texte" par défaut.

### 2. Sélectionner un champ existant

- **Cliquez** sur un champ existant pour le sélectionner
- Les poignées de redimensionnement apparaissent
- Le panneau de propriétés s'affiche à droite

### 3. Modifier un champ

#### Déplacement

- **Cliquez et glissez** le champ pour le déplacer

#### Redimensionnement

- Utilisez les **poignées d'angle** pour redimensionner

#### Suppression

- Sélectionnez le champ
- Cliquez sur **"Supprimer le champ"** dans le panneau de propriétés

---

## 🔲 Configurer un QR Code

### Étape par étape

#### 1. Créer la zone du QR Code

Dessinez un rectangle à l'endroit désiré (voir "Créer une zone de champ")

#### 2. Changer le type en "QR Code"

Dans le **panneau de propriétés** (à droite) :

```
┌─────────────────────────────┐
│ Éditer: field_1234567890    │
│                              │
│ Clé du champ                 │
│ ┌─────────────────────────┐ │
│ │ qrcode_verification     │ │  ← Donnez un nom unique
│ └─────────────────────────┘ │
│                              │
│ Type                         │
│ ┌─────────────────────────┐ │
│ │ QR Code             ▼   │ │  ← Sélectionnez "QR Code"
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

#### 3. Configurer les options (optionnel)

Les options de configuration QR Code apparaissent automatiquement :

```typescript
// Structure des options générées
{
  key: 'qrcode_verification',
  x: 450,
  y: 850,
  w: 150,
  h: 150,
  type: 'qrcode',
  qrcodeOptions?: {
    errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H',
    margin: number,
    color?: {
      dark: string,
      light: string
    }
  },
  qrcodeAuth?: {
    enabled: boolean,
    verificationBaseUrl: string,
    expiresIn: number,
    includeDocumentHash: boolean,
    certificateFields?: {
      certificateId: string,
      holderName: string,
      title: string,
      issueDate: string,
      issuer: string
    }
  },
  qrcodeStorageUrl?: {
    enabled: boolean,
    urlType: 'signed' | 'public',
    expiresIn: number
  }
}
```

---

## ⚙️ Options disponibles

### Options de base

#### 🔧 Niveau de correction d'erreur

```typescript
errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H'
```

| Niveau | Capacité | Utilisation recommandée                                |
| ------ | -------- | ------------------------------------------------------ |
| L      | 7%       | QR Codes simples, pas de risque d'endommagement        |
| M      | 15%      | Usage général (défaut)                                 |
| Q      | 25%      | Certificats, documents importants                      |
| H      | 30%      | Environnement à risque, impression de mauvaise qualité |

#### 📏 Marge (en modules)

```typescript
margin: number // Défaut: 1
```

Recommandations :

- Minimum : `1`
- Optimal : `2-4`
- Maximum pratique : `10`

#### 🎨 Couleurs personnalisées

```typescript
color: {
  dark: string,   // Couleur des modules (défaut: #000000)
  light: string   // Couleur du fond (défaut: #FFFFFF)
}
```

⚠️ **Important** : Assurez un contraste suffisant pour la lisibilité !

Exemples :

```typescript
// Bleu corporatif
color: {
  dark: '#1a56db',
  light: '#f0f4ff'
}

// Vert
color: {
  dark: '#059669',
  light: '#ecfdf5'
}

// ❌ Mauvais contraste
color: {
  dark: '#cccccc',
  light: '#dddddd'  // Non lisible !
}
```

### Options d'authentification (Avancé)

Pour sécuriser les certificats avec signature cryptographique :

```typescript
qrcodeAuth: {
  enabled: true,
  verificationBaseUrl: 'https://verify.example.com',
  expiresIn: 315360000,  // 10 ans en secondes
  includeDocumentHash: true,  // Hash SHA-256 du document
  certificateFields: {
    certificateId: 'certificate_id',     // Clé dans les données
    holderName: 'holder_name',
    title: 'title',
    issueDate: 'issue_date',
    issuer: 'issuer'
  }
}
```

**Résultat** : Le QR Code contiendra un JWT signé avec les données du certificat.

**URL générée** :

```
https://verify.example.com?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Options d'URL de stockage (Avancé)

Pour inclure un lien direct vers le document généré :

```typescript
qrcodeStorageUrl: {
  enabled: true,
  urlType: 'signed',  // 'signed' ou 'public'
  expiresIn: 3600     // 1 heure (pour signed)
}
```

**Types d'URL** :

- `signed` : URL temporaire sécurisée (AWS S3 presigned URL)
- `public` : URL permanente publique

---

## 🎨 Interface utilisateur

### Grille et magnétisme

```typescript
// Contrôles en haut de l'éditeur
☑ Afficher la grille
☑ Aimanter à la grille
```

**Grille** : Facilite l'alignement visuel (10px)
**Magnétisme** : Les zones s'aimantent automatiquement à la grille

### Panneau de propriétés

Position : **Droite de l'écran**

États possibles :

1. **Aucune sélection** : Affiche un message d'aide
2. **Champ sélectionné** : Affiche les propriétés éditables

### Informations affichées

Pour chaque champ :

```
field_123456789
x: 450, y: 850
150×150
```

- Ligne 1 : Clé du champ
- Ligne 2 : Position (x, y)
- Ligne 3 : Dimensions (largeur × hauteur)

---

## 📊 Exemple complet

### Code de configuration

```typescript
import { ImprovedTemplateEditor } from '@/components/template-editor/ImprovedTemplateEditor'

function MyTemplateEditor() {
  const [fields, setFields] = useState<TemplateField[]>([
    {
      key: 'nom',
      x: 100,
      y: 200,
      w: 300,
      h: 40,
      type: 'text',
      fontSize: 16,
      align: 'left'
    },
    {
      key: 'qrcode_verification',
      x: 450,
      y: 750,
      w: 150,
      h: 150,
      type: 'qrcode',
      qrcodeOptions: {
        errorCorrectionLevel: 'Q',
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      },
      qrcodeAuth: {
        enabled: true,
        verificationBaseUrl: 'https://certificates.example.com/verify',
        expiresIn: 315360000,
        includeDocumentHash: true,
        certificateFields: {
          certificateId: 'certificate_id',
          holderName: 'holder_name',
          title: 'title',
          issueDate: 'issue_date',
          issuer: 'issuer'
        }
      }
    }
  ])

  return (
    <ImprovedTemplateEditor
      templateUrl="/api/projects/123/template"
      templateWidth={595}  // A4 width in points
      templateHeight={842} // A4 height in points
      fields={fields}
      onFieldsChange={setFields}
    />
  )
}
```

### Génération du document

```typescript
import { generateDocumentFromTemplate } from '@/lib/pdf/generator'

const pdfBuffer = await generateDocumentFromTemplate(
  templateBuffer,
  'application/pdf',
  fields, // Les champs configurés dans l'éditeur
  {
    nom: 'Jean Dupont',
    certificate_id: 'CERT-2025-001',
    holder_name: 'Jean Dupont',
    title: 'Formation React Avancé',
    issue_date: '2025-01-15',
    issuer: 'Formation Pro',
  },
  {
    // Options pour le workflow QR Code
    authConfig: {
      secretKey: process.env.CERTIFICATE_SECRET_KEY,
      verificationBaseUrl: 'https://certificates.example.com/verify',
      algorithm: 'sha256',
      expiresIn: 10 * 365 * 24 * 60 * 60,
    },
  }
)
```

---

## 🔍 Types TypeScript

### TemplateField

```typescript
interface TemplateField {
  key: string
  x: number
  y: number
  w: number
  h: number
  type: 'text' | 'qrcode' | 'date' | 'number'

  // Pour type 'text'
  fontSize?: number
  fontFamily?:
    | 'Helvetica'
    | 'Helvetica-Bold'
    | 'Times-Roman'
    | 'Times-Bold'
    | 'Courier'
    | 'Courier-Bold'
  align?: 'left' | 'center' | 'right'
  textColor?: string

  // Pour type 'qrcode'
  qrcodeOptions?: QRCodeOptions
  qrcodeAuth?: QRCodeCertificateAuth
  qrcodeStorageUrl?: QRCodeStorageUrl
}
```

### QRCodeOptions

```typescript
interface QRCodeOptions {
  width?: number
  margin?: number
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
  color?: {
    dark: string
    light: string
  }
}
```

### QRCodeCertificateAuth

```typescript
interface QRCodeCertificateAuth {
  enabled: boolean
  verificationBaseUrl: string
  expiresIn: number
  includeDocumentHash?: boolean
  certificateFields?: {
    certificateId: string
    holderName: string
    title: string
    issueDate: string
    issuer: string
  }
}
```

### QRCodeStorageUrl

```typescript
interface QRCodeStorageUrl {
  enabled: boolean
  urlType: 'signed' | 'public'
  expiresIn?: number
}
```

---

## 🐛 Dépannage

### Le QR Code ne s'affiche pas

**Vérifiez** :

1. Le champ est bien de type `'qrcode'`
2. La clé du champ est unique
3. Les données fournies lors de la génération contiennent les valeurs nécessaires

### Le QR Code n'est pas scannable

**Causes possibles** :

1. Contraste insuffisant (couleurs trop proches)
2. Taille trop petite (min 100×100 recommandé)
3. Niveau de correction d'erreur trop élevé avec beaucoup de données
4. Marge insuffisante autour du QR Code

**Solutions** :

- Augmenter la taille du champ
- Utiliser des couleurs à fort contraste
- Réduire la quantité de données dans le QR Code
- Augmenter la marge (`margin: 2-4`)

### L'authentification ne fonctionne pas

**Vérifiez** :

1. La variable `CERTIFICATE_SECRET_KEY` est définie
2. L'URL de vérification est correcte et accessible
3. Les clés des `certificateFields` correspondent aux données fournies
4. Le token n'est pas expiré

---

## 📚 Liens utiles

- [Guide d'intégration par type de template](../../docs/GUIDE_INTEGRATION_QRCODE_PAR_TYPE.md)
- [Référence rapide QR Code](../../docs/QRCODE_QUICK_REFERENCE.md)
- [Authentification des certificats](../../docs/GUIDE_AUTHENTIFICATION_CERTIFICATS.md)
- [Documentation API](../../docs/API_GENERATION.md)

---

**Dernière mise à jour** : 2025-01-15
