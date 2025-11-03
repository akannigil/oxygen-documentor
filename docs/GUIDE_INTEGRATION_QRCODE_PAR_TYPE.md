# Guide d'Intégration des QR Codes par Type de Template

Ce guide explique comment intégrer et configurer des QR Codes selon le type de template utilisé dans Oxygen Document.

---

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Templates PDF/Image (Éditeur Visuel)](#templates-pdfimage-éditeur-visuel)
3. [Templates DOCX (Placeholders)](#templates-docx-placeholders)
4. [Tableau Comparatif](#tableau-comparatif)

---

## Vue d'ensemble

Oxygen Document supporte **deux approches différentes** pour intégrer des QR Codes selon le type de template :

| Type de Template | Méthode d'intégration | Configuration |
|------------------|----------------------|---------------|
| **PDF / Image** (PNG, JPG) | Éditeur visuel avec zones cliquables | Interface graphique |
| **DOCX** (Word) | Placeholders textuels `{{qrcode_xxx}}` | Programmation/API |

---

## Templates PDF/Image (Éditeur Visuel)

### 🎯 Cas d'usage
- Certificats avec QR Code à position fixe
- Badges avec QR Code
- Attestations formatées
- Documents basés sur des images template

### 📝 Processus d'intégration

#### Étape 1 : Créer votre projet et importer le template

1. **Créer un nouveau projet**
   - Aller dans "Projets" → "Nouveau projet"
   - Donner un nom à votre projet

2. **Importer votre template**
   - Format accepté : PDF, PNG, JPG
   - Cliquer sur "Importer un template"
   - Sélectionner votre fichier

#### Étape 2 : Définir la zone du QR Code

1. **Ouvrir l'éditeur de template**
   - Cliquer sur "Éditer le template"
   - Vous verrez votre template affiché dans l'éditeur visuel

2. **Dessiner la zone du QR Code**
   - **Cliquer et maintenir** le bouton de la souris
   - **Glisser** pour créer un rectangle à l'endroit désiré
   - **Relâcher** pour finaliser la zone
   
   ```
   ┌─────────────────────────────┐
   │  Votre Template             │
   │                             │
   │  [Nom]: {{nom}}             │
   │  [Date]: {{date}}           │
   │                             │
   │         ┌───────┐           │  ← Zone QR Code dessinée
   │         │  QR   │           │
   │         └───────┘           │
   └─────────────────────────────┘
   ```

3. **Le champ est créé automatiquement**
   - Type par défaut : "Texte"
   - Le panneau de propriétés s'affiche à droite

#### Étape 3 : Configurer le champ comme QR Code

Dans le **panneau de propriétés à droite** :

1. **Changer le type**
   - Sélectionner le menu déroulant "Type"
   - Choisir **"QR Code"**
   
   Les options de QR Code apparaissent automatiquement !

2. **Donner un nom au champ**
   ```
   Clé du champ: qrcode_verification
   ```

3. **Configurer les options du QR Code** (optionnel)

   #### 3.1 Options de base

   - **Niveau de correction d'erreur**
     - `L` (Low) - 7% : Plus petit QR Code
     - `M` (Medium) - 15% : **Recommandé par défaut**
     - `Q` (Quartile) - 25% : Meilleure résistance
     - `H` (High) - 30% : Maximum de résistance aux dommages

   - **Marge** (en modules)
     - Valeur recommandée : 1-4
     - Plus la marge est grande, plus le QR Code est lisible

   - **Couleurs**
     - Couleur foncée (modules) : Par défaut `#000000` (noir)
     - Couleur claire (fond) : Par défaut `#FFFFFF` (blanc)
     - ⚠️ Attention : contraste élevé nécessaire pour la lisibilité

   #### 3.2 Authentification de certificat (Avancé)

   Cochez **"Activer l'authentification"** pour sécuriser le QR Code :

   - **URL de vérification** : `https://monsite.com/verify`
   - **Durée de validité** : `315360000` (10 ans en secondes)
   - **Inclure le hash du document** : ☑ (recommandé pour sécurité maximale)

   **Champs du certificat à inclure :**
   ```
   ID Certificat: certificate_id
   Nom du titulaire: holder_name
   Titre: title
   Date d'émission: issue_date
   Émetteur: issuer
   ```

   #### 3.3 URL de stockage (Avancé)

   Cochez **"Intégrer l'URL de stockage"** pour créer un lien vers le document :

   - **Type d'URL**
     - `signed` : URL temporaire sécurisée (recommandé)
     - `public` : URL permanente publique

   - **Expiration** : `3600` secondes (1 heure)

#### Étape 4 : Sauvegarder

- Les modifications sont automatiquement sauvegardées
- Le template est prêt à être utilisé

### 🎨 Exemple de configuration complète

```typescript
// Le système génère automatiquement cette configuration :
{
  key: 'qrcode_verification',
  x: 450,
  y: 850,
  w: 150,
  h: 150,
  type: 'qrcode',
  qrcodeOptions: {
    errorCorrectionLevel: 'Q',
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  },
  qrcodeAuth: {
    enabled: true,
    verificationBaseUrl: 'https://certificates.example.com/verify',
    expiresIn: 315360000, // 10 ans
    includeDocumentHash: true,
    certificateFields: {
      certificateId: 'certificate_id',
      holderName: 'holder_name',
      title: 'title',
      issueDate: 'issue_date',
      issuer: 'issuer'
    }
  }
}
```

### 📊 Génération du document

Lors de la génération, passez les données :

```typescript
const data = {
  nom: 'Dupont',
  date: '2025-01-15',
  certificate_id: 'CERT-2025-001',
  holder_name: 'Jean Dupont',
  title: 'Certificat de Formation',
  issue_date: '2025-01-15',
  issuer: 'Formation Pro'
}

// Le QR Code sera automatiquement généré avec ces données
```

---

## Templates DOCX (Placeholders)

### 🎯 Cas d'usage
- Documents Word existants
- Templates avec mise en forme complexe
- Documents avec flux de texte dynamique
- Rapports, contrats, attestations Word

### 📝 Processus d'intégration

#### Étape 1 : Préparer votre template Word

1. **Ouvrir votre document Word**
2. **Insérer les placeholders de variables normales**
   ```
   Nom: {{nom}}
   Prénom: {{prenom}}
   Email: {{email}}
   Date: {{date}}
   ```

3. **Insérer le placeholder de QR Code**
   - Placez le curseur où vous voulez le QR Code
   - Tapez le placeholder : `{{qrcode_verification}}`
   
   Exemple complet :
   ```
   CERTIFICAT DE FORMATION
   
   Nom: {{nom}}
   Prénom: {{prenom}}
   Formation: {{formation}}
   Date: {{date}}
   
   Pour vérifier l'authenticité de ce certificat, scannez ce QR Code :
   {{qrcode_verification}}
   
   Signature: {{signature}}
   ```

4. **Sauvegarder le template** (format `.docx`)

#### Étape 2 : Importer dans Oxygen Document

1. **Créer un nouveau projet**
2. **Importer le template DOCX**
3. Pas d'éditeur visuel nécessaire ! ✅

#### Étape 3 : Configurer la génération via API

La configuration se fait **au moment de la génération** du document.

##### Option A : QR Code simple

```typescript
import { generateDOCX } from '@/lib/generators/docx'

const docxBuffer = await generateDOCX(templateBuffer, {
  // Variables normales
  variables: {
    nom: 'Dupont',
    prenom: 'Jean',
    email: 'jean.dupont@example.com',
    date: '15/01/2025',
    formation: 'React Avancé',
    signature: 'Directeur Formation'
  },
  
  // QR Codes à insérer
  qrcodes: {
    '{{qrcode_verification}}': 'https://verify.example.com/cert/CERT-2025-001'
  },
  
  // Options des QR Codes
  qrcodeOptions: {
    width: 200,              // Taille en pixels
    margin: 1,               // Marge (modules)
    errorCorrectionLevel: 'M' // L, M, Q, ou H
  }
})
```

##### Option B : Plusieurs QR Codes

```typescript
const docxBuffer = await generateDOCX(templateBuffer, {
  variables: {
    nom: 'Dupont',
    prenom: 'Jean'
  },
  qrcodes: {
    // QR Code de vérification
    '{{qrcode_verification}}': 'https://verify.example.com/cert/12345',
    
    // QR Code de contact (vCard)
    '{{qrcode_contact}}': `BEGIN:VCARD
VERSION:3.0
FN:Jean Dupont
EMAIL:jean.dupont@example.com
TEL:+33123456789
END:VCARD`,
    
    // QR Code vers portail
    '{{qrcode_portal}}': 'https://portal.example.com/student/jean-dupont'
  },
  qrcodeOptions: {
    width: 150,
    errorCorrectionLevel: 'Q'
  }
})
```

##### Option C : QR Code avec authentification de certificat

```typescript
const docxBuffer = await generateDOCX(templateBuffer, {
  variables: {
    nom: 'Dupont',
    prenom: 'Jean',
    certificate_id: 'CERT-2025-001',
    holder_name: 'Jean Dupont',
    title: 'Certificat React Avancé',
    issue_date: '2025-01-15',
    issuer: 'Formation Pro'
  },
  
  // Activer l'authentification automatique
  certificate: {
    enabled: true,
    qrcodePlaceholder: '{{qrcode_verification}}', // Placeholder à remplacer
    includeDocumentHash: true, // Hash SHA-256 du document
    
    // Données du certificat (ou auto-détection depuis variables)
    data: {
      certificateId: 'CERT-2025-001',
      holderName: 'Jean Dupont',
      title: 'Certificat React Avancé',
      issueDate: '2025-01-15',
      issuer: 'Formation Pro',
      grade: 'Excellent'
    },
    
    // Configuration d'authentification
    authConfig: {
      secretKey: process.env.CERTIFICATE_SECRET_KEY,
      verificationBaseUrl: 'https://certificates.example.com/verify',
      algorithm: 'sha256',
      expiresIn: 10 * 365 * 24 * 60 * 60 // 10 ans
    }
  },
  
  qrcodeOptions: {
    width: 200,
    errorCorrectionLevel: 'Q' // Q ou H recommandé pour certificats
  }
})
```

##### Option D : QR Code avec URL de stockage

```typescript
const docxBuffer = await generateDOCX(templateBuffer, {
  variables: {
    nom: 'Dupont',
    prenom: 'Jean'
  },
  qrcodes: {
    // Le contenu sera l'URL vers le document stocké
    '{{qrcode_download}}': await getStorageUrl(documentPath, true, 3600)
  }
})
```

### 🔧 Configuration avancée : Couleurs personnalisées

```typescript
const docxBuffer = await generateDOCX(templateBuffer, {
  variables: { nom: 'Dupont' },
  qrcodes: {
    '{{qrcode_brand}}': 'https://example.com'
  },
  qrcodeOptions: {
    width: 200,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#1a56db',   // Bleu pour les modules
      light: '#f0f4ff'   // Bleu clair pour le fond
    }
  }
})
```

⚠️ **Important** : Assurez-vous d'un contraste suffisant entre les couleurs pour la lisibilité !

### 📄 Template DOCX complet (exemple)

```
═══════════════════════════════════════════════════════
              CERTIFICAT DE FORMATION PROFESSIONNELLE
═══════════════════════════════════════════════════════

Certificat N°: {{certificate_id}}

Délivré à : {{holder_name}}
Formation suivie : {{title}}
Résultat : {{grade}}
Date d'obtention : {{issue_date}}
Organisme : {{issuer}}


Pour vérifier l'authenticité de ce certificat, scannez le QR Code :

                    {{qrcode_verification}}

Ce QR Code contient une signature numérique sécurisée et un lien vers
notre système de vérification en ligne.


Fait à Paris, le {{issue_date}}

                                            {{issuer}}
                                        Directeur Pédagogique


═══════════════════════════════════════════════════════
Document authentifié | Vérification : https://verify.example.com
═══════════════════════════════════════════════════════
```

---

## Tableau Comparatif

| Critère | PDF/Image (Visuel) | DOCX (Placeholder) |
|---------|-------------------|-------------------|
| **Configuration** | Interface graphique | Code / API |
| **Position** | Coordonnées exactes (x, y, w, h) | Position dans le flux de texte |
| **Édition template** | Éditeur visuel intégré | Microsoft Word ou équivalent |
| **Complexité** | Simple (point & click) | Moyenne (code) |
| **Flexibilité layout** | Position fixe | Dynamique avec le texte |
| **Multiple QR Codes** | Un par zone dessinée | Autant que de placeholders |
| **Options en temps réel** | ✅ Interface graphique | ❌ Défini dans le code |
| **Authentification** | ✅ Configuré dans l'éditeur | ✅ Configuré dans l'API |
| **Prévisualisation** | ✅ Visible dans l'éditeur | ❌ Uniquement après génération |
| **Maintenance** | Facile (UI) | Nécessite accès au code |
| **Cas d'usage idéal** | Certificats, badges, attestations | Documents Word existants, rapports |

---

## 🎯 Recommandations

### Choisir PDF/Image si :
- ✅ Vous avez un design fixe (certificat, badge)
- ✅ Vous préférez une interface visuelle
- ✅ Vos utilisateurs métier doivent pouvoir configurer
- ✅ Vous voulez voir le résultat en temps réel

### Choisir DOCX si :
- ✅ Vous avez déjà des templates Word
- ✅ Votre layout est dynamique (texte qui varie en longueur)
- ✅ Vous avez besoin de mise en forme complexe Word
- ✅ Vous êtes à l'aise avec la configuration programmatique
- ✅ Vous voulez plusieurs QR Codes dans un document

---

## 🔐 Bonnes pratiques de sécurité

### Pour les certificats authentifiés :

1. **Toujours utiliser** `errorCorrectionLevel: 'Q'` ou `'H'`
2. **Activer** `includeDocumentHash: true`
3. **Définir** une expiration longue mais raisonnable (ex: 10 ans)
4. **Stocker** la `secretKey` dans les variables d'environnement
5. **Tester** la vérification après génération

### Pour les QR Codes publics :

1. **Vérifier** que l'URL est accessible publiquement
2. **Utiliser** HTTPS pour les liens
3. **Tester** le QR Code avec plusieurs lecteurs
4. **Prévoir** un texte alternatif en cas d'échec de scan

---

## 📚 Ressources complémentaires

- [Guide complet des QR Codes](./GUIDE_QR_CODES.md)
- [Authentification des certificats](./GUIDE_AUTHENTIFICATION_CERTIFICATS.md)
- [Configuration des certificats](./CONFIGURATION_CERTIFICATS.md)
- [API de génération](./API_GENERATION.md)

---

## ❓ FAQ

### Q : Puis-je changer la couleur du QR Code dans l'éditeur PDF/Image ?
**R :** Oui, dans le panneau de propriétés, section "Couleurs du QR Code".

### Q : Combien de QR Codes puis-je mettre dans un document ?
**R :** Illimité pour les deux types de templates.

### Q : Le QR Code DOCX garde-t-il la mise en forme autour ?
**R :** Oui, le QR Code s'insère dans le flux de texte en remplaçant le placeholder.

### Q : Puis-je utiliser des variables dans le contenu du QR Code ?
**R :** Oui ! Les variables sont résolues avant la génération du QR Code.

### Q : Quelle taille recommandez-vous pour un QR Code ?
**R :** 
- Minimum : 100x100 px
- Recommandé : 150-200 px
- Certificats : 200-250 px

### Q : Les QR Codes sont-ils scannables sur tous les téléphones ?
**R :** Oui, avec n'importe quelle application de lecture QR Code standard.

---

**Dernière mise à jour** : 2025-01-15

