# Guide : Créer des Templates DOCX avec Images de Fond

## 🎯 Objectif

Ce guide explique comment créer des templates DOCX avec des images de fond et du texte superposé, pour une conversion optimale vers PDF.

## 📋 Pré-requis

- Microsoft Word (ou LibreOffice Writer, Google Docs)
- Images de fond en haute qualité (PNG ou JPEG)
- Connaissance des variables de template `{{variable}}`

## 🛠️ Étapes de Création

### 1. Préparer l'Image de Fond

**Dimensions recommandées :**
- A4 Portrait : 2480 × 3508 px (300 DPI) ou 794 × 1123 px (96 DPI)
- A4 Paysage : 3508 × 2480 px (300 DPI) ou 1123 × 794 px (96 DPI)
- Letter Portrait : 2550 × 3300 px (300 DPI) ou 816 × 1056 px (96 DPI)

**Format recommandé :**
- PNG avec transparence (si besoin)
- JPEG pour photos
- Éviter BMP (taille de fichier importante)

### 2. Insérer l'Image dans Word

#### Option A : Image en Arrière-Plan (RECOMMANDÉ)

1. Ouvrez votre document Word
2. Allez dans **Insertion > Images**
3. Sélectionnez votre image de fond
4. Clic droit sur l'image > **Habillage du texte > Derrière le texte**
5. Ajustez la taille de l'image pour qu'elle remplisse la page
6. Verrouillez l'image (Clic droit > **Taille et position** > cocher **Ancrer**)

```
✅ Cette méthode garantit que le texte reste au-dessus de l'image
```

#### Option B : Filigrane de Page

1. Allez dans **Création > Filigrane > Filigrane personnalisé**
2. Choisissez **Image en filigrane**
3. Sélectionnez votre image
4. Décochez **Translucide** si vous voulez l'image opaque
5. Cliquez sur **OK**

```
⚠️ Cette méthode peut rendre l'image translucide
```

### 3. Ajouter le Texte et les Variables

#### Positionnement du Texte

1. **Zones de texte flottantes** (pour positionnement précis)
   - Insertion > **Zone de texte > Dessiner une zone de texte**
   - Positionnez la zone où vous voulez
   - Saisissez votre texte ou variable : `{{nom}}`
   - Supprimez la bordure et le fond de la zone de texte

2. **Texte normal** (pour documents fluides)
   - Saisissez directement dans le document
   - Utilisez des tabulations et espaces pour positionner

#### Variables de Template

Utilisez la syntaxe `{{variable}}` pour les champs dynamiques :

```
Bonjour {{prenom}} {{nom}},

Vous êtes né(e) le {{date_naissance}}.
Votre numéro de badge est {{numero_badge}}.

Signature : {{signature}}
Date : {{date_emission}}
```

**Variables courantes :**
- `{{nom}}` - Nom de famille
- `{{prenom}}` - Prénom
- `{{email}}` - Adresse email
- `{{date}}` - Date actuelle
- `{{numero}}` - Numéro séquentiel
- `{{montant}}` - Montant (nombre)

### 4. Mise en Forme du Texte

#### Police et Taille

```
Recommandations :
- Titre principal : 18-24 pt, gras
- Sous-titres : 14-16 pt, gras
- Corps de texte : 11-12 pt, normal
- Petites notes : 9-10 pt
```

#### Couleurs

Pour un bon contraste sur image de fond :
- Texte sombre sur fond clair
- Texte clair avec ombre portée sur fond sombre
- Encadré blanc/coloré derrière le texte si nécessaire

#### Alignement

- Centre : pour titres et éléments principaux
- Gauche : pour paragraphes et listes
- Droite : pour dates et signatures
- Justifié : pour longs paragraphes

### 5. Vérification du Template

Avant de télécharger le template dans l'application :

**✅ Checklist :**
- [ ] L'image de fond est correctement positionnée
- [ ] Le texte est lisible sur l'image
- [ ] Les variables utilisent la syntaxe `{{variable}}`
- [ ] Aucune variable n'a d'espaces : ❌ `{{ nom }}` → ✅ `{{nom}}`
- [ ] Les zones de texte n'ont pas de bordure/fond visible
- [ ] Le document s'affiche correctement dans Word
- [ ] La taille du fichier est raisonnable (< 5 MB)

### 6. Upload dans l'Application

1. Enregistrez votre document DOCX
2. Allez dans votre projet > **Templates**
3. Cliquez sur **Nouveau Template**
4. Uploadez votre fichier DOCX
5. L'application détecte automatiquement les variables `{{...}}`
6. Vérifiez la liste des variables détectées
7. Cliquez sur **Créer le Template**

### 7. Test de Génération

1. Allez dans **Génération**
2. Sélectionnez votre template
3. Importez des données de test (CSV/Excel)
4. Mappez les colonnes aux variables
5. Prévisualisez le rendu
6. Choisissez le format de sortie :
   - **DOCX** : conserve le format Word éditable
   - **PDF** : conversion avec préservation de la mise en page
7. Générez les documents

## 🎨 Exemples de Templates

### Exemple 1 : Certificat de Participation

```
┌─────────────────────────────────────────┐
│   [IMAGE DE FOND: cadre décoratif]      │
│                                          │
│        CERTIFICAT DE PARTICIPATION       │
│                                          │
│         Décerné à {{nom_complet}}       │
│                                          │
│   Pour avoir participé à {{evenement}}  │
│                                          │
│   Le {{date}}                            │
│                                          │
│   Signature: {{signature}}               │
└─────────────────────────────────────────┘
```

### Exemple 2 : Badge d'Identification

```
┌──────────────────────┐
│  [LOGO EN HAUT]      │
│  [PHOTO: {{photo}}]  │
│                      │
│  {{prenom}}          │
│  {{nom}}             │
│                      │
│  {{fonction}}        │
│  {{service}}         │
│                      │
│  [QR CODE: {{id}}]   │
└──────────────────────┘
```

### Exemple 3 : Lettre Personnalisée

```
┌─────────────────────────────────────┐
│  [EN-TÊTE avec logo et adresse]     │
│                                     │
│  {{destinataire_nom}}               │
│  {{destinataire_adresse}}           │
│                                     │
│  Objet : {{objet}}                  │
│                                     │
│  Madame, Monsieur {{nom}},          │
│                                     │
│  {{corps_lettre}}                   │
│                                     │
│  Cordialement,                      │
│  {{expediteur}}                     │
│                                     │
│  [PIED DE PAGE avec coordonnées]    │
└─────────────────────────────────────┘
```

## 🐛 Problèmes Courants

### Le texte n'apparaît pas sur l'image

**Cause :** L'image n'est pas en arrière-plan  
**Solution :**
1. Clic droit sur l'image
2. **Habillage du texte > Derrière le texte**

### Les variables ne sont pas détectées

**Cause :** Syntaxe incorrecte  
**Solution :**
- ✅ `{{variable}}`
- ❌ `{ {variable} }`
- ❌ `{{ variable }}`
- ❌ `{variable}`

### L'image est déformée dans le PDF

**Cause :** Proportions incorrectes  
**Solution :**
1. Utilisez une image aux proportions du format de page
2. Dans Word : Clic droit > **Taille et position**
3. Décochez **Verrouiller les proportions** si besoin
4. Ajustez pour remplir la page

### Le texte est déplacé dans le PDF

**Cause :** Zones de texte non ancrées  
**Solution :**
1. Clic droit sur la zone de texte
2. **Taille et position > Position**
3. Cochez **Ancrer** et choisissez **À la page**

### Les images ne s'affichent pas dans le PDF

**Cause :** Images trop volumineuses ou format non supporté  
**Solution :**
1. Compressez les images : **Fichier > Compresser les images**
2. Utilisez PNG ou JPEG
3. Limitez à 300 DPI maximum

### La police n'est pas préservée

**Cause :** Police non standard  
**Solution :**
1. Utilisez des polices standards : Arial, Times New Roman, Calibri
2. Ou intégrez les polices : **Fichier > Options > Enregistrement > Incorporer les polices**

## 💡 Conseils et Astuces

### Optimiser la Taille du Fichier

1. **Compresser les images**
   - Word : Fichier > Compresser les images
   - Choisir 150 DPI pour les documents numériques

2. **Supprimer les métadonnées**
   - Fichier > Informations > Inspecter le document
   - Supprimer les informations personnelles

3. **Enregistrer en mode "Compatibilité stricte"**
   - Fichier > Enregistrer sous
   - Type : Document Word (.docx)

### Créer des Modèles Réutilisables

1. Créez un template de base avec votre image de fond
2. Enregistrez-le comme **Modèle Word (.dotx)**
3. Dupliquez-le pour créer des variantes
4. Conservez une version master non modifiée

### Tester sur Différents Formats

1. Testez avec format A4 et Letter
2. Testez en Portrait et Paysage
3. Testez la conversion PDF avant le déploiement
4. Vérifiez sur mobile et desktop

### Variables Dynamiques Avancées

Pour des transformations de texte :
- `{{nom}}` → texte normal
- Pour majuscules : convertir côté serveur avant génération
- Pour dates formatées : utiliser des formats standards ISO

## 📱 Support Multi-langues

Pour des templates multi-langues :

```
Template FR :
Bonjour {{prenom}},
Votre certificat pour {{evenement}}.

Template EN :
Hello {{firstname}},
Your certificate for {{event}}.

Template ES :
Hola {{nombre}},
Tu certificado para {{evento}}.
```

Créez un template par langue ou utilisez des variables de traduction.

## 🔐 Bonnes Pratiques de Sécurité

1. **Ne jamais inclure de données sensibles dans le template**
   - ❌ Pas de mots de passe en clair
   - ❌ Pas de clés API
   - ❌ Pas d'informations confidentielles

2. **Valider les données avant injection**
   - L'application gère cela automatiquement
   - Les variables sont échappées

3. **Limiter l'accès aux templates**
   - Seul le propriétaire du projet peut modifier les templates
   - Les templates sont privés par défaut

## 📞 Besoin d'Aide ?

Si vous rencontrez des problèmes :

1. Consultez la [documentation complète](./DOCX_TO_PDF_IMPROVEMENTS.md)
2. Vérifiez les logs de conversion dans l'interface
3. Testez avec un template simplifié d'abord
4. Contactez le support avec :
   - Le fichier DOCX problématique
   - Les données de test
   - Une capture d'écran du résultat obtenu vs. attendu

---

**Dernière mise à jour :** 2 novembre 2025  
**Version :** 1.0

