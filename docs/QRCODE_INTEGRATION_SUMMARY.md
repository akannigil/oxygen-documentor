# 🚀 QR Code - Résumé d'Intégration

Guide de référence rapide pour l'intégration des QR Codes dans Oxygen Document.

---

## 📊 Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    OXYGEN DOCUMENT - QR CODES                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Types de Templates Supportés :                                         │
│                                                                          │
│  ┌──────────────────────────┐      ┌──────────────────────────┐       │
│  │   PDF / Image            │      │   DOCX (Word)            │       │
│  │   (PNG, JPG, PDF)        │      │   (.docx)                │       │
│  ├──────────────────────────┤      ├──────────────────────────┤       │
│  │  • Éditeur Visuel        │      │  • Placeholders texte    │       │
│  │  • Dessiner zones        │      │  • {{qrcode_xxx}}        │       │
│  │  • Interface graphique   │      │  • Configuration code    │       │
│  │  • Position fixe         │      │  • Position dynamique    │       │
│  └──────────────────────────┘      └──────────────────────────┘       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Choix Rapide

```
┌──────────────────────────────────────────────────┐
│ J'ai un fichier PDF ou image de certificat      │ → PDF/IMAGE
│ avec position fixe pour le QR Code              │   (Éditeur Visuel)
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ J'ai un document Word (.docx) existant avec     │ → DOCX
│ des variables {{xxx}}                            │   (Placeholders)
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ Je préfère une interface visuelle point & click │ → PDF/IMAGE
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ Je préfère configurer par code/API              │ → DOCX
└──────────────────────────────────────────────────┘
```

---

## ⚡ Démarrage Rapide

### Option A : PDF/Image (3 étapes)

```
1️⃣ DESSINER
   ├─ Ouvrir l'éditeur de template
   ├─ Cliquer et glisser pour créer une zone
   └─ Relâcher

2️⃣ CONFIGURER
   ├─ Sélectionner le champ créé
   ├─ Changer le type → "QR Code"
   └─ Donner un nom (ex: qrcode_verification)

3️⃣ OPTIONS (optionnel)
   ├─ Niveau correction erreur : M
   ├─ Marge : 2
   ├─ Couleurs personnalisées
   └─ Authentification (avancé)

✅ TERMINÉ !
```

### Option B : DOCX (2 étapes)

```
1️⃣ TEMPLATE WORD
   Dans votre document Word :

   Nom: {{nom}}
   Prénom: {{prenom}}

   QR Code de vérification :
   {{qrcode_verification}}    ← Placeholder QR Code

   Sauvegarder en .docx

2️⃣ CODE DE GÉNÉRATION

   import { generateDOCX } from '@/lib/generators/docx'

   const buffer = await generateDOCX(templateBuffer, {
     variables: {
       nom: 'Dupont',
       prenom: 'Jean'
     },
     qrcodes: {
       '{{qrcode_verification}}': 'https://verify.example.com/123'
     },
     qrcodeOptions: {
       width: 200,
       errorCorrectionLevel: 'M'
     }
   })

✅ TERMINÉ !
```

---

## 📚 Documentation Complète

### 🏁 Pour commencer

| Document                                                               | Description                      | Durée  |
| ---------------------------------------------------------------------- | -------------------------------- | ------ |
| **[Référence Rapide](./docs/QRCODE_QUICK_REFERENCE.md)**               | Guide visuel avec schémas        | 2 min  |
| **[Guide d'Intégration](./docs/GUIDE_INTEGRATION_QRCODE_PAR_TYPE.md)** | Tutoriel complet étape par étape | 20 min |

### 🎓 Pour approfondir

| Document                                                                         | Description                      | Public       |
| -------------------------------------------------------------------------------- | -------------------------------- | ------------ |
| **[Guide Complet QR Codes](./docs/GUIDE_QR_CODES.md)**                           | Documentation technique complète | Développeurs |
| **[Authentification Certificats](./docs/GUIDE_AUTHENTIFICATION_CERTIFICATS.md)** | QR Codes sécurisés avec JWT      | Avancé       |
| **[Configuration](./docs/CONFIGURATION_CERTIFICATS.md)**                         | Variables env, secrets, prod     | DevOps       |

### 📖 Documentation spécialisée

| Document                                                                   | Description                  | Cible        |
| -------------------------------------------------------------------------- | ---------------------------- | ------------ |
| **[Éditeur Visuel](./components/template-editor/README_QRCODE_EDITOR.md)** | Utilisation de l'interface   | Utilisateurs |
| **[Index Complet](./docs/INDEX_QRCODE.md)**                                | Navigation dans toute la doc | Tous         |

---

## 🔑 Concepts Clés

### Niveau de Correction d'Erreur

```
┌───────┬──────────┬─────────────────────────┐
│ Code  │ Capacité │ Usage                   │
├───────┼──────────┼─────────────────────────┤
│ L     │ 7%       │ QR simples, bon état    │
│ M     │ 15%      │ Usage général (défaut)  │
│ Q     │ 25%      │ Certificats officiels   │
│ H     │ 30%      │ Conditions difficiles   │
└───────┴──────────┴─────────────────────────┘
```

### Tailles Recommandées

```
┌──────────────┬──────────┬─────────────────────┐
│ Type         │ Taille   │ Usage               │
├──────────────┼──────────┼─────────────────────┤
│ Minimum      │ 100×100  │ Tests uniquement    │
│ Standard     │ 150×150  │ Documents A4        │
│ Recommandé   │ 200×200  │ Certificats         │
│ Grand        │ 250×250  │ Posters, affichage  │
└──────────────┴──────────┴─────────────────────┘
```

### Authentification (Avancé)

```
┌─────────────────────────────────────────────┐
│ QR Code Simple                              │
├─────────────────────────────────────────────┤
│ Contenu: URL directe                        │
│ https://verify.example.com/cert/123         │
│                                             │
│ ✅ Simple                                   │
│ ❌ Pas de sécurité                          │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ QR Code Authentifié                         │
├─────────────────────────────────────────────┤
│ Contenu: JWT signé                          │
│ https://verify.example.com?token=eyJ...     │
│                                             │
│ ✅ Sécurisé (signature HMAC)                │
│ ✅ Anti-falsification                       │
│ ✅ Traçabilité                              │
│ ✅ Expiration configurable                  │
└─────────────────────────────────────────────┘
```

---

## 🎨 Exemples Visuels

### PDF/Image : Interface de l'éditeur

```
┌────────────────────────────────────────────────────────────────┐
│  Éditeur de Template                                           │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────┐    ┌──────────────────────────┐ │
│  │ Template                 │    │ Propriétés               │ │
│  │                          │    │                          │ │
│  │  CERTIFICAT              │    │ Clé: qrcode_verify       │ │
│  │                          │    │                          │ │
│  │  Nom: _______________    │    │ Type:                    │ │
│  │                          │    │ ┌──────────────────┐    │ │
│  │  Date: ______________    │    │ │ QR Code      ▼   │    │ │
│  │                          │    │ └──────────────────┘    │ │
│  │          ┌────────┐      │    │                          │ │
│  │          │  QR ◄──┼──────┼────┼─ Sélectionné           │ │
│  │          └────────┘      │    │                          │ │
│  │                          │    │ Options:                 │ │
│  │  Signature: _________    │    │ ☑ Authentification       │ │
│  │                          │    │ URL: verify.com          │ │
│  └─────────────────────────┘    │ Niveau: Q                │ │
│                                  │                          │ │
│  ☑ Grille  ☑ Aimanter           │ [Supprimer le champ]     │ │
│                                  └──────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

### DOCX : Template Word

```
╔════════════════════════════════════════════════════╗
║          CERTIFICAT DE FORMATION                   ║
╠════════════════════════════════════════════════════╣
║                                                    ║
║  Certifie que {{nom}} {{prenom}}                  ║  ← Variables normales
║                                                    ║
║  a suivi avec succès la formation :               ║
║  {{title}}                                        ║
║                                                    ║
║  Date d'obtention : {{date}}                      ║
║  Note : {{grade}}                                 ║
║                                                    ║
║  ─────────────────────────────────────            ║
║                                                    ║
║  Pour vérifier l'authenticité de ce certificat,   ║
║  scannez ce QR Code :                             ║
║                                                    ║
║         {{qrcode_verification}}                   ║  ← Placeholder QR Code
║                                                    ║
║  ─────────────────────────────────────            ║
║                                                    ║
║  Signature : {{issuer}}                           ║
║                                                    ║
╚════════════════════════════════════════════════════╝
```

---

## ✅ Checklist de Production

### Avant de déployer

```
Configuration
├─ ☐ CERTIFICATE_SECRET_KEY définie (32+ caractères)
├─ ☐ VERIFICATION_BASE_URL configurée
├─ ☐ URL de vérification accessible publiquement
└─ ☐ Sauvegarde sécurisée de la clé secrète

QR Code
├─ ☐ Taille minimale 150×150 px
├─ ☐ Niveau correction ≥ M (certificats: Q ou H)
├─ ☐ Contraste couleurs suffisant
└─ ☐ Marge ≥ 2 modules

Tests
├─ ☐ QR Code scannable (iOS + Android)
├─ ☐ Vérification fonctionne
├─ ☐ Token non expiré
├─ ☐ Hash document correct (si activé)
└─ ☐ Test avec plusieurs lecteurs QR

Monitoring
├─ ☐ Logs configurés
├─ ☐ Alertes en place
└─ ☐ Backup réguliers
```

---

## 🐛 Dépannage Express

| Symptôme                 | Cause Probable        | Solution Rapide                 |
| ------------------------ | --------------------- | ------------------------------- |
| QR Code illisible        | Contraste insuffisant | Noir #000000 / Blanc #FFFFFF    |
| QR Code non scanné       | Trop petit            | Minimum 150×150 px              |
| Token invalide           | Secret incorrect      | Vérifier CERTIFICATE_SECRET_KEY |
| Placeholder non remplacé | Syntaxe incorrecte    | Utiliser `{{qrcode_xxx}}`       |
| Erreur génération        | Données manquantes    | Vérifier toutes les variables   |

---

## 🔗 Liens Rapides

### Documentation

- 📖 [Guide Complet d'Intégration](./docs/GUIDE_INTEGRATION_QRCODE_PAR_TYPE.md)
- 🚀 [Référence Rapide Visuelle](./docs/QRCODE_QUICK_REFERENCE.md)
- 📚 [Index de Toute la Documentation](./docs/INDEX_QRCODE.md)

### Code Source

- Générateur : `lib/qrcode/generator.ts`
- Intégration DOCX : `lib/qrcode/docx-integration.ts`
- Workflow : `lib/qrcode/workflow-integration.ts`
- Types : `shared/types/index.ts`

### Outils en Ligne

- [ZXing Decoder](https://zxing.org/w/decode.jspx) - Tester QR Code
- [JWT.io](https://jwt.io/) - Décoder JWT
- [QR Code Generator](https://www.qr-code-generator.com/) - Tests

---

## 📞 Support

### Obtenir de l'aide

1. **Consulter la documentation**
   - [Index complet](./docs/INDEX_QRCODE.md)
   - [FAQ dans le guide complet](./docs/GUIDE_QR_CODES.md)

2. **Vérifier les logs**

   ```bash
   npm run dev
   # Regarder les logs dans la console
   ```

3. **Tester en isolation**
   - Générer un QR Code simple d'abord
   - Ajouter l'authentification ensuite
   - Valider étape par étape

---

## 🎓 Parcours d'Apprentissage

```
Débutant (30 min)
└─ Référence Rapide → Guide d'Intégration (section choisie) → Test pratique

Intermédiaire (1h)
└─ Parcours débutant → Guide Complet → Authentification → Tests avancés

Avancé (2h)
└─ Parcours intermédiaire → Configuration → Workflow → Code source → Custom
```

---

**Version** : 1.0  
**Dernière mise à jour** : 2025-01-15  
**Auteur** : Équipe Oxygen Document

---

**🚀 Prêt à commencer ?** → [Référence Rapide](./docs/QRCODE_QUICK_REFERENCE.md)
