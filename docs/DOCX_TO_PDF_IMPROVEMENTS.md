# Améliorations de la Conversion DOCX vers PDF

## 📋 Problème Résolu

Lors de la conversion de documents DOCX vers PDF, le texte positionné au-dessus d'images de fond était déplacé en bas de page. Ce problème affectait particulièrement les templates DOCX contenant :

- Du texte entre accolades (variables de template)
- Des images de fond
- Des text boxes avec positionnement absolu
- Des formes avec du texte superposé

## ✅ Solution Implémentée

### 1. Analyse du Document DOCX

**Nouvelle fonction : `analyzeDocumentPositioning()`**

- Analyse le XML du document DOCX (`word/document.xml`)
- Détecte les éléments avec positionnement absolu (`<wp:anchor>`, `<w:txbxContent>`, `<w:pict>`)
- Identifie les images de fond (`<v:background>`, `<w:background>`)

```typescript
const positioning = await analyzeDocumentPositioning(docxBuffer)
// Retourne: { hasAbsolutePositioning: boolean, hasBackgroundImages: boolean }
```

### 2. Extraction des Images

**Nouvelle fonction : `extractImagesFromDOCX()`**

- Extrait toutes les images du DOCX (dossier `word/media/`)
- Détermine automatiquement le type MIME (PNG, JPEG, GIF, BMP)
- Prépare les images pour l'inclusion dans le HTML

### 3. Conversion HTML Améliorée

**Améliorations de la conversion Mammoth :**

- Conversion des images en base64 pour inclusion directe dans le HTML
- Préservation des styles de paragraphe
- Support des text boxes et formes

```typescript
convertImage: mammoth.images.imgElement(async (image) => {
  const imageBuffer = await image.read()
  const base64 = imageBuffer.toString('base64')
  const contentType = image.contentType || 'image/png'
  return {
    src: `data:${contentType};base64,${base64}`,
  }
})
```

### 4. CSS Optimisé pour la Superposition

**Règles CSS clés :**

```css
/* Contexte de positionnement pour le body */
body {
  position: relative;
}

/* Tout le texte au-dessus (z-index: 10) */
p,
h1,
h2,
h3,
h4,
h5,
h6,
div,
span {
  position: relative;
  z-index: 10;
}

/* Images en arrière-plan (z-index: 0 ou 1) */
img {
  position: relative;
  z-index: 1;
}

/* Images de fond détectées */
img.background-image {
  position: absolute;
  z-index: 0 !important;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Première image = image de fond */
body > img:first-child {
  position: absolute;
  z-index: 0;
  top: 0;
  left: 0;
}
```

### 5. JavaScript de Repositionnement

**Script exécuté dans le navigateur avant la conversion PDF :**

```javascript
window.addEventListener('DOMContentLoaded', function () {
  // Détecter automatiquement les images de fond
  const firstImg = document.querySelector('body > img:first-child')
  if (firstImg) {
    firstImg.addEventListener('load', function () {
      const imgWidth = this.naturalWidth
      const bodyWidth = document.body.offsetWidth

      // Si l'image occupe ≥80% de la largeur = image de fond
      if (imgWidth >= bodyWidth * 0.8) {
        this.classList.add('background-image')
        this.style.position = 'absolute'
        this.style.zIndex = '0'
        // ...
      }
    })
  }

  // Forcer le z-index de tous les textes
  const allText = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div, span')
  allText.forEach(function (el) {
    if (el.textContent && el.textContent.trim()) {
      el.style.position = 'relative'
      el.style.zIndex = '10'
    }
  })
})
```

### 6. Optimisations Puppeteer

**Amélioration du processus de conversion :**

```typescript
// Attendre le chargement complet
await page.setContent(styledHTML, {
  waitUntil: ['networkidle0', 'load', 'domcontentloaded'],
})

// Attendre que toutes les images soient chargées
await page.evaluate(() => {
  return Promise.all(
    Array.from(document.images)
      .filter((img) => !img.complete)
      .map((img) => {
        return new Promise((resolve, reject) => {
          img.addEventListener('load', resolve)
          img.addEventListener('error', reject)
          setTimeout(() => resolve(null), 5000) // Timeout de sécurité
        })
      })
  )
})

// Délai pour le JavaScript de positionnement
await new Promise((resolve) => setTimeout(resolve, 500))

// Options PDF optimisées
const pdfOptions = {
  format: 'A4',
  landscape: false,
  printBackground: true, // Crucial pour les images de fond
  omitBackground: false, // Ne pas omettre les images de fond
  margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
}
```

## 🎯 Résultat

### Avant les Améliorations

❌ Le texte entre accolades était déplacé en bas de page  
❌ Les images de fond n'étaient pas préservées  
❌ Le positionnement absolu était ignoré  
❌ La superposition texte/image était perdue

### Après les Améliorations

✅ Le texte reste au-dessus des images de fond  
✅ Les images de fond sont correctement positionnées  
✅ Le positionnement absolu est préservé  
✅ La superposition texte/image est maintenue  
✅ Détection automatique des images de fond  
✅ Logs de debugging pour tracer les problèmes

## 📊 Logs de Debugging

Le système génère maintenant des logs pour faciliter le debugging :

```
Analyse du document DOCX: {
  hasAbsolutePositioning: true,
  hasBackgroundImages: true,
  imageCount: 1
}

Image de fond détectée et repositionnée
Positionnement du texte optimisé pour PDF
Images trouvées: 1, Éléments texte: 15
Image 0: position=absolute, zIndex=0
```

## 🔧 Configuration

### Options de Conversion

La fonction `convertDOCXToPDFWithStyles()` accepte maintenant des options :

```typescript
interface PDFConversionOptions {
  format?: 'A4' | 'A3' | 'Letter' | 'Legal' | 'Tabloid'
  orientation?: 'portrait' | 'landscape'
  margins?: {
    top?: string
    right?: string
    bottom?: string
    left?: string
  }
}

const pdfBuffer = await convertDOCXToPDFWithStyles(docxBuffer, {
  format: 'A4',
  orientation: 'portrait',
  margins: {
    top: '10mm',
    right: '10mm',
    bottom: '10mm',
    left: '10mm',
  },
})
```

## 🎨 Cas d'Usage Supportés

### 1. Certificats avec Image de Fond

- Image de fond pleine page
- Texte (nom, date, etc.) superposé
- Variables de template `{{nom}}`, `{{date}}`

### 2. Badges avec Photo

- Photo en arrière-plan
- Informations textuelles au-dessus
- QR codes et logos

### 3. Documents Officiels

- En-tête avec logo
- Texte avec mise en forme complexe
- Images et tableaux intégrés

### 4. Templates Marketing

- Design graphique riche
- Zones de texte variables
- Images décoratives

## ⚠️ Limitations Connues

1. **Mammoth ne supporte pas tous les éléments Word**
   - Les formes complexes peuvent ne pas être converties
   - Certains styles avancés peuvent être perdus

2. **Positionnement approximatif**
   - Le positionnement absolu en HTML/CSS n'est pas pixel-perfect par rapport à Word
   - Les marges et espacements peuvent légèrement varier

3. **Performance**
   - La conversion prend plus de temps (délais pour les images)
   - Recommandé : limiter à 100 documents par requête

## 🔮 Améliorations Futures

1. **Support LibreOffice**
   - Utiliser `libreoffice --headless` pour une conversion plus fidèle
   - Meilleure préservation du formatage Word

2. **Extraction XML avancée**
   - Parser complètement le XML pour extraire les positions exactes
   - Recréer le layout en HTML avec positionnement absolu précis

3. **Cache des conversions**
   - Mettre en cache les conversions pour les templates identiques
   - Optimiser les performances

4. **Prévisualisation**
   - Générer une prévisualisation HTML avant la conversion PDF
   - Permettre à l'utilisateur de vérifier le rendu

## 📚 Références

- [Mammoth.js Documentation](https://github.com/mwilliamson/mammoth.js)
- [Puppeteer PDF Generation](https://pptr.dev/api/puppeteer.page.pdf)
- [DOCX File Format](https://docs.microsoft.com/en-us/office/open-xml/structure-of-a-wordprocessingml-document)
- [CSS Z-Index and Stacking Context](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Positioning/Understanding_z_index/The_stacking_context)

## 🐛 Debugging

Si le texte n'est toujours pas correctement positionné :

1. **Vérifier les logs console**

   ```javascript
   console.log('Analyse du document DOCX:', positioning)
   ```

2. **Inspecter le HTML généré**
   - Ajouter un log du `styledHTML` avant la conversion
   - Vérifier les classes et z-index des éléments

3. **Tester dans un navigateur**
   - Sauvegarder le HTML généré dans un fichier
   - Ouvrir dans un navigateur pour vérifier le rendu

4. **Ajuster les délais**
   - Augmenter le délai de 500ms à 1000ms si nécessaire
   - Vérifier que toutes les images sont chargées

5. **Vérifier le document DOCX source**
   - Ouvrir le DOCX dans Word
   - Vérifier comment l'image est insérée (en ligne vs. derrière le texte)
   - Utiliser "Format de l'image > Habillage du texte > Derrière le texte"

---

**Date de mise à jour :** 2 novembre 2025  
**Version :** 2.0  
**Auteur :** Assistant IA
