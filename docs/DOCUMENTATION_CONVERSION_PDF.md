# Documentation : Conversion DOCX → PDF

## 📋 Fonctionnalité

L'application permet de convertir automatiquement les documents Word générés en PDF lors de la génération de documents.

## 🔧 Configuration

### Dépendances installées

```bash
npm install mammoth puppeteer
```

### Dépendances système (Puppeteer)

**Puppeteer** nécessite Chromium (navigateur headless) qui peut nécessiter des dépendances système supplémentaires.

#### Windows

- ✅ Fonctionne généralement sans configuration supplémentaire
- Puppeteer télécharge automatiquement Chromium lors de l'installation

#### Linux / Docker

Vous devrez peut-être installer des packages système supplémentaires :

```bash
# Debian/Ubuntu
apt-get update
apt-get install -y \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libc6 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  libgcc1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  lsb-release \
  wget \
  xdg-utils
```

#### Docker

Si vous utilisez Docker, vous devrez peut-être ajouter ces packages dans votre `Dockerfile` :

```dockerfile
RUN apt-get update && apt-get install -y \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  # ... (voir liste ci-dessus)
  && rm -rf /var/lib/apt/lists/*
```

## 🚀 Utilisation

### Dans l'interface utilisateur

1. **Uploader un template DOCX** avec des variables `{{nom}}`, `{{date}}`, etc.

2. **Aller sur "Génération de documents"**

3. **Sélectionner le template DOCX**

4. **Importer des données CSV/Excel**

5. **Mapper les colonnes → variables**

6. **Dans l'étape de confirmation**, choisir le format de sortie :
   - **DOCX** : Conserve le format Word
   - **PDF** : Convertit automatiquement en PDF

7. **Lancer la génération**

### Via l'API

```typescript
POST /api/projects/{projectId}/generate
{
  "templateId": "template_id",
  "rows": [
    { "nom": "Dupont", "prenom": "Jean", "date": "2024-01-15" }
  ],
  "outputFormat": "pdf" // "docx" ou "pdf" (optionnel, par défaut "docx" pour DOCX)
}
```

## 🔄 Processus de conversion

1. **Génération DOCX** : Le document Word est généré avec `docxtemplater` et les variables remplacées
2. **Conversion DOCX → HTML** : Utilisation de `mammoth` pour convertir le DOCX en HTML (conserve les formats de base)
3. **Conversion HTML → PDF** : Utilisation de `puppeteer` (Chromium headless) pour convertir le HTML en PDF

## ⚠️ Limitations

### Fidélité de la conversion

- **Textes et formats de base** : ✅ Bien conservés (polices, couleurs, taille)
- **Tableaux** : ✅ Bien rendus
- **Images** : ⚠️ Peuvent nécessiter des ajustements selon le DOCX
- **Mise en page complexe** : ⚠️ Peut varier légèrement (marges, espacements)
- **Headers/Footers** : ⚠️ Nécessitent un parsing avancé pour être parfaitement conservés

### Performance

- **Génération DOCX** : Rapide (substitution de variables)
- **Conversion DOCX → PDF** : Plus lente (nécessite le lancement de Chromium)
  - Temps estimé : ~1-3 secondes par document
  - Pour 100 documents : ~2-5 minutes

### Dépendances système

- Puppeteer nécessite **Chromium** (téléchargé automatiquement sur Windows/Mac)
- Sur Linux/Docker, des **packages système** peuvent être nécessaires
- Utilisation mémoire : ~50-100MB par conversion en cours

## 🛠️ Alternatives

Si Puppeteer pose des problèmes :

### Option 1 : LibreOffice (recommandé pour production)

```bash
npm install libreoffice-convert
```

Puis modifier `lib/converters/docx-to-pdf.ts` pour utiliser LibreOffice :

```typescript
import libre from 'libreoffice-convert'

export async function convertDOCXToPDF(docxBuffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    libre.convert(docxBuffer, 'pdf', undefined, (err, pdfBuffer) => {
      if (err) reject(err)
      else resolve(Buffer.from(pdfBuffer))
    })
  })
}
```

**Avantages** :

- ✅ Plus fidèle à Word
- ✅ Pas de navigateur nécessaire
- ✅ Plus rapide pour les documents complexes

**Inconvénients** :

- ⚠️ Nécessite LibreOffice installé sur le serveur
- ⚠️ Dépendances système plus lourdes

### Option 2 : Service externe (API)

- Adobe PDF Services API
- CloudConvert API
- etc.

## 📊 Formats de sortie supportés

| Format template | Formats de sortie        |
| --------------- | ------------------------ |
| **DOCX**        | DOCX (par défaut) ou PDF |
| **PDF**         | PDF uniquement           |
| **Image**       | PDF uniquement           |

## 🐛 Résolution de problèmes

### Erreur : "Could not find Chromium"

**Solution** :

1. Vérifier que `puppeteer` est bien installé : `npm list puppeteer`
2. Réinstaller puppeteer : `npm install puppeteer --force`
3. Sur Linux, installer les dépendances système (voir ci-dessus)

### Erreur : "Conversion timeout"

**Cause** : Document trop complexe ou Chromium qui ne répond pas

**Solution** :

- Réduire la taille/complexité du document
- Augmenter le timeout dans le code
- Utiliser LibreOffice à la place

### Performance lente

**Solutions** :

- Utiliser LibreOffice (plus rapide)
- Générer en lot avec un système de files d'attente (BullMQ)
- Limiter le nombre de documents par batch
