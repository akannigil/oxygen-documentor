# Documentation Oxygen Document

## 📚 Vue d'Ensemble

Cette documentation couvre les aspects techniques et les guides d'utilisation de l'application Oxygen Document.

## 📁 Structure de la Documentation

### 🔧 Documentation Technique

- **[DOCX_TO_PDF_IMPROVEMENTS.md](./DOCX_TO_PDF_IMPROVEMENTS.md)**
  - Améliorations apportées à la conversion DOCX vers PDF
  - Détails techniques de l'implémentation
  - Résolution du problème de positionnement du texte sur les images de fond
  - Guide de debugging et optimisations

### 📖 Guides Utilisateurs

- **[GUIDE_TEMPLATES_DOCX_IMAGES.md](./GUIDE_TEMPLATES_DOCX_IMAGES.md)**
  - Guide complet pour créer des templates DOCX avec images de fond
  - Étapes pas à pas avec captures d'écran
  - Exemples de templates (certificats, badges, lettres)
  - Résolution des problèmes courants
  - Bonnes pratiques et conseils

### 📋 Autres Documents

- **[ANALYSE_PUBLIPOSTAGE_FORMATS.md](../ANALYSE_PUBLIPOSTAGE_FORMATS.md)** (si existant)
  - Analyse des différents formats de documents supportés
- **[REPONSE_PERSONNALISATION.md](../REPONSE_PERSONNALISATION.md)** (si existant)
  - Guide de personnalisation des templates

- **[TEMPLATE_CUSTOMIZATION_GUIDE.md](../TEMPLATE_CUSTOMIZATION_GUIDE.md)** (si existant)
  - Guide de customisation avancée

## 🎯 Cas d'Usage Principaux

### 1. Génération de Certificats

**Problème résolu :** Texte déplacé en bas de page lors de la conversion PDF

**Solution :** Utilisation de la conversion DOCX vers PDF améliorée avec :

- Détection automatique des images de fond
- Préservation du positionnement absolu du texte
- Support des zones de texte superposées

**Voir :** [GUIDE_TEMPLATES_DOCX_IMAGES.md](./GUIDE_TEMPLATES_DOCX_IMAGES.md) - Section "Certificat de Participation"

### 2. Création de Badges

**Fonctionnalités :**

- Image de fond personnalisée
- Texte et variables superposés
- Support des QR codes (à venir)

**Voir :** [GUIDE_TEMPLATES_DOCX_IMAGES.md](./GUIDE_TEMPLATES_DOCX_IMAGES.md) - Section "Badge d'Identification"

### 3. Lettres Personnalisées

**Fonctionnalités :**

- En-têtes et pieds de page avec logos
- Variables de personnalisation
- Mise en forme professionnelle

**Voir :** [GUIDE_TEMPLATES_DOCX_IMAGES.md](./GUIDE_TEMPLATES_DOCX_IMAGES.md) - Section "Lettre Personnalisée"

## 🚀 Démarrage Rapide

### Pour les Utilisateurs

1. **Créer un Template**
   - Lire : [GUIDE_TEMPLATES_DOCX_IMAGES.md](./GUIDE_TEMPLATES_DOCX_IMAGES.md)
   - Suivre les étapes 1 à 7
   - Tester la génération

2. **Résoudre des Problèmes**
   - Consulter la section "Problèmes Courants"
   - Vérifier les logs de conversion
   - Contacter le support si nécessaire

### Pour les Développeurs

1. **Comprendre l'Architecture**
   - Lire : [DOCX_TO_PDF_IMPROVEMENTS.md](./DOCX_TO_PDF_IMPROVEMENTS.md)
   - Examiner le code dans `lib/converters/docx-to-pdf.ts`
   - Étudier les fonctions principales

2. **Déboguer des Problèmes**
   - Activer les logs de debugging
   - Examiner le HTML généré
   - Tester dans un navigateur

3. **Contribuer**
   - Suivre les standards TypeScript du projet
   - Écrire des tests pour les nouvelles fonctionnalités
   - Documenter les changements

## 🔍 Index des Fonctionnalités

### Conversion de Documents

| Fonctionnalité               | Status      | Documentation                                                |
| ---------------------------- | ----------- | ------------------------------------------------------------ |
| DOCX → PDF                   | ✅ Amélioré | [DOCX_TO_PDF_IMPROVEMENTS.md](./DOCX_TO_PDF_IMPROVEMENTS.md) |
| PDF → PDF (avec variables)   | ✅ Stable   | À documenter                                                 |
| Image → PDF (avec variables) | ✅ Stable   | À documenter                                                 |
| Support images de fond       | ✅ Nouveau  | [DOCX_TO_PDF_IMPROVEMENTS.md](./DOCX_TO_PDF_IMPROVEMENTS.md) |
| Positionnement absolu        | ✅ Nouveau  | [DOCX_TO_PDF_IMPROVEMENTS.md](./DOCX_TO_PDF_IMPROVEMENTS.md) |

### Templates

| Fonctionnalité                      | Status      | Documentation                                                      |
| ----------------------------------- | ----------- | ------------------------------------------------------------------ |
| Variables `{{var}}`                 | ✅ Stable   | [GUIDE_TEMPLATES_DOCX_IMAGES.md](./GUIDE_TEMPLATES_DOCX_IMAGES.md) |
| Détection automatique des variables | ✅ Stable   | [GUIDE_TEMPLATES_DOCX_IMAGES.md](./GUIDE_TEMPLATES_DOCX_IMAGES.md) |
| Images de fond                      | ✅ Nouveau  | [GUIDE_TEMPLATES_DOCX_IMAGES.md](./GUIDE_TEMPLATES_DOCX_IMAGES.md) |
| Zones de texte                      | ✅ Nouveau  | [GUIDE_TEMPLATES_DOCX_IMAGES.md](./GUIDE_TEMPLATES_DOCX_IMAGES.md) |
| QR Codes                            | 🚧 En cours | À venir                                                            |
| Codes-barres                        | 📋 Planifié | À venir                                                            |

### Import de Données

| Fonctionnalité          | Status    | Documentation |
| ----------------------- | --------- | ------------- |
| Import CSV              | ✅ Stable | À documenter  |
| Import Excel            | ✅ Stable | À documenter  |
| Mapping automatique     | ✅ Stable | À documenter  |
| Validation des données  | ✅ Stable | À documenter  |
| Aperçu avant génération | ✅ Stable | À documenter  |

### Génération en Masse

| Fonctionnalité            | Status      | Documentation                                                |
| ------------------------- | ----------- | ------------------------------------------------------------ |
| Génération par lot (≤100) | ✅ Stable   | À documenter                                                 |
| Génération asynchrone     | ✅ Stable   | À documenter                                                 |
| Suivi de progression      | ✅ Stable   | À documenter                                                 |
| Gestion des erreurs       | ✅ Amélioré | [DOCX_TO_PDF_IMPROVEMENTS.md](./DOCX_TO_PDF_IMPROVEMENTS.md) |

## ⚙️ Configuration Technique

### Variables d'Environnement

```env
# Base de données
DATABASE_URL="postgresql://..."

# Stockage (local ou S3)
STORAGE_TYPE="local" # ou "s3"
LOCAL_STORAGE_PATH="./uploads"

# S3 (si STORAGE_TYPE=s3)
S3_BUCKET="bucket-name"
S3_REGION="eu-west-1"
S3_ACCESS_KEY_ID="..."
S3_SECRET_ACCESS_KEY="..."

# Email (optionnel)
EMAIL_FROM="noreply@example.com"
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="..."
SMTP_PASSWORD="..."
```

### Dépendances Clés

```json
{
  "mammoth": "^1.11.0", // Conversion DOCX → HTML
  "puppeteer": "^24.27.0", // Génération PDF
  "docxtemplater": "^3.67.1", // Templates DOCX
  "pizzip": "^3.2.0", // Extraction ZIP (DOCX)
  "pdf-lib": "^1.17.1", // Manipulation PDF
  "qrcode": "^1.5.3" // Génération QR codes
}
```

## 🐛 Signalement de Bugs

Pour signaler un bug :

1. Vérifiez qu'il n'est pas déjà documenté dans "Problèmes Courants"
2. Rassemblez les informations suivantes :
   - Description du problème
   - Fichier template (si possible)
   - Données de test
   - Résultat obtenu vs. attendu
   - Logs d'erreur
3. Créez une issue avec toutes ces informations

## 📊 Métriques et Performance

### Temps de Conversion Moyens

| Type                   | Taille | Temps Moyen  |
| ---------------------- | ------ | ------------ |
| DOCX → PDF simple      | < 1 MB | 2-3 secondes |
| DOCX → PDF avec images | 1-5 MB | 3-5 secondes |
| PDF avec variables     | < 1 MB | 1-2 secondes |
| Image → PDF            | < 5 MB | 1-2 secondes |

### Limites Recommandées

| Ressource                           | Limite |
| ----------------------------------- | ------ |
| Taille fichier template             | 10 MB  |
| Nombre de variables par template    | 100    |
| Documents par génération            | 100    |
| Taille totale des données CSV/Excel | 50 MB  |

## 🔄 Historique des Versions

### Version 2.0 - 2 Novembre 2025

**Nouvelles Fonctionnalités :**

- ✅ Support des images de fond dans DOCX → PDF
- ✅ Préservation du positionnement absolu du texte
- ✅ Détection automatique des images de fond
- ✅ Amélioration de la conversion HTML avec CSS optimisé
- ✅ JavaScript de repositionnement dans Puppeteer
- ✅ Logs de debugging détaillés

**Corrections :**

- ✅ Résolution du problème de texte déplacé en bas de page
- ✅ Amélioration du chargement des images
- ✅ Optimisation des délais de conversion

**Documentation :**

- ✅ [DOCX_TO_PDF_IMPROVEMENTS.md](./DOCX_TO_PDF_IMPROVEMENTS.md) - Documentation technique
- ✅ [GUIDE_TEMPLATES_DOCX_IMAGES.md](./GUIDE_TEMPLATES_DOCX_IMAGES.md) - Guide utilisateur

### Version 1.0 - Date Antérieure

**Fonctionnalités Initiales :**

- Génération de documents PDF depuis templates
- Support des variables dynamiques
- Import CSV/Excel
- Génération en masse
- Templates DOCX, PDF, et Images

## 📞 Support

### Documentation

- [Documentation Technique](./DOCX_TO_PDF_IMPROVEMENTS.md)
- [Guide Utilisateur](./GUIDE_TEMPLATES_DOCX_IMAGES.md)

### Communauté

- Issues GitHub
- Discussions
- Wiki (à venir)

### Contact

Pour toute question ou assistance, contactez l'équipe de développement.

---

**Dernière mise à jour :** 2 Novembre 2025  
**Version de la documentation :** 2.0
