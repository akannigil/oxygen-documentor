# 📚 Documentation QR Code - Index Complet

Bienvenue dans la documentation des QR Codes pour Oxygen Document.

---

## 🚀 Par où commencer ?

### Je débute avec les QR Codes

➡️ **[Référence Rapide QR Code](./QRCODE_QUICK_REFERENCE.md)**

- Guide visuel en 2 minutes
- Schémas explicatifs
- Comparaison PDF/Image vs DOCX

### Je veux intégrer des QR Codes dans mes documents

➡️ **[Guide d'Intégration par Type de Template](./GUIDE_INTEGRATION_QRCODE_PAR_TYPE.md)**

- Processus étape par étape pour PDF/Image
- Processus étape par étape pour DOCX
- Exemples de code complets
- Bonnes pratiques

### Je veux sécuriser mes certificats

➡️ **[Authentification des Certificats](./GUIDE_AUTHENTIFICATION_CERTIFICATS.md)**

- QR Codes avec signature cryptographique
- JWT et validation
- Configuration de la vérification
- Exemples d'intégration

### Je veux tout savoir sur les QR Codes

➡️ **[Guide Complet des QR Codes](./GUIDE_QR_CODES.md)**

- Documentation technique complète
- Toutes les options disponibles
- API et fonctions
- Cas d'usage avancés

---

## 📖 Documentation par Sujet

### 🎨 Éditeur Visuel (PDF/Image)

**Fichier** : [README_QRCODE_EDITOR](../components/template-editor/README_QRCODE_EDITOR.md)

**Contenu** :

- Utilisation de l'éditeur visuel
- Configuration des options QR Code
- Types TypeScript
- Dépannage

**À lire si** :

- Vous utilisez des templates PDF ou Image
- Vous voulez une interface graphique pour configurer les QR Codes
- Vous avez besoin de positionner précisément les QR Codes

---

### 📄 Templates DOCX

**Fichier** : [Guide d'Intégration - Section DOCX](./GUIDE_INTEGRATION_QRCODE_PAR_TYPE.md#templates-docx-placeholders)

**Contenu** :

- Syntaxe des placeholders `{{qrcode_xxx}}`
- Configuration via l'API `generateDOCX()`
- Exemples de templates Word
- QR Codes multiples

**À lire si** :

- Vous utilisez des templates Word (.docx)
- Vous avez déjà des documents Word avec variables
- Vous préférez une approche programmatique

---

### 🔒 Sécurité et Authentification

**Fichier** : [Authentification des Certificats](./GUIDE_AUTHENTIFICATION_CERTIFICATS.md)

**Contenu** :

- Signature cryptographique (HMAC SHA-256)
- JWT et tokens
- Hash du document
- Vérification en ligne
- Configuration de production

**À lire si** :

- Vous générez des certificats officiels
- Vous devez prouver l'authenticité des documents
- Vous voulez empêcher la falsification
- Vous avez besoin de traçabilité

---

### 🎨 Personnalisation Visuelle

**Fichiers** :

- [Guide Complet QR Codes - Section Personnalisation](./GUIDE_QR_CODES.md)
- [Référence Rapide - Options](./QRCODE_QUICK_REFERENCE.md#-options-des-qr-codes)

**Contenu** :

- Couleurs personnalisées
- Tailles et marges
- Niveaux de correction d'erreur
- Exemples visuels

**À lire si** :

- Vous voulez adapter les QR Codes à votre charte graphique
- Vous avez besoin de QR Codes colorés
- Vous optimisez la taille ou la résistance

---

### ⚙️ Configuration Avancée

**Fichier** : [Configuration des Certificats](./CONFIGURATION_CERTIFICATS.md)

**Contenu** :

- Variables d'environnement
- Secrets et clés
- Configuration de production
- Monitoring et logs

**À lire si** :

- Vous déployez en production
- Vous configurez l'infrastructure
- Vous gérez les secrets et la sécurité
- Vous avez besoin de monitoring

---

### 📊 API et Développement

**Fichiers** :

- [Guide Complet QR Codes - API](./GUIDE_QR_CODES.md)
- [Workflow d'intégration](./INTEGRATION_WORKFLOW_CERTIFICATS.md)

**Contenu** :

- Fonctions et méthodes disponibles
- Paramètres et types TypeScript
- Workflow de génération
- Exemples d'intégration

**À lire si** :

- Vous développez sur Oxygen Document
- Vous créez des intégrations personnalisées
- Vous avez besoin de la référence technique complète
- Vous déboguez du code

---

## 🎯 Documentation par Cas d'Usage

### Cas 1 : Badge d'événement simple

**Besoin** : Badge avec QR Code contenant un ID unique

**Documents à lire** :

1. [Référence Rapide](./QRCODE_QUICK_REFERENCE.md) - 2 min
2. [Guide d'intégration - PDF/Image](./GUIDE_INTEGRATION_QRCODE_PAR_TYPE.md#templates-pdfimage-éditeur-visuel)

**Niveau de complexité** : ⭐ Facile

---

### Cas 2 : Certificat de formation avec QR Code simple

**Besoin** : Certificat PDF avec QR Code pointant vers une page de vérification

**Documents à lire** :

1. [Guide d'intégration - PDF/Image](./GUIDE_INTEGRATION_QRCODE_PAR_TYPE.md#templates-pdfimage-éditeur-visuel)
2. [Options des QR Codes](./QRCODE_QUICK_REFERENCE.md#-options-des-qr-codes)

**Niveau de complexité** : ⭐ Facile

---

### Cas 3 : Certificat officiel avec authentification

**Besoin** : Certificat authentifié avec QR Code sécurisé et vérification en ligne

**Documents à lire** :

1. [Guide d'intégration](./GUIDE_INTEGRATION_QRCODE_PAR_TYPE.md)
2. [Authentification des Certificats](./GUIDE_AUTHENTIFICATION_CERTIFICATS.md)
3. [Configuration](./CONFIGURATION_CERTIFICATS.md)

**Niveau de complexité** : ⭐⭐ Moyen

---

### Cas 4 : Documents Word multiples avec QR Codes

**Besoin** : Génération en masse de documents Word avec plusieurs QR Codes par document

**Documents à lire** :

1. [Guide d'intégration - DOCX](./GUIDE_INTEGRATION_QRCODE_PAR_TYPE.md#templates-docx-placeholders)
2. [Guide Complet - Génération DOCX](./GUIDE_QR_CODES.md)

**Niveau de complexité** : ⭐⭐ Moyen

---

### Cas 5 : Système complet de certification avec vérification

**Besoin** : Infrastructure complète de génération, signature, vérification et monitoring

**Documents à lire** :

1. [Authentification des Certificats](./GUIDE_AUTHENTIFICATION_CERTIFICATS.md)
2. [Configuration](./CONFIGURATION_CERTIFICATS.md)
3. [Workflow d'intégration](./INTEGRATION_WORKFLOW_CERTIFICATS.md)
4. [Guide Complet](./GUIDE_QR_CODES.md)

**Niveau de complexité** : ⭐⭐⭐ Avancé

---

## 📋 Checklist d'Implémentation

### Pour PDF/Image avec QR Code simple

- [ ] Template préparé (PDF, PNG ou JPG)
- [ ] Projet créé dans Oxygen Document
- [ ] Template importé
- [ ] Zone QR Code dessinée dans l'éditeur
- [ ] Type changé en "QR Code"
- [ ] Nom du champ défini
- [ ] Options configurées (optionnel)
- [ ] Test de génération effectué
- [ ] QR Code scanné et vérifié

### Pour DOCX avec QR Code simple

- [ ] Template DOCX préparé
- [ ] Placeholders ajoutés (`{{qrcode_xxx}}`)
- [ ] Code de génération écrit
- [ ] Configuration `qrcodes` définie
- [ ] Options `qrcodeOptions` configurées
- [ ] Test de génération effectué
- [ ] QR Code scanné et vérifié

### Pour Certificat avec Authentification

- [ ] Tous les items du QR Code simple ✅
- [ ] Variable `CERTIFICATE_SECRET_KEY` définie
- [ ] URL de vérification configurée
- [ ] Page de vérification créée/déployée
- [ ] Champs du certificat mappés
- [ ] `includeDocumentHash` activé
- [ ] Tests de signature effectués
- [ ] Tests de vérification effectués
- [ ] Logs et monitoring configurés
- [ ] Sauvegarde de la clé secrète sécurisée

---

## 🔧 Outils de Développement

### Tests en ligne

**Lecteurs de QR Code** :

- QR Code Reader (iOS/Android)
- Google Lens
- Application Appareil Photo (iPhone)
- [ZXing Online Decoder](https://zxing.org/w/decode.jspx) - Test web

**Générateurs de test** :

- [QR Code Generator](https://www.qr-code-generator.com/)
- [QRCode Monkey](https://www.qrcode-monkey.com/)

### Outils de développement

**Dans le projet** :

```bash
# Prisma Studio (base de données)
npm run db:studio

# Logs de développement
npm run dev

# Tests
npm test
```

**Débogage QR Code** :

- Activer les logs dans `lib/qrcode/`
- Vérifier les données avant génération
- Tester avec différents niveaux de correction
- Vérifier les couleurs et le contraste

---

## 🆘 Support et Dépannage

### Problèmes courants

| Problème                 | Solution                          | Documentation                                                                    |
| ------------------------ | --------------------------------- | -------------------------------------------------------------------------------- |
| QR Code non scannable    | Vérifier contraste et taille      | [Référence Rapide](./QRCODE_QUICK_REFERENCE.md)                                  |
| Authentification échoue  | Vérifier `CERTIFICATE_SECRET_KEY` | [Configuration](./CONFIGURATION_CERTIFICATS.md)                                  |
| Placeholder non remplacé | Vérifier syntaxe `{{xxx}}`        | [Guide DOCX](./GUIDE_INTEGRATION_QRCODE_PAR_TYPE.md#templates-docx-placeholders) |
| Token expiré             | Ajuster `expiresIn`               | [Authentification](./GUIDE_AUTHENTIFICATION_CERTIFICATS.md)                      |

### Ressources additionnelles

**Dans le code** :

- Types TypeScript : `shared/types/index.ts`
- Schémas Zod : `shared/schemas/template.ts`
- Générateur : `lib/qrcode/generator.ts`
- Intégration : `lib/qrcode/workflow-integration.ts`

**Documentation externe** :

- [QR Code Specification](https://www.qrcode.com/en/about/standards.html)
- [JWT.io](https://jwt.io/) - Décodeur JWT
- [PDF-lib Documentation](https://pdf-lib.js.org/)
- [Docxtemplater Documentation](https://docxtemplater.com/)

---

## 📝 Plan de Lecture Recommandé

### Débutant (30 minutes)

1. **[Référence Rapide](./QRCODE_QUICK_REFERENCE.md)** - 5 min
   - Vue d'ensemble visuelle
   - Comprendre les différences PDF/DOCX

2. **[Guide d'Intégration - Votre type](./GUIDE_INTEGRATION_QRCODE_PAR_TYPE.md)** - 20 min
   - Section PDF/Image OU Section DOCX
   - Suivre les étapes

3. **Test pratique** - 5 min
   - Créer votre premier QR Code
   - Scanner et tester

### Intermédiaire (1 heure)

1. Révision du parcours débutant
2. **[Guide Complet QR Codes](./GUIDE_QR_CODES.md)** - 30 min
   - Options avancées
   - Personnalisation
3. **[Authentification des Certificats](./GUIDE_AUTHENTIFICATION_CERTIFICATS.md)** - 20 min
   - Concepts de sécurité
   - Workflow de vérification
4. **Tests avancés** - 10 min
   - QR Code avec authentification
   - Vérification en ligne

### Avancé (2 heures)

1. Révision des parcours précédents
2. **[Configuration](./CONFIGURATION_CERTIFICATS.md)** - 30 min
3. **[Workflow d'intégration](./INTEGRATION_WORKFLOW_CERTIFICATS.md)** - 30 min
4. **Code source** - 30 min
   - Explorer `lib/qrcode/`
   - Comprendre les générateurs
5. **Implémentation personnalisée** - 30 min
   - Créer votre propre intégration

---

## 🔄 Mises à Jour

**Version actuelle** : 1.0  
**Dernière mise à jour** : 2025-01-15

### Historique des versions

- **v1.0** (2025-01-15) : Documentation initiale complète
  - Guide d'intégration par type
  - Référence rapide
  - Documentation éditeur
  - Index complet

### Prochaines améliorations

- [ ] Vidéos tutoriels
- [ ] Exemples interactifs
- [ ] Templates prêts à l'emploi
- [ ] FAQ étendue

---

## 📬 Contribuer

Pour améliorer cette documentation :

1. Identifier les sections manquantes ou peu claires
2. Proposer des exemples supplémentaires
3. Partager vos cas d'usage
4. Signaler les erreurs ou incohérences

---

**Navigation rapide** : [Haut de page](#-documentation-qr-code---index-complet)
