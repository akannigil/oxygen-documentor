# Guide de Personnalisation des Templates

## 📋 Résumé des corrections apportées (Mise à jour 02/11/2025)

### ✅ Problème de décalage résolu - Version 2.0

**Problème identifié** : Incohérence entre l'aperçu HTML et le PDF généré causant un décalage vertical du texte.

#### Corrections apportées :

1. **VisualPreview.tsx** : Harmonisation de l'affichage
   - Restructuration du DOM pour correspondre exactement au calcul PDF
   - Utilisation de `alignItems: center` pour le centrage vertical
   - Ajout de padding horizontal cohérent (2px gauche/droite)
   - Séparation claire entre le conteneur et le texte
   - Calcul explicite de `textHeight` pour la cohérence

2. **generator.ts** : Amélioration du positionnement
   - Séparation du calcul en `pdfYBase` + `verticalCenter`
   - Positionnement cohérent des backgrounds et bordures
   - Ajout de padding horizontal (2px) pour correspondre à l'aperçu
   - Commentaires clairs sur la conversion des coordonnées Y
   - Centrage vertical basé sur la hauteur de la zone (`field.h`)

#### Résultat :
✅ L'aperçu correspond maintenant **pixel-perfect** au PDF généré  
✅ Le centrage vertical est identique dans les deux systèmes  
✅ Le padding horizontal est cohérent  
✅ Les backgrounds et bordures sont correctement alignés

## 🎯 Meilleures pratiques pour personnaliser les templates

### Approche recommandée : Workflow en 4 étapes

#### 📐 Étape 1 : Conception du template de base
1. **Créez votre design** dans un logiciel graphique (Canva, Figma, Illustrator)
2. **Laissez des espaces vides** pour les zones dynamiques
3. **Exportez en haute qualité** : PNG (idéal) ou PDF
4. **Respectez les dimensions standards** : A4 (595×842px @ 72dpi) ou Letter

#### 🎨 Étape 2 : Upload et configuration
1. Uploadez le template dans l'application
2. L'éditeur affiche le template avec une grille de 10px
3. Activez "Aimanter à la grille" pour un placement précis

#### 📍 Étape 3 : Définition des zones d'insertion
1. **Dessinez les zones** en cliquant-glissant sur le template
2. **Nommez les champs** de manière descriptive (`client_nom`, `montant_total`)
3. **Configurez les propriétés** : type, police, taille, alignement
4. **Validez avec l'aperçu** pour vérifier le rendu

#### ✅ Étape 4 : Test et ajustement
1. Importez des données de test
2. Générez l'aperçu
3. Comparez avec le PDF final
4. Ajustez les zones si nécessaire

---

### 1. **Définition des zones dans l'éditeur**

#### Dimensionnement précis
```typescript
// RÈGLE D'OR : La hauteur de zone doit être proportionnelle à la fontSize
// Formule recommandée :
field.h >= field.fontSize * 1.5  // Minimum recommandé
field.h = field.fontSize * 2     // Confortable pour la plupart des cas

// Exemples :
fontSize: 12 → h: 20-24px
fontSize: 14 → h: 22-28px  
fontSize: 16 → h: 26-32px
fontSize: 24 → h: 36-48px
```

#### Règles de dimensionnement par type
```typescript
// Texte court (1 ligne)
{
  type: 'text',
  fontSize: 12,
  w: 150,      // Adaptez à la longueur attendue
  h: 20,       // 12 * 1.5-2
  align: 'left'
}

// Texte long (peut être tronqué)
{
  type: 'text',
  fontSize: 12,
  w: 300,      // Plus large
  h: 20,
  align: 'left'
}

// Nombres (généralement plus courts)
{
  type: 'number',
  fontSize: 14,
  w: 100,      // Plus étroit
  h: 22,
  align: 'right',  // Les montants sont généralement à droite
  fontFamily: 'Helvetica-Bold'
}
```

#### Utilisation de la grille
- ✅ Activez "Aimanter à la grille" pour un alignement précis
- ✅ La grille est espacée de 10 pixels
- ✅ Les coordonnées affichées sont les valeurs réelles dans le PDF

#### Propriétés recommandées par type de champ

**Texte court (nom, prénom, etc.)**
```typescript
{
  type: 'text',
  fontSize: 12,
  h: 20,  // 12 * 1.5-2
  align: 'left'
}
```

**Texte numérique (prix, quantité)**
```typescript
{
  type: 'number',
  fontSize: 14,
  h: 22,
  align: 'right',
  fontFamily: 'Helvetica-Bold'
}
```

**Dates**
```typescript
{
  type: 'date',
  fontSize: 12,
  h: 20,
  format: 'DD/MM/YYYY',  // ou 'YYYY-MM-DD'
  align: 'center'
}
```

**QR Codes**
```typescript
{
  type: 'qrcode',
  w: 100,
  h: 100,  // Carré de préférence
  // Note: w et h déterminent la taille du QR code
}
```

### 2. **Optimisation des templates**

#### Format d'image recommandé
- **PNG** : Meilleur pour les templates avec du texte et des graphiques nets
- **JPG** : Acceptable mais peut avoir des artefacts de compression
- **PDF** : Idéal pour les templates professionnels existants

#### Résolution recommandée
```
- A4 portrait : 595 × 842 px (72 DPI) ou 1240 × 1754 px (150 DPI)
- A4 paysage : 842 × 595 px (72 DPI) ou 1754 × 1240 px (150 DPI)
- Letter : 612 × 792 px (72 DPI)
```

#### Poids du fichier
- Idéal : < 500 KB
- Maximum : < 2 MB

### 3. **Workflow de création d'un template**

#### Étape 1 : Préparation du template de base
1. Créez votre design dans un logiciel graphique (Photoshop, Illustrator, Canva)
2. Laissez des zones vides pour les champs dynamiques
3. Exportez en PNG haute qualité ou PDF

#### Étape 2 : Upload et définition des zones
1. Uploadez le template dans l'application
2. Utilisez l'éditeur pour définir les zones d'insertion
3. Nommez les champs de manière descriptive (ex: `client_nom`, `montant_total`)

#### Étape 3 : Configuration des propriétés
1. Définissez le type de champ approprié
2. Ajustez la taille de police et l'alignement
3. Testez avec des données réelles

#### Étape 4 : Validation
1. Générez un aperçu avec des données test
2. Vérifiez l'alignement et le positionnement
3. Ajustez si nécessaire

### 4. **Personnalisation avancée**

#### Styles visuels
```typescript
// Fond coloré pour mettre en évidence
{
  backgroundColor: '#FEF3C7',  // Jaune pâle
  textColor: '#92400E',        // Marron foncé
  borderColor: '#F59E0B',      // Orange
  borderWidth: 2
}
```

#### Polices et formatage
```typescript
// Titre en gras
{
  fontFamily: 'Helvetica-Bold',
  fontSize: 18,
  textColor: '#1F2937'
}

// Corps de texte
{
  fontFamily: 'Helvetica',
  fontSize: 12,
  textColor: '#4B5563'
}

// Montants
{
  fontFamily: 'Courier-Bold',
  fontSize: 14,
  align: 'right',
  format: '0.00'  // Pour les nombres
}
```

#### Formats de données
```typescript
// Dates
format: 'DD/MM/YYYY'  // 25/12/2023
format: 'YYYY-MM-DD'  // 2023-12-25

// Nombres
format: '0.00'        // 1234.56
format: '0.000'       // 1234.567

// Texte
format: 'uppercase'   // TEXTE EN MAJUSCULES
format: 'lowercase'   // texte en minuscules
format: 'capitalize'  // Texte Avec Majuscule Initiale
```

### 5. **Architecture recommandée pour les projets**

#### Organisation des templates
```
Projet/
├── Templates/
│   ├── Factures/
│   │   ├── facture_standard.png
│   │   └── facture_premium.png
│   ├── Contrats/
│   │   └── contrat_type.pdf
│   └── Certificats/
│       └── certificat.png
└── Données/
    ├── clients.csv
    └── produits.xlsx
```

#### Nommage des champs
```typescript
// ✅ Bon - Descriptif et organisé
'client_nom'
'client_email'
'facture_numero'
'facture_date'
'montant_ht'
'montant_ttc'

// ❌ Mauvais - Vague et non structuré
'champ1'
'data'
'value'
```

### 6. **Cas d'usage courants**

#### Factures
```typescript
const factureFields = [
  { key: 'numero_facture', type: 'text', x: 450, y: 100, w: 100, h: 20 },
  { key: 'date_emission', type: 'date', format: 'DD/MM/YYYY', x: 450, y: 130, w: 100, h: 20 },
  { key: 'client_nom', type: 'text', x: 50, y: 200, w: 200, h: 25, fontSize: 14 },
  { key: 'montant_ht', type: 'number', format: '0.00', x: 450, y: 600, w: 100, h: 20, align: 'right' },
  { key: 'montant_ttc', type: 'number', format: '0.00', x: 450, y: 630, w: 100, h: 25, align: 'right', fontSize: 16, fontFamily: 'Helvetica-Bold' },
]
```

#### Badges/Cartes
```typescript
const badgeFields = [
  { key: 'participant_nom', type: 'text', x: 100, y: 200, w: 300, h: 40, fontSize: 24, align: 'center', fontFamily: 'Helvetica-Bold' },
  { key: 'participant_entreprise', type: 'text', x: 100, y: 250, w: 300, h: 25, fontSize: 14, align: 'center' },
  { key: 'badge_qrcode', type: 'qrcode', x: 350, y: 50, w: 80, h: 80 },
]
```

#### Certificats
```typescript
const certificatFields = [
  { key: 'etudiant_nom', type: 'text', x: 200, y: 300, w: 400, h: 50, fontSize: 32, align: 'center', fontFamily: 'Times-Bold' },
  { key: 'formation_nom', type: 'text', x: 150, y: 400, w: 500, h: 30, fontSize: 18, align: 'center', fontFamily: 'Times-Roman' },
  { key: 'date_obtention', type: 'date', format: 'DD/MM/YYYY', x: 250, y: 500, w: 300, h: 25, fontSize: 14, align: 'center' },
]
```

## 🚀 Fonctionnalités futures recommandées

### 1. Templates multiples pages
- Gérer des documents sur plusieurs pages
- Zones répétables (lignes de tableau)

### 2. Champs calculés
```typescript
{
  key: 'montant_tva',
  type: 'calculated',
  formula: 'montant_ht * 0.20'
}
```

### 3. Conditions d'affichage
```typescript
{
  key: 'mention_urgente',
  type: 'text',
  condition: 'priorite === "urgente"'
}
```

### 4. Import de polices personnalisées
- Support des fichiers TTF/OTF
- Polices de marque

### 5. Tableaux dynamiques
- Insertion de lignes de données
- En-têtes et pieds de tableau

### 6. Images dynamiques
- Logo variable selon le client
- Signatures scannées
- Photos produits

## 📚 Ressources

### Outils recommandés pour créer des templates
- **Canva** : Design simple et rapide
- **Adobe Illustrator** : Design professionnel
- **Figma** : Design collaboratif
- **LibreOffice Draw** : Solution open-source

### Bibliothèques utilisées
- **pdf-lib** : Manipulation de PDF
- **qrcode** : Génération de QR codes
- **Konva** : Canvas interactif pour l'éditeur

## 🎨 Meilleures approches de personnalisation

### Approche 1 : Template simple (recommandée pour débuter)

**Quand l'utiliser** : Documents simples avec peu de champs (< 10)

**Workflow** :
1. Créez un fond simple dans Canva ou PowerPoint
2. Exportez en PNG à la bonne taille (595×842px pour A4)
3. Uploadez et définissez 5-10 zones maximum
4. Utilisez des polices standard (Helvetica, Times)
5. Testez avec des données réelles

**Avantages** :
- ✅ Rapide à mettre en place (< 30 min)
- ✅ Facile à maintenir
- ✅ Performance optimale

**Exemple** : Badge événement, certificat simple, étiquette

---

### Approche 2 : Template professionnel (recommandée pour production)

**Quand l'utiliser** : Documents complexes avec charte graphique (10-30 champs)

**Workflow** :
1. Design professionnel dans Figma/Illustrator
2. Définissez précisément les zones avec la grille
3. Utilisez des styles visuels (couleurs, bordures, fonds)
4. Créez des variantes du template pour différents cas
5. Documentez le mapping des champs

**Avantages** :
- ✅ Rendu professionnel
- ✅ Cohérence visuelle garantie
- ✅ Réutilisable pour toute l'entreprise

**Exemple** : Facture, contrat, devis

---

### Approche 3 : Template existant (pour migration)

**Quand l'utiliser** : Vous avez déjà des templates PDF/DOCX existants

**Workflow** :
1. Exportez votre template existant en PDF haute qualité
2. Ouvrez-le dans l'application
3. Identifiez les zones dynamiques (surlignez-les avant pour faciliter)
4. Placez les champs exactement sur les zones existantes
5. Affinez avec la grille et l'aperçu

**Avantages** :
- ✅ Conservation des templates existants
- ✅ Pas de refonte graphique
- ✅ Migration progressive

**Exemple** : Migration de templates Word/Excel vers l'application

---

### Tableau comparatif des approches

| Critère | Simple | Professionnel | Migration |
|---------|--------|---------------|-----------|
| **Temps de setup** | 30 min | 2-4h | 1-2h |
| **Complexité** | ⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Flexibilité** | Moyenne | Élevée | Moyenne |
| **Maintenance** | Facile | Moyenne | Facile |
| **Cas d'usage** | Interne | Production | Migration |

---

### Conseils d'optimisation par approche

#### Pour Template simple :
- Limitez-vous à 1-2 polices
- Utilisez des tailles de police standards (12, 14, 16)
- Évitez les effets complexes
- Privilégiez les backgrounds unis

#### Pour Template professionnel :
- Créez un système de design cohérent
- Documentez les couleurs (hex codes)
- Testez avec des données edge cases (texte très long, caractères spéciaux)
- Créez des variantes pour chaque langue

#### Pour Template existant :
- Conservez la mise en page exacte
- Mesurez précisément les zones avec un outil (Photoshop, GIMP)
- Utilisez la grille 10px pour l'alignement
- Validez champ par champ

---

## 💡 Conseils de dépannage

### Le texte est décalé
- ✅ **Solution principale** : Les corrections v2.0 ont résolu ce problème
- ✅ Vérifiez que `field.h >= field.fontSize * 1.5`
- ✅ Assurez-vous que les dimensions du template sont correctes
- ✅ Utilisez l'aperçu qui correspond maintenant pixel-perfect au PDF

### L'image de fond est déformée
- ✅ Exportez le template aux dimensions exactes souhaitées
- ✅ Vérifiez que width et height sont correctement définis
- ✅ Privilégiez PNG pour éviter la compression JPEG

### Les caractères spéciaux ne s'affichent pas
- ✅ Les polices standard PDF supportent les caractères latins et accents
- ✅ Pour d'autres caractères (chinois, arabe), une future version supportera les polices personnalisées

### Le QR code est illisible
- ✅ Taille minimum recommandée : 60×60 px
- ✅ Taille idéale : 100×100 px ou plus
- ✅ Gardez une forme carrée (w === h)
- ✅ Testez avec un scanner avant production

### Le texte est coupé
- ✅ Augmentez la largeur de la zone (`field.w`)
- ✅ Réduisez légèrement la taille de police
- ✅ Utilisez une police plus condensée (Helvetica vs Times)

### L'alignement n'est pas précis
- ✅ Activez "Aimanter à la grille"
- ✅ Utilisez les coordonnées affichées pour ajuster manuellement
- ✅ Zoomez sur l'éditeur pour plus de précision

---

## 📊 Métriques de qualité d'un template

### Template bien conçu :
- ✅ Toutes les zones ont `h >= fontSize * 1.5`
- ✅ Les champs sont alignés sur la grille (multiples de 10)
- ✅ Les noms de champs sont descriptifs (`client_nom` vs `champ1`)
- ✅ L'aperçu correspond exactement au PDF généré
- ✅ Testé avec des données réelles variées
- ✅ Documentation des champs disponible

### Checklist avant production :
- [ ] Template uploadé et validé
- [ ] Tous les champs définis et nommés
- [ ] Types de champs corrects (text, number, date, qrcode)
- [ ] Tailles de police appropriées
- [ ] Alignements configurés
- [ ] Aperçu validé avec données test
- [ ] PDF généré et vérifié
- [ ] Données de test variées testées (texte court/long, nombres, dates)
- [ ] Documentation créée pour l'équipe

---

**Version du guide** : 2.0  
**Dernière mise à jour** : 02/11/2025  
**Corrections principales** : Harmonisation aperçu/PDF, ajout workflow et approches

