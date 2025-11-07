# 📄 LibreOffice dans Docker - Oxygen Document

LibreOffice est maintenant intégré dans le conteneur Docker pour permettre la conversion de documents Office (DOCX, PPTX, XLSX, etc.) en PDF ou autres formats.

## ✨ Fonctionnalités

### Formats supportés en entrée

- **Documents texte** : DOCX, DOC, ODT, RTF, TXT
- **Présentations** : PPTX, PPT, ODP
- **Tableurs** : XLSX, XLS, ODS, CSV
- **Web** : HTML, HTM

### Formats de sortie

- **PDF** (principal)
- HTML
- ODT
- DOC/DOCX
- RTF
- TXT

## 🚀 Installation

LibreOffice est automatiquement installé lors du build Docker. Aucune configuration supplémentaire n'est nécessaire !

### Dépendances installées

```dockerfile
# Dans le Dockerfile
RUN apk add --no-cache \
    libreoffice \
    openjdk11-jre \
    fontconfig \
    ttf-dejavu \
    font-noto \
    font-noto-cjk \
    msttcorefonts-installer
```

### Polices incluses

- **DejaVu** : Police système standard
- **Noto** : Support Unicode complet
- **Noto CJK** : Support chinois, japonais, coréen
- **MS Core Fonts** : Times New Roman, Arial, Courier, etc.

## 📚 Utilisation

### API TypeScript

```typescript
import {
  checkLibreOfficeAvailable,
  convertDocument,
  docxToPdf,
  pptxToPdf,
  xlsxToPdf,
} from '@/lib/libreoffice'

// Vérifier la disponibilité
const isAvailable = await checkLibreOfficeAvailable()

// Conversion DOCX → PDF
const pdfPath = await docxToPdf('/path/to/document.docx')

// Conversion PPTX → PDF
const pdfPath = await pptxToPdf('/path/to/presentation.pptx')

// Conversion XLSX → PDF
const pdfPath = await xlsxToPdf('/path/to/spreadsheet.xlsx')

// Conversion personnalisée
const outputPath = await convertDocument('/path/to/document.docx', {
  format: 'pdf',
  outputDir: '/path/to/output',
  timeout: 60000,
})
```

### Ligne de commande

```bash
# Dans le conteneur Docker
/usr/bin/soffice --headless --convert-to pdf --outdir /tmp /path/to/document.docx

# Avec Make
make shell
npm run test:libreoffice
```

## 🧪 Tests

### Vérifier l'installation

```bash
# En local (si LibreOffice est installé)
npm run test:libreoffice

# Dans le conteneur Docker
make test-libreoffice

# Ou
docker-compose -f docker-compose.prod.yml exec app npm run test:libreoffice
```

### Test de conversion

```bash
# Accéder au shell du conteneur
make shell

# Tester la conversion
soffice --headless --convert-to pdf --outdir /tmp /app/test.docx

# Vérifier la version
soffice --version
```

## 📦 Intégration dans votre code

### Exemple 1 : Conversion simple

```typescript
// app/api/convert/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { docxToPdf } from '@/lib/libreoffice'
import fs from 'fs/promises'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
    }

    // Sauvegarder le fichier temporairement
    const buffer = Buffer.from(await file.arrayBuffer())
    const tempPath = `/tmp/${Date.now()}-${file.name}`
    await fs.writeFile(tempPath, buffer)

    // Convertir en PDF
    const pdfPath = await docxToPdf(tempPath)

    // Lire le PDF généré
    const pdfBuffer = await fs.readFile(pdfPath)

    // Nettoyer les fichiers temporaires
    await fs.unlink(tempPath)
    await fs.unlink(pdfPath)

    // Retourner le PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${file.name}.pdf"`,
      },
    })
  } catch (error: unknown) {
    console.error('Erreur de conversion:', error)
    return NextResponse.json({ error: 'Erreur lors de la conversion' }, { status: 500 })
  }
}
```

### Exemple 2 : Conversion avec worker BullMQ

```typescript
// lib/queue/processors.ts
import { docxToPdf } from '@/lib/libreoffice'
import { uploadToS3 } from '@/lib/storage'

interface ConversionJob {
  documentPath: string
  outputFormat: string
}

export async function processConversion(job: ConversionJob): Promise<void> {
  const { documentPath, outputFormat } = job

  try {
    // Convertir le document
    const pdfPath = await docxToPdf(documentPath)

    // Uploader vers S3
    const s3Url = await uploadToS3(pdfPath)

    console.log('✅ Document converti et uploadé:', s3Url)

    return { success: true, url: s3Url }
  } catch (error: unknown) {
    console.error('❌ Erreur de conversion:', error)
    throw error
  }
}
```

### Exemple 3 : Génération de factures PDF depuis DOCX

```typescript
import { convertDocument } from '@/lib/libreoffice'
import { promises as fs } from 'fs'
import path from 'path'

async function generateInvoicePdf(
  templatePath: string,
  data: Record<string, string>
): Promise<string> {
  // 1. Remplacer les variables dans le template DOCX
  const docxContent = await fs.readFile(templatePath)
  let modifiedContent = docxContent.toString()

  Object.entries(data).forEach(([key, value]) => {
    modifiedContent = modifiedContent.replace(new RegExp(`{{${key}}}`, 'g'), value)
  })

  // 2. Sauvegarder le DOCX modifié
  const tempDocxPath = path.join('/tmp', `invoice-${Date.now()}.docx`)
  await fs.writeFile(tempDocxPath, modifiedContent)

  // 3. Convertir en PDF avec LibreOffice
  const pdfPath = await convertDocument(tempDocxPath, {
    format: 'pdf',
    outputDir: '/tmp',
  })

  // 4. Nettoyer le fichier temporaire
  await fs.unlink(tempDocxPath)

  return pdfPath
}
```

## ⚙️ Configuration

### Variables d'environnement

Ajoutez dans votre `.env.production` :

```bash
# Chemin vers LibreOffice (déjà configuré par défaut)
LIBREOFFICE_PATH=/usr/bin/soffice
```

### Options de conversion

```typescript
interface ConversionOptions {
  /** Format de sortie (pdf, html, etc.) */
  format?: string

  /** Dossier de sortie */
  outputDir?: string

  /** Filtres de conversion spécifiques */
  filters?: string

  /** Timeout en millisecondes (défaut: 60000) */
  timeout?: number
}
```

## 🔧 Dépannage

### LibreOffice ne se lance pas

```bash
# Vérifier l'installation
make shell
soffice --version

# Vérifier les permissions
ls -la /usr/bin/soffice

# Tester manuellement
soffice --headless --convert-to pdf /tmp/test.docx
```

### Polices manquantes

```bash
# Lister les polices disponibles
fc-list

# Mettre à jour le cache des polices
fc-cache -f

# Installer des polices supplémentaires (dans le Dockerfile)
RUN apk add --no-cache font-liberation font-noto-emoji
```

### Timeout de conversion

```typescript
// Augmenter le timeout pour les gros fichiers
const pdfPath = await convertDocument(docxPath, {
  format: 'pdf',
  timeout: 120000, // 2 minutes
})
```

### Erreur "Java not found"

LibreOffice nécessite Java. Vérifiez que `openjdk11-jre` est installé :

```bash
make shell
java -version
```

## 📊 Performance

### Taille de l'image Docker

L'ajout de LibreOffice ajoute environ **~300 MB** à l'image Docker :

- LibreOffice : ~200 MB
- OpenJDK 11 JRE : ~80 MB
- Polices : ~20 MB

### Temps de conversion

Temps moyens de conversion sur Alpine Linux :

| Type          | Taille | Temps |
| ------------- | ------ | ----- |
| DOCX simple   | 50 KB  | ~2s   |
| DOCX complexe | 500 KB | ~5s   |
| PPTX          | 2 MB   | ~8s   |
| XLSX          | 100 KB | ~3s   |

## 🎯 Cas d'usage

### 1. Génération d'attestations depuis templates DOCX

```typescript
// Template DOCX avec variables {{nom}}, {{date}}, etc.
// → Remplacement des variables
// → Conversion en PDF
// → Envoi par email
```

### 2. Export de rapports Excel en PDF

```typescript
// Génération d'un fichier XLSX avec des données
// → Conversion en PDF avec LibreOffice
// → Téléchargement ou archivage
```

### 3. Conversion de présentations PowerPoint

```typescript
// Template PPTX avec slides personnalisables
// → Modification des slides
// → Conversion en PDF
// → Partage avec les clients
```

## 🔒 Sécurité

### Bonnes pratiques

- ✅ Toujours nettoyer les fichiers temporaires après conversion
- ✅ Valider les types de fichiers en entrée
- ✅ Limiter la taille des fichiers uploadés
- ✅ Utiliser des timeouts appropriés
- ✅ Exécuter les conversions dans des jobs asynchrones (BullMQ)

### Exemple de validation

```typescript
const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

function validateFile(file: File): void {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('Type de fichier non supporté')
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Fichier trop volumineux')
  }
}
```

## 📚 Ressources

- [Documentation LibreOffice](https://www.libreoffice.org/discover/libreoffice/)
- [Guide de conversion en ligne de commande](https://help.libreoffice.org/latest/en-US/text/shared/guide/start_parameters.html)
- [Formats supportés](https://wiki.documentfoundation.org/Feature_Comparison:_LibreOffice_-_Microsoft_Office)

## 🎉 Résumé

LibreOffice est maintenant intégré dans votre application Docker Oxygen Document, vous permettant de :

- ✅ Convertir DOCX, PPTX, XLSX en PDF
- ✅ Utiliser des templates Office personnalisables
- ✅ Générer des documents professionnels
- ✅ Automatiser la production de documents
- ✅ Support complet des polices (dont MS Core Fonts)

**Prêt à utiliser ! 🚀**
