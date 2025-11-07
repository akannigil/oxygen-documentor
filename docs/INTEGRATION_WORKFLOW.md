# 🔄 Intégration dans le Workflow - Authentification des Certificats

## ✨ NOUVEAU : Authentification automatique intégrée

L'authentification des certificats est maintenant **directement intégrée** dans `generateDOCX()`. Plus besoin de code supplémentaire !

## 🎯 Avant vs Après

### ❌ AVANT (Méthode manuelle)

```typescript
// Complexe : 3 étapes séparées
import { generateAuthenticatedCertificate } from '@/lib/qrcode/certificate-auth'

const authConfig = {
  /* ... */
}
const certificateData = {
  /* ... */
}

// 1. Générer le certificat authentifié
const authenticated = generateAuthenticatedCertificate(certificateData, authConfig)

// 2. Générer le document
const docxBuffer = await generateDOCX(templateBuffer, {
  variables: data,
  // 3. Insérer le QR code manuellement
  qrcodes: {
    '{{qrcode_verification}}': authenticated.qrCodeData,
  },
})
```

### ✅ APRÈS (Méthode intégrée)

```typescript
// Simple : 1 seule étape
const docxBuffer = await generateDOCX(templateBuffer, {
  variables: {
    certificate_id: 'CERT-2024-001',
    holder_name: 'Jean Dupont',
    title: 'Formation TypeScript',
    issue_date: new Date(),
    issuer: 'Académie Tech',
    grade: 'Excellent',
  },
  // ✨ UN SEUL PARAMÈTRE
  certificate: {
    enabled: true, // C'est tout !
  },
})
```

## 🚀 Utilisation dans votre workflow

### 1. Génération simple

```typescript
import { generateDOCX } from '@/lib/generators/docx'

const docxBuffer = await generateDOCX(templateBuffer, {
  variables: {
    certificate_id: 'CERT-2024-001',
    holder_name: 'Marie Martin',
    title: 'Formation React',
    issue_date: new Date(),
    issuer: 'WebDev Academy',
  },
  certificate: {
    enabled: true, // Détection automatique des données
  },
})
```

### 2. Intégration dans l'API

Modifiez `app/api/projects/[id]/generate/route.ts` :

```typescript
// Détecter si c'est un certificat
const isCertificate =
  template.name.toLowerCase().includes('certificat') ||
  template.name.toLowerCase().includes('diplome') ||
  template.name.toLowerCase().includes('attestation')

const docxBuffer = await generateDOCX(templateBuffer, {
  variables: data,

  // Activer automatiquement pour les certificats
  certificate: isCertificate
    ? {
        enabled: true,
        includeDocumentHash: true, // Sécurité maximale
      }
    : undefined,
})
```

### 3. Avec paramètre utilisateur

```typescript
interface GenerateRequest {
  templateId: string
  rows: Array<Record<string, any>>
  enableCertificateAuth?: boolean // ← Nouveau paramètre
}

const body = (await request.json()) as GenerateRequest

const docxBuffer = await generateDOCX(templateBuffer, {
  variables: data,
  certificate: body.enableCertificateAuth
    ? {
        enabled: true,
      }
    : undefined,
})
```

## 📋 Champs détectés automatiquement

Le système détecte automatiquement ces champs dans vos variables :

| Champ certificat  | Noms de variables reconnus                                              |
| ----------------- | ----------------------------------------------------------------------- |
| **certificateId** | `certificate_id`, `certificateId`, `id`, `cert_id`                      |
| **holderName**    | `holder_name`, `holderName`, `student_name`, `participant_name`, `name` |
| **title**         | `title`, `course_name`, `formation`, `training`                         |
| **issueDate**     | `issue_date`, `issueDate`, `date`, `creation_date`                      |
| **issuer**        | `issuer`, `organization`, `organisme`, `emetteur`                       |
| **grade**         | `grade`, `note`, `mention`, `result`                                    |

## ⚙️ Configuration

### Variables d'environnement requises

```bash
# Générer une clé secrète
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Configurer dans .env
CERTIFICATE_SECRET_KEY=votre_cle_generee
VERIFICATION_BASE_URL=https://certificates.votredomaine.com/verify
```

### Template DOCX

Ajoutez ce placeholder dans votre template Word :

```
Certificat délivré à {{holder_name}}

Scannez ce QR code pour vérifier :
{{qrcode_verification}}
```

## 📊 Exemples complets

### Exemple 1 : Certificat simple

```typescript
const certif = await generateDOCX(templateBuffer, {
  variables: {
    certificate_id: 'CERT-2024-001',
    holder_name: 'Jean Dupont',
    title: 'Formation TypeScript',
    issue_date: new Date(),
    issuer: 'Tech Academy',
    grade: 'Excellent',
  },
  certificate: { enabled: true },
})
```

### Exemple 2 : Diplôme avec hash du document

```typescript
const diplome = await generateDOCX(templateBuffer, {
  variables: {
    certificate_id: 'DIPLOME-2024-M2-042',
    holder_name: 'Marie Martin',
    title: 'Master Informatique - IA',
    issue_date: new Date(),
    issuer: 'Université Paris Tech',
    grade: 'Mention Très Bien',
  },
  certificate: {
    enabled: true,
    includeDocumentHash: true, // ← Vérifier l'intégrité
  },
  qrcodeOptions: {
    errorCorrectionLevel: 'H', // Document officiel
  },
})
```

### Exemple 3 : Habilitation avec expiration

```typescript
const habilitation = await generateDOCX(templateBuffer, {
  variables: {
    certificate_id: 'HAB-ELEC-2024-001',
    holder_name: 'Laurent Petit',
    title: 'Habilitation Électrique B2V',
    issue_date: new Date(),
    issuer: 'APAVE Formation',
  },
  certificate: {
    enabled: true,
    authConfig: {
      secretKey: process.env['CERTIFICATE_SECRET_KEY']!,
      verificationBaseUrl: 'https://habilitations.example.com/verify',
      algorithm: 'sha512', // Sécurité renforcée
      expiresIn: 3 * 365 * 24 * 60 * 60, // 3 ans
    },
    data: {
      expiryDate: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        level: 'B2V',
        domain: 'Travaux sous tension',
      },
    },
  },
})
```

## 🔍 Schéma du workflow

```
┌──────────────────────────────────────────────────────────┐
│  generateDOCX(templateBuffer, options)                    │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  1. Traitement des variables normales                     │
│     → Remplacer {{holder_name}}, {{title}}, etc.         │
│                                                           │
│  2. Génération du document initial                        │
│     → Créer le DOCX avec les variables                    │
│                                                           │
│  3. Si certificate.enabled = true :                       │
│     ├─ Détecter les données de certificat                │
│     │  depuis les variables                               │
│     ├─ Générer signature HMAC SHA-256/512                 │
│     ├─ (Opt.) Calculer hash du document                   │
│     ├─ Créer JSON signé avec données + signature         │
│     └─ Générer QR code et insérer dans template          │
│                                                           │
│  4. Retourner document final authentifié                  │
└──────────────────────────────────────────────────────────┘
                          │
                          ↓
               Document avec QR code signé ✅
```

## 📚 Documentation

- **[Guide d'intégration complet](./docs/INTEGRATION_WORKFLOW_CERTIFICATS.md)** - Toutes les options
- **[Exemples de code](./examples/workflow-integration.ts)** - 9 exemples pratiques
- **[Guide d'authentification](./docs/GUIDE_AUTHENTIFICATION_CERTIFICATS.md)** - Fonctionnement détaillé
- **[Configuration](./docs/CONFIGURATION_CERTIFICATS.md)** - Variables d'environnement

## ✅ Checklist d'intégration

- [ ] Configurer `CERTIFICATE_SECRET_KEY` dans `.env`
- [ ] Ajouter `{{qrcode_verification}}` dans vos templates
- [ ] Utiliser des noms de variables reconnus (`certificate_id`, `holder_name`, etc.)
- [ ] Ajouter `certificate: { enabled: true }` dans vos appels `generateDOCX`
- [ ] Implémenter l'API de vérification (voir guide complet)
- [ ] Tester la génération et la vérification

## 🎓 Migration rapide

Si vous utilisez déjà `generateAuthenticatedCertificate` manuellement :

```typescript
// Ancien code (à migrer)
const authenticated = generateAuthenticatedCertificate(data, config)
const docx = await generateDOCX(template, {
  variables: data,
  qrcodes: {
    '{{qrcode_verification}}': authenticated.qrCodeData,
  },
})

// Nouveau code (simplifié)
const docx = await generateDOCX(template, {
  variables: data,
  certificate: { enabled: true }, // ← Plus simple !
})
```

## 💡 Conseils

1. **Nommage des variables** : Utilisez les noms reconnus (`certificate_id`, `holder_name`, etc.)
2. **Hash du document** : Activez pour les diplômes et documents officiels
3. **Algorithme** : Utilisez SHA-512 pour habilitations et documents critiques
4. **Expiration** : Configurez selon le type de certificat (1-10 ans)
5. **Tests** : Testez en développement avant production

## ❓ FAQ

**Q: Puis-je utiliser mes propres noms de variables ?**  
R: Oui, passez `certificate.data` manuellement avec vos données.

**Q: Comment désactiver l'authentification pour certains documents ?**  
R: Ne pas définir `certificate.enabled` ou le mettre à `false`.

**Q: Le QR code remplace-t-il les QR codes manuels ?**  
R: Non, vous pouvez combiner `certificate` et `qrcodes` dans les options.

**Q: Où trouver des exemples complets ?**  
R: Voir `examples/workflow-integration.ts` (9 exemples)

---

**Version** : 1.0  
**Date** : 3 novembre 2024  
**Auteur** : Oxygen Document Team
