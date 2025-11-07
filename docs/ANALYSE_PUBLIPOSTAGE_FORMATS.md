# Analyse de faisabilité : Intégration DOC/DOCX et PPT/PPTX avec publipostage

## 📊 Résumé exécutif

**Faisabilité : ✅ HAUTE pour DOCX, ⚠️ MOYENNE pour PPTX**

### Formats recommandés

- ✅ **DOCX** : Format natif Office Open XML, excellente support bibliothèque
- ✅ **PPTX** : Format natif Office Open XML, support correct mais plus limité
- ❌ **DOC (ancien format)** : Format binaire propriétaire, complexe à manipuler
- ❌ **PPT (ancien format)** : Format binaire propriétaire, complexe à manipuler

---

## 🎯 Approche proposée : Système hybride

### Option 1 : Publipostage avec accolades (Recommandée) ✨

**Principe** : L'utilisateur insère des variables dans le template natif avec des accolades :

- `{{nom}}` ou `{{name}}`
- `{{date}}` ou `{{birthdate}}`
- `{{#if condition}}{{value}}{{/if}}` pour des conditions (optionnel)

**Avantages** :

- ✅ L'utilisateur travaille dans Word/PowerPoint natif
- ✅ Conserve tous les formats (polices, couleurs, mise en page)
- ✅ Pas besoin d'éditeur visuel complexe
- ✅ Workflow familier pour les utilisateurs Office

**Défis** :

- ⚠️ Nécessite une bibliothèque de parsing de templates
- ⚠️ Gestion des images/QR codes plus complexe

### Option 2 : Édition de zones comme PDF (Alternative)

**Principe** : Éditeur visuel similaire à l'éditeur PDF actuel

**Avantages** :

- ✅ Cohérence avec l'interface existante
- ✅ Contrôle pixel-perfect des positions

**Défis** :

- ❌ Conversion DOCX → HTML/Canvas perte de formatage
- ❌ Très complexe pour PowerPoint (slides multiples)
- ❌ Nécessite de re-créer le document (pas de template natif)

---

## 📚 Bibliothèques disponibles

### Pour DOCX

#### 1. `docxtemplater` ⭐ **RECOMMANDÉ**

```bash
npm install docxtemplater pizzip
```

**Points forts** :

- ✅ Support des accolades `{{variable}}`
- ✅ Support des conditions `{{#if}}...{{/if}}`
- ✅ Support des boucles `{{#each items}}...{{/each}}`
- ✅ Conserve les formats (polices, couleurs, paragraphes)
- ✅ Actif et maintenu
- ✅ ~15k GitHub stars

**Limitations** :

- ⚠️ Pas de support direct pour images/QR codes (nécessite workaround)
- ⚠️ Variables uniquement dans le texte (pas dans headers/footers par défaut)

**Exemple d'utilisation** :

```typescript
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'

const zip = new PizZip(templateBuffer)
const doc = new Docxtemplater(zip, {
  paragraphLoop: true,
  linebreaks: true,
})

doc.render({
  nom: 'Dupont',
  prenom: 'Jean',
  date: '15/03/2024',
})

const buffer = doc.getZip().generate({ type: 'nodebuffer' })
```

#### 2. `docx` (alternative)

```bash
npm install docx
```

**Points forts** :

- ✅ Génération programmatique complète
- ✅ Support des images, tableaux, etc.

**Limitations** :

- ❌ Nécessite de RECONSTRUIRE le document (pas de template)
- ❌ Perte du formatage original si on lit un DOCX existant

#### 3. `mammoth` (conversion HTML)

```bash
npm install mammoth
```

**Points forts** :

- ✅ Conversion DOCX → HTML propre

**Limitations** :

- ❌ Format intermédiaire, complexité supplémentaire
- ❌ Perte de certains formats lors de la conversion

### Pour PPTX

#### 1. `pptxgenjs` ⭐ **RECOMMANDÉ**

```bash
npm install pptxgenjs
```

**Points forts** :

- ✅ Génération de présentations PowerPoint
- ✅ Support des templates (lecture de fichiers PPTX existants)
- ✅ Support des images, tableaux, formes

**Limitations** :

- ⚠️ Principalement orienté GÉNÉRATION (pas édition de templates existants)
- ⚠️ Pas de support natif des accolades (nécessite parsing manuel)

**Alternatives** :

- `officegen` : Plus ancien, moins maintenu
- `jszip` + parsing XML manuel : Très complexe mais contrôle total

---

## 🔧 Architecture proposée

### Structure des fichiers

```
lib/
  ├── generators/
  │   ├── pdf.ts          (existant)
  │   ├── docx.ts         (nouveau)
  │   └── pptx.ts         (nouveau)
  ├── templates/
  │   ├── parser.ts       (nouveau - parse les accolades)
  │   └── validators.ts   (nouveau - valide les variables)
  └── utils/
      └── template-engine.ts (nouveau - moteur de template)

shared/
  └── types/
      └── template.ts     (étendre avec templateType: 'docx' | 'pptx' | 'pdf')
```

### Workflow

```
1. Upload template DOCX/PPTX
   ↓
2. Parsing automatique des accolades {{variable}}
   ↓
3. Affichage de la liste des variables détectées
   ↓
4. Option : Mode éditeur simple pour ajouter/modifier des accolades
   ↓
5. Mapping des colonnes CSV/Excel → variables
   ↓
6. Génération des documents
```

---

## 🚀 Plan d'implémentation (DOCX prioritaire)

### Phase 1 : Support DOCX avec accolades (MVP)

**Durée estimée** : 2-3 jours

#### Étapes

1. **Installation et setup**

```bash
npm install docxtemplater pizzip
npm install --save-dev @types/pizzip
```

2. **Parser de templates DOCX**
   - Extraire les variables `{{...}}` du document
   - Lister toutes les variables uniques
   - Valider la syntaxe

3. **Générateur DOCX**
   - Utiliser `docxtemplater` pour remplacer les variables
   - Gérer les formats (dates, nombres, texte)
   - Gérer les images/QR codes (si nécessaire)

4. **Extension du schéma Prisma**

```prisma
model Template {
  // ...
  templateType String @default("pdf") // "pdf" | "docx" | "pptx" | "image"
  variables    Json?  // ["nom", "prenom", "date"] détectées automatiquement
}
```

5. **Interface utilisateur**
   - Détection automatique du type de template
   - Affichage des variables détectées
   - Mapping CSV → variables (similaire au mapping actuel)

### Phase 2 : Support PPTX (si nécessaire)

**Durée estimée** : 3-4 jours (plus complexe)

- Même principe mais adaptation pour les slides
- Gestion multi-slides
- Support des animations ? (probablement non)

### Phase 3 : Mode éditeur d'accollades (Optionnel)

**Durée estimée** : 2-3 jours

Interface simple pour éditer directement les accolades dans le template :

- Upload DOCX → Conversion HTML → Éditeur WYSIWYG
- Ou : Afficher le contenu textuel et permettre l'ajout de `{{variable}}`

---

## 📋 Exemple de code

### Générateur DOCX

```typescript
// lib/generators/docx.ts
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import type { TemplateField } from '@/shared/types'

export async function generateDOCX(
  templateBuffer: Buffer,
  variables: Record<string, string | number | Date>,
  options?: {
    formatDates?: boolean
    formatNumbers?: boolean
  }
): Promise<Buffer> {
  try {
    const zip = new PizZip(templateBuffer)
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: {
        start: '{{',
        end: '}}',
      },
    })

    // Formater les données
    const formattedData: Record<string, string> = {}
    for (const [key, value] of Object.entries(variables)) {
      if (value instanceof Date) {
        formattedData[key] = value.toLocaleDateString('fr-FR')
      } else if (typeof value === 'number') {
        formattedData[key] = value.toString()
      } else {
        formattedData[key] = String(value)
      }
    }

    // Rendre le template
    doc.render(formattedData)

    // Générer le buffer
    const buffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    })

    return Buffer.from(buffer)
  } catch (error) {
    if (error instanceof Error) {
      if (error.properties && error.properties.errors instanceof Array) {
        const errorMessages = error.properties.errors
          .map((e: any) => e.properties?.explanation || e.message)
          .join('\n')
        throw new Error(`Erreur de template DOCX: ${errorMessages}`)
      }
    }
    throw error
  }
}
```

### Parser de variables

```typescript
// lib/templates/parser.ts
import PizZip from 'pizzip'

export interface ParsedVariable {
  name: string
  occurrences: number
  context?: string // Exemple de contexte autour de la variable
}

export async function parseDOCXVariables(templateBuffer: Buffer): Promise<ParsedVariable[]> {
  const zip = new PizZip(templateBuffer)
  const xmlContent = zip.files['word/document.xml']?.asText() || ''

  // Regex pour trouver {{variable}}
  const variableRegex = /\{\{([^}]+)\}\}/g
  const variables = new Map<string, { occurrences: number; context: string }>()

  let match
  while ((match = variableRegex.exec(xmlContent)) !== null) {
    const varName = match[1].trim()
    const context = match[0]

    if (!variables.has(varName)) {
      variables.set(varName, { occurrences: 0, context })
    }

    const entry = variables.get(varName)!
    entry.occurrences++
  }

  return Array.from(variables.entries()).map(([name, data]) => ({
    name,
    occurrences: data.occurrences,
    context: data.context,
  }))
}
```

---

## 🎨 Interface utilisateur proposée

### Étape 1 : Upload du template

```
┌────────────────────────────────────┐
│ Uploader un template               │
│                                    │
│ [Glisser-déposer ou cliquer]      │
│                                    │
│ Formats supportés :                │
│ ✅ PDF, PNG, JPG (actuel)          │
│ ✅ DOCX (nouveau)                  │
│ ⏳ PPTX (à venir)                   │
└────────────────────────────────────┘
```

### Étape 2 : Détection automatique des variables

```
┌────────────────────────────────────┐
│ Template: attestation.docx         │
│ Type: DOCX avec publipostage       │
│                                    │
│ Variables détectées :              │
│ ┌────────────────────────────────┐│
│ │ {{nom}}          (5 occurrences)││
│ │ {{prenom}}       (3 occurrences)││
│ │ {{date}}         (2 occurrences)││
│ │ {{lieu}}         (1 occurrence) ││
│ └────────────────────────────────┘│
│                                    │
│ [Mode éditeur] [Continuer]         │
└────────────────────────────────────┘
```

### Étape 3 : Mapping CSV → Variables

```
┌────────────────────────────────────┐
│ Mapping des colonnes               │
│                                    │
│ Colonne CSV    →   Variable DOCX   │
│ ─────────────────────────────────  │
│ nom            →   {{nom}} ✓       │
│ prenom         →   {{prenom}} ✓    │
│ date_naissance →   {{date}} ⚠️      │
│                                  │ │
│ [Modifier le mapping]             │
└────────────────────────────────────┘
```

---

## ⚠️ Limitations et considérations

### DOCX

1. **Images/QR codes**
   - `docxtemplater` ne supporte pas directement les images dynamiques
   - **Solution** : Convertir QR code en image, l'insérer via un workaround
   - Ou : Pré-générer les QR codes et les référencer par nom de fichier

2. **Headers/Footers**
   - Variables dans headers/footers possibles mais nécessite parsing XML avancé

3. **Tableaux complexes**
   - Support correct mais nécessite syntaxe spéciale pour les boucles

### PPTX

1. **Multi-slides**
   - Gestion plus complexe, un slide par document généré ?
   - Ou : Une présentation avec tous les slides générés ?

2. **Formatage**
   - Contrôle moins fin que DOCX
   - Animations et transitions non supportées

### Général

1. **Performance**
   - Génération DOCX/PPTX plus rapide que PDF (pas de rendering complexe)
   - Mais parsing initial peut être plus lent

2. **Taille des fichiers**
   - DOCX/PPTX générés seront plus volumineux que PDF équivalent
   - Compression recommandée

---

## 💡 Recommandations

### Pour démarrer rapidement

1. **Prioriser DOCX** : Format le plus demandé, meilleure bibliothèque
2. **Utiliser `docxtemplater`** : Mature, stable, bien documenté
3. **Simplifier au début** : Pas de conditions `{{#if}}`, juste `{{variable}}`
4. **QR codes** : Solution temporaire : convertir en image et insérer manuellement

### Évolution future

1. **Mode éditeur** : Permettre d'ajouter des accolades directement dans l'interface
2. **Conditions et boucles** : Support `{{#if}}` et `{{#each}}` pour utilisateurs avancés
3. **Validation** : Vérifier que toutes les variables du template sont mappées
4. **Preview** : Prévisualisation du document généré avant export

---

## 📊 Comparaison avec l'existant

| Aspect            | PDF/Image actuel                | DOCX proposé                      |
| ----------------- | ------------------------------- | --------------------------------- |
| **Workflow**      | Upload → Éditeur visuel → Zones | Upload → Variables auto-détectées |
| **Complexité**    | Moyenne (éditeur Konva)         | Basse (accollades simples)        |
| **Flexibilité**   | Contrôle pixel-perfect          | Contrôle via format Word          |
| **Performance**   | Moyenne (rendering)             | Rapide (substitution)             |
| **Prise en main** | Courbe d'apprentissage          | Immédiat pour utilisateurs Word   |

---

## ✅ Conclusion

**Recommandation finale** : ✅ **Implémenter DOCX en priorité**

1. **Haute valeur ajoutée** : Format très demandé, workflow familier
2. **Faisabilité technique** : Bibliothèque mature (`docxtemplater`)
3. **Effort modéré** : 2-3 jours pour un MVP fonctionnel
4. **Compatibilité** : S'intègre bien avec l'architecture existante

**PPTX** peut venir après, selon les besoins spécifiques.

**Anciens formats DOC/PPT** : ❌ **Ne pas supporter** (trop complexe, formats obsolètes)
