# Guide de démarrage rapide : QR Codes

Guide rapide pour générer des QR codes dans vos documents en 5 minutes.

## 🚀 Installation

Le package `qrcode` et `@xmldom/xmldom` sont déjà installés dans le projet.

```bash
npm install
```

## 📦 Import

```typescript
import {
  generateQRCodeBuffer,
  generateQRCodeFromContent,
  formatQRCodeContent,
  type QRCodeContent,
} from '@/lib/qrcode'
```

## 🎯 Cas d'usage rapides

### 1. QR Code simple (URL)

```typescript
import { generateQRCodeBuffer } from '@/lib/qrcode'

const qrBuffer = await generateQRCodeBuffer('https://example.com')
// C'est tout ! Vous avez votre QR code en Buffer PNG
```

### 2. Document DOCX avec QR code

**Template Word (template.docx) :**
```
Commande #{{order_id}}
Client : {{customer_name}}

Suivez votre commande :
{{qrcode_tracking}}
```

**Code TypeScript :**
```typescript
import { generateDOCX } from '@/lib/generators/docx'

const docxBuffer = await generateDOCX(templateBuffer, {
  variables: {
    order_id: 'CMD-001',
    customer_name: 'Jean Dupont'
  },
  qrcodes: {
    '{{qrcode_tracking}}': 'https://tracking.example.com/order/CMD-001'
  }
})
```

### 3. Carte de visite (vCard)

```typescript
import { generateQRCodeFromContent } from '@/lib/qrcode'

const qrBuffer = await generateQRCodeFromContent({
  type: 'vcard',
  data: {
    firstName: 'Jean',
    lastName: 'Dupont',
    email: 'jean.dupont@example.com',
    phone: '+33123456789',
    organization: 'Entreprise SA'
  }
})
```

### 4. Partage WiFi

```typescript
import { formatQRCodeContent, generateQRCodeBuffer } from '@/lib/qrcode'

const wifiData = formatQRCodeContent({
  type: 'wifi',
  data: {
    ssid: 'Mon_Reseau',
    password: 'MotDePasse123',
    security: 'WPA'
  }
})

const qrBuffer = await generateQRCodeBuffer(wifiData)
```

### 5. Événement calendrier

```typescript
const eventData = formatQRCodeContent({
  type: 'event',
  data: {
    title: 'Réunion importante',
    location: 'Salle A',
    start: '2024-12-15T14:00:00Z',
    end: '2024-12-15T16:00:00Z'
  }
})

const qrBuffer = await generateQRCodeBuffer(eventData)
```

## ⚙️ Options communes

```typescript
const qrBuffer = await generateQRCodeBuffer('https://example.com', {
  width: 300,                    // Taille en pixels (défaut: 200)
  margin: 2,                     // Marge en modules (défaut: 1)
  errorCorrectionLevel: 'H',     // L, M, Q, ou H (défaut: M)
  color: {
    dark: '#1a73e8',             // Couleur du QR code
    light: '#ffffff'             // Couleur de fond
  }
})
```

## 📋 Types de contenu supportés

| Type | Usage | Exemple |
|------|-------|---------|
| `text` | Texte brut | Message, code, numéro |
| `url` | Site web | `https://example.com` |
| `email` | Contact email | `contact@example.com` |
| `tel` | Téléphone | `+33123456789` |
| `sms` | SMS | Numéro + message |
| `vcard` | Carte de visite | Coordonnées complètes |
| `wifi` | Connexion WiFi | SSID + mot de passe |
| `geo` | Localisation | Latitude + longitude |
| `event` | Événement | Titre + date + lieu |
| `custom` | Personnalisé | Données JSON |

## 🎨 Niveaux de correction d'erreur

| Niveau | Correction | Quand l'utiliser |
|--------|------------|------------------|
| L | ~7% | Documents numériques propres |
| M | ~15% | **Usage général** (recommandé) |
| Q | ~25% | Impression, étiquettes |
| H | ~30% | Conditions difficiles, logo sur QR |

## 📱 Tailles recommandées

| Support | Taille pixels | Taille physique |
|---------|---------------|-----------------|
| Badge | 150-200 | 2-3 cm |
| Document A4 | 200-300 | 3-5 cm |
| Affiche | 400-600 | 7-10 cm |
| Panneau | 800-1200 | 15-20 cm |

**Règle :** Le QR code doit être scannable à 10× sa taille.

## 🔧 Intégration dans l'API

### Endpoint pour générer un QR code

```typescript
// app/api/qrcode/generate/route.ts
import { generateQRCodeBuffer } from '@/lib/qrcode'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { data, options } = await request.json()
  
  const qrBuffer = await generateQRCodeBuffer(data, options)
  
  return new NextResponse(qrBuffer, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': 'inline; filename="qrcode.png"'
    }
  })
}
```

### Utilisation dans un composant React

```typescript
'use client'

import { useState } from 'react'

export function QRCodeGenerator() {
  const [qrUrl, setQrUrl] = useState('')
  
  const generateQR = async (data: string) => {
    const response = await fetch('/api/qrcode/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, options: { width: 300 } })
    })
    
    const blob = await response.blob()
    setQrUrl(URL.createObjectURL(blob))
  }
  
  return (
    <div>
      <button onClick={() => generateQR('https://example.com')}>
        Générer QR Code
      </button>
      {qrUrl && <img src={qrUrl} alt="QR Code" />}
    </div>
  )
}
```

## 📚 Ressources

- **Guide complet :** [`docs/GUIDE_QR_CODES.md`](./GUIDE_QR_CODES.md)
- **Exemples :** [`examples/qrcode-usage.ts`](../examples/qrcode-usage.ts)
- **Schémas de validation :** [`shared/schemas/qrcode.ts`](../shared/schemas/qrcode.ts)

## ⚡ Exemples complets

Consultez [`examples/qrcode-usage.ts`](../examples/qrcode-usage.ts) pour :
- Suivi de commande
- Badge événement avec vCard
- Certificat avec vérification
- Invitation multi-QR codes
- Partage WiFi
- Système de traçabilité
- Menu restaurant
- QR codes personnalisés

## 🆘 Besoin d'aide ?

**QR code illisible ?**
- ✓ Augmentez la taille (`width: 300`)
- ✓ Augmentez la correction d'erreur (`errorCorrectionLevel: 'H'`)
- ✓ Vérifiez les marges (`margin: 2`)

**Erreur dans DOCX ?**
- ✓ Vérifiez que le placeholder existe : `{{qrcode}}`
- ✓ Assurez-vous que le placeholder n'est pas fragmenté
- ✓ Utilisez un placeholder simple

**Données trop longues ?**
- ✓ Utilisez une URL courte
- ✓ Simplifiez le contenu
- ✓ Divisez en plusieurs QR codes

