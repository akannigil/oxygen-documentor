# Réponse : Personnalisation des Templates

## ✅ Problème de décalage du texte - RÉSOLU

### Diagnostic
Le décalage du texte était causé par une **incohérence entre l'aperçu HTML et le PDF généré** :
- L'aperçu utilisait flexbox pour centrer le texte
- Le générateur PDF utilisait un calcul manuel différent
- Les backgrounds/bordures n'étaient pas alignés correctement

### Corrections apportées

#### 1. `VisualPreview.tsx` (Aperçu)
- ✅ Restructuration du DOM pour correspondre au calcul PDF
- ✅ Centrage vertical cohérent avec `alignItems: center`
- ✅ Padding horizontal de 2px (gauche/droite)
- ✅ Calcul explicite de `textHeight`

#### 2. `generator.ts` (PDF)
- ✅ Séparation claire : `pdfYBase` + `verticalCenter`
- ✅ Backgrounds et bordures alignés sur `pdfYBase`
- ✅ Padding horizontal identique à l'aperçu (2px)
- ✅ Commentaires explicites sur la conversion Y

### Résultat
🎯 **L'aperçu correspond maintenant pixel-perfect au PDF généré !**

---

## 🎯 Meilleure approche pour personnaliser les templates

### Choisissez votre approche selon votre cas :

### 📋 Approche 1 : Template Simple
**Pour qui ?** Débutants, documents simples (< 10 champs)

**Workflow :**
1. Créez un fond dans Canva (595×842px pour A4)
2. Exportez en PNG
3. Uploadez et définissez 5-10 zones
4. Testez avec des données réelles

⏱️ **Temps** : 30 min  
⭐ **Complexité** : Facile  
💡 **Exemples** : Badge, certificat simple, étiquette

---

### 🏢 Approche 2 : Template Professionnel (RECOMMANDÉE)
**Pour qui ?** Production, documents complexes (10-30 champs)

**Workflow :**
1. Design professionnel dans Figma/Illustrator
2. Définissez les zones avec précision (grille 10px)
3. Utilisez styles visuels (couleurs, bordures)
4. Créez des variantes
5. Documentez le mapping des champs

⏱️ **Temps** : 2-4h  
⭐ **Complexité** : Moyenne  
💡 **Exemples** : Facture, contrat, devis

---

### 🔄 Approche 3 : Migration Template Existant
**Pour qui ?** Migration depuis Word/Excel

**Workflow :**
1. Exportez votre template en PDF haute qualité
2. Uploadez dans l'application
3. Identifiez les zones dynamiques (surlignez-les avant)
4. Placez les champs précisément
5. Affinez avec la grille

⏱️ **Temps** : 1-2h  
⭐ **Complexité** : Moyenne  
💡 **Exemples** : Conversion de templates existants

---

## 📐 Règles d'or pour des templates parfaits

### 1. Dimensionnement des zones
```
RÈGLE : field.h >= field.fontSize * 1.5 (minimum)
IDÉAL : field.h = field.fontSize * 2

Exemples :
- fontSize: 12 → h: 20-24px
- fontSize: 14 → h: 22-28px
- fontSize: 16 → h: 26-32px
- fontSize: 24 → h: 36-48px
```

### 2. Utilisation de la grille
- ✅ Activez "Aimanter à la grille" (10px)
- ✅ Alignez tous les champs sur la grille
- ✅ Utilisez les coordonnées affichées (valeurs réelles dans le PDF)

### 3. Nommage des champs
```
✅ BON : client_nom, montant_total, date_emission
❌ MAUVAIS : champ1, data, value
```

### 4. Types de champs appropriés
- **text** : Noms, adresses, descriptions
- **number** : Montants, quantités (avec format '0.00')
- **date** : Dates (avec format 'DD/MM/YYYY' ou 'YYYY-MM-DD')
- **qrcode** : QR codes (minimum 60×60px, idéal 100×100px)

### 5. Alignement selon le type
- **Texte** → gauche
- **Nombres/Montants** → droite (+ police Bold)
- **Titres** → centre

---

## ✅ Checklist avant production

- [ ] Template uploadé (PNG/PDF, bonne taille)
- [ ] Tous les champs définis et bien nommés
- [ ] Hauteur des zones ≥ fontSize × 1.5
- [ ] Types de champs corrects
- [ ] Polices et tailles appropriées
- [ ] Alignements configurés
- [ ] **Aperçu validé** (correspond au PDF)
- [ ] PDF généré et vérifié
- [ ] Testé avec données variées (court/long)
- [ ] Documentation créée

---

## 🔧 Dépannage rapide

| Problème | Solution |
|----------|----------|
| Texte décalé | ✅ Corrigé dans v2.0 ! Vérifiez `h >= fontSize × 1.5` |
| Texte coupé | Augmentez `field.w` ou réduisez `fontSize` |
| Alignement imprécis | Activez "Aimanter à la grille" |
| QR code illisible | Minimum 60×60px, idéal 100×100px (carré) |
| Fond déformé | Exportez aux dimensions exactes, privilégiez PNG |

---

## 📊 Workflow recommandé (étape par étape)

### Phase 1 : Conception (1-2h)
1. Créez le design dans un outil graphique
2. Laissez des espaces vides pour les zones dynamiques
3. Exportez en PNG/PDF haute qualité

### Phase 2 : Configuration (30min-1h)
4. Uploadez le template dans l'application
5. Activez la grille et "Aimanter à la grille"
6. Dessinez les zones d'insertion
7. Nommez et configurez chaque champ

### Phase 3 : Validation (30min)
8. Importez des données de test
9. Vérifiez l'aperçu (maintenant pixel-perfect !)
10. Générez un PDF de test
11. Ajustez si nécessaire

### Phase 4 : Production
12. Documentez le template (noms des champs, formats attendus)
13. Partagez avec votre équipe
14. Intégrez dans votre workflow

---

## 🎓 Exemple concret : Création d'une facture

```typescript
// Template : facture_professionnelle.png (595×842px)

const fields = [
  // En-tête
  {
    key: 'numero_facture',
    type: 'text',
    x: 450, y: 100, w: 100, h: 20,
    fontSize: 12, align: 'right'
  },
  {
    key: 'date_emission',
    type: 'date',
    format: 'DD/MM/YYYY',
    x: 450, y: 130, w: 100, h: 20,
    fontSize: 12, align: 'right'
  },
  
  // Client
  {
    key: 'client_nom',
    type: 'text',
    x: 50, y: 200, w: 200, h: 25,
    fontSize: 14, fontFamily: 'Helvetica-Bold'
  },
  {
    key: 'client_adresse',
    type: 'text',
    x: 50, y: 230, w: 200, h: 20,
    fontSize: 11
  },
  
  // Montants
  {
    key: 'montant_ht',
    type: 'number',
    format: '0.00',
    x: 450, y: 600, w: 100, h: 20,
    fontSize: 12, align: 'right'
  },
  {
    key: 'montant_tva',
    type: 'number',
    format: '0.00',
    x: 450, y: 625, w: 100, h: 20,
    fontSize: 12, align: 'right'
  },
  {
    key: 'montant_ttc',
    type: 'number',
    format: '0.00',
    x: 450, y: 655, w: 100, h: 28,
    fontSize: 16, fontFamily: 'Helvetica-Bold',
    align: 'right',
    backgroundColor: '#FEF3C7'
  },
  
  // QR Code pour paiement
  {
    key: 'qr_paiement',
    type: 'qrcode',
    x: 50, y: 720, w: 80, h: 80
  }
];
```

---

## 📚 Ressources

### Outils recommandés
- **Canva** : Design simple et rapide (gratuit)
- **Figma** : Design collaboratif professionnel (gratuit pour base)
- **Adobe Illustrator** : Design professionnel avancé
- **LibreOffice Draw** : Solution open-source

### Dimensions standards
- **A4 portrait** : 595 × 842px (72 DPI) ou 1240 × 1754px (150 DPI)
- **A4 paysage** : 842 × 595px (72 DPI)
- **Letter** : 612 × 792px (72 DPI)

### Documentation complète
📖 Consultez `TEMPLATE_CUSTOMIZATION_GUIDE.md` pour :
- Exemples détaillés par type de document
- Cas d'usage avancés
- Fonctionnalités futures
- Référence complète des propriétés

---

## 🎉 Résumé

### ✅ Problème résolu
Le décalage du texte est maintenant corrigé. L'aperçu correspond pixel-perfect au PDF généré.

### 🎯 Meilleure approche
Choisissez selon votre besoin :
- **Simple** : Rapide, pour débuter (30 min)
- **Professionnel** : Production, documents complexes (2-4h) ⭐ RECOMMANDÉ
- **Migration** : Conversion de templates existants (1-2h)

### 📐 Points clés
1. `field.h >= fontSize × 1.5` (minimum)
2. Utilisez la grille 10px
3. Nommez clairement les champs
4. Validez avec l'aperçu
5. Testez avec des données variées

---

**Version** : 2.0  
**Date** : 02/11/2025  
**Statut** : ✅ Décalage corrigé, workflow optimisé

