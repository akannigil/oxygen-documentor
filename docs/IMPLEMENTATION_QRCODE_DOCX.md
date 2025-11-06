# ✅ Implémentation : Configuration QR Codes DOCX

## 🎯 Résumé

**Fonctionnalité implémentée** : Configuration visuelle des QR Codes pour templates DOCX avec support de contenu dynamique (variables).

**Problème résolu** : Auparavant, pour les templates DOCX, il n'y avait pas d'interface pour configurer les QR Codes. L'utilisateur devait tout faire en code. Maintenant, il existe une interface visuelle complète.

---

## 📦 Composants créés

### 1. Types et Schémas

#### `shared/types/index.ts`
```typescript
export interface DOCXQRCodeConfig {
  placeholder: string          // Ex: "{{qrcode_verification}}"
  contentPattern: string        // Ex: "https://verify.com/{{id}}"
  contentType?: string         // "url" | "text" | "vcard" | etc.
  options?: QRCodeOptions      // Taille, couleurs, etc.
  auth?: QRCodeCertificateAuth // Authentification (optionnel)
  storageUrl?: QRCodeStorageUrl // URL de stockage (optionnel)
}
```

#### `shared/schemas/template.ts`
```typescript
export const docxQRCodeConfigSchema = z.object({...})
export const updateDOCXQRCodeConfigsSchema = z.object({
  qrcodeConfigs: z.array(docxQRCodeConfigSchema)
})
```

### 2. Base de données

#### `prisma/schema.prisma`
```prisma
model Template {
  // ... autres champs
  qrcodeConfigs Json? // Nouveau champ pour stocker les configurations
  // ...
}
```

**⚠️ Migration requise** : Voir [MIGRATION_DB_QRCODE_CONFIGS.md](./MIGRATION_DB_QRCODE_CONFIGS.md)

### 3. Interface utilisateur

#### Composant : `components/template-editor/DOCXQRCodeConfiguration.tsx`

**Fonctionnalités** :
- ✅ Liste des variables disponibles du template
- ✅ Ajout/suppression de configurations QR Code
- ✅ Édition du placeholder
- ✅ Sélection du type de contenu (URL, vCard, email, etc.)
- ✅ Éditeur de pattern avec suggestions
- ✅ Configuration des options visuelles (taille, marge, couleurs)
- ✅ Interface expand/collapse pour chaque configuration

**Aperçu** :
```
┌─────────────────────────────────────────┐
│ Configuration des QR Codes              │
│ [+ Ajouter un QR Code]                  │
├─────────────────────────────────────────┤
│ Variables disponibles:                  │
│ [{{nom}}]  [{{prenom}}]  [{{id}}]       │
├─────────────────────────────────────────┤
│ {{qrcode_verification}}                 │
│ https://verify.com/{{id}}               │
│ [Modifier] [Supprimer]                  │
│                                         │
│ ▼ Options visuelles                     │
│   Largeur: [200] px                     │
│   Marge: [1] modules                    │
│   Niveau erreur: [M]                    │
│   Couleurs: [#000000] [#FFFFFF]         │
└─────────────────────────────────────────┘
```

#### Page : `app/projects/[id]/templates/[templateId]/configure-qrcodes/page.tsx`

**Route** : `/projects/[id]/templates/[templateId]/configure-qrcodes`

**Fonctionnalités** :
- ✅ Affichage des variables du template
- ✅ Intégration du composant de configuration
- ✅ Sauvegarde des configurations
- ✅ Messages de succès/erreur
- ✅ Boutons Annuler/Sauvegarder

#### Client component : `DOCXQRCodeConfigurationClient.tsx`

**Responsabilités** :
- ✅ Gestion de l'état des configurations
- ✅ Appel API pour sauvegarder
- ✅ Gestion des messages (succès/erreur)
- ✅ Redirection après sauvegarde

### 4. API Routes

#### `app/api/projects/[id]/templates/[templateId]/qrcode-configs/route.ts`

**Endpoints** :

##### `PUT /api/projects/[id]/templates/[templateId]/qrcode-configs`
- Sauvegarde les configurations QR Code
- Validation avec Zod
- Mise à jour du template dans la BDD

##### `GET /api/projects/[id]/templates/[templateId]/qrcode-configs`
- Récupère les configurations actuelles
- Vérification des permissions

### 5. Workflow modifié

#### `app/projects/[id]/templates/[templateId]/page.tsx`

**Changements** :

**Avant** :
```
1. Upload template DOCX
2. Génération directe
```

**Après** :
```
1. Upload template DOCX
2. Configurer QR Codes (nouvelle étape) ← NOUVEAU
3. Génération
```

**Affichage** :
- ✅ Section "QR Codes configurés" avec la liste
- ✅ Lien "Modifier" vers la page de configuration
- ✅ Icône QR Code pour chaque configuration

### 6. Générateur modifié

#### `lib/generators/docx.ts`

**Changements** :

```typescript
export interface GenerateDOCXOptions {
  variables: Record<string, string | number | Date>
  qrcodeConfigs?: DOCXQRCodeConfig[] // ← NOUVEAU
  // ... autres options
}
```

**Logique de génération** :

```typescript
// 1. Remplacement des variables dans le pattern
if (options.qrcodeConfigs && options.qrcodeConfigs.length > 0) {
  options.qrcodeConfigs.forEach((config) => {
    let content = config.contentPattern
    
    // Remplacer {{variable}} par la valeur réelle
    Object.entries(options.variables).forEach(([key, value]) => {
      content = content.replace(`{{${key}}}`, String(value))
    })
    
    // Ajouter à la liste des QR Codes à insérer
    qrCodeInsertions.push({
      placeholder: config.placeholder,
      data: content, // Contenu avec variables remplacées
      options: config.options
    })
  })
}

// 2. Insertion des QR Codes dans le DOCX
const updatedBuffer = await insertMultipleQRCodesInDOCX(
  finalBuffer,
  qrCodeInsertions
)
```

**Rétrocompatibilité** : L'ancien système `qrcodes: {...}` continue de fonctionner !

#### `app/api/projects/[id]/generate/route.ts`

**Changements** :

```typescript
// Récupérer les configurations depuis le template
const qrcodeConfigs = template.qrcodeConfigs || []

const docxBuffer = await generateDOCX(templateBuffer, {
  variables: data,
  qrcodeConfigs: qrcodeConfigs // ← Passer les configs
})
```

---

## 🔄 Flux de données

```
┌─────────────────────────────────────────────────────┐
│ 1. Utilisateur upload template DOCX                 │
│    Variables détectées : {{nom}}, {{id}}, etc.      │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 2. Utilisateur configure les QR Codes               │
│    - Placeholder: {{qrcode_verification}}           │
│    - Pattern: https://verify.com/{{id}}             │
│    - Options: width=200, margin=1                   │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 3. Sauvegarde dans la BDD                           │
│    template.qrcodeConfigs = [config1, config2, ...] │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 4. Génération de documents                          │
│    Pour chaque ligne CSV:                           │
│    - Remplacer variables dans le pattern            │
│    - Générer le QR Code avec le contenu unique      │
│    - Insérer dans le DOCX                           │
└─────────────────────────────────────────────────────┘

Exemple :
Données CSV : { nom: "Dupont", id: "123" }
Pattern : https://verify.com/{{id}}
→ QR Code contient : https://verify.com/123
```

---

## 📊 Exemple complet

### Template Word

```
Certificat de Formation

Nom: {{nom}}
Prénom: {{prenom}}
Formation: {{formation}}

QR Code de vérification :
{{qrcode_verification}}
```

### Configuration interface

```
Placeholder: {{qrcode_verification}}
Type: URL
Pattern: https://verify-training.com/cert/{{certificat_id}}?name={{nom}}
Options:
  - Largeur: 250px
  - Marge: 2
  - Niveau erreur: Q
  - Couleur: #0066CC / #FFFFFF
```

### Données CSV

```csv
nom,prenom,formation,certificat_id
Dupont,Jean,React Avancé,CERT-2025-001
Martin,Marie,Vue.js,CERT-2025-002
Bernard,Paul,Angular,CERT-2025-003
```

### Résultat

**Document 1** :
- Nom: Dupont Jean
- QR Code → `https://verify-training.com/cert/CERT-2025-001?name=Dupont`

**Document 2** :
- Nom: Martin Marie
- QR Code → `https://verify-training.com/cert/CERT-2025-002?name=Martin`

**Document 3** :
- Nom: Bernard Paul
- QR Code → `https://verify-training.com/cert/CERT-2025-003?name=Bernard`

---

## 🎨 Avantages

### Pour l'utilisateur

✅ **Interface visuelle** : Plus besoin de coder pour configurer les QR Codes
✅ **Aperçu en direct** : Voir les variables disponibles et suggestions
✅ **Validation** : Erreurs affichées clairement
✅ **Réutilisable** : Configuration sauvegardée avec le template
✅ **Flexible** : Supporte tous types de contenus (URL, vCard, etc.)

### Pour le développeur

✅ **Typé** : Types TypeScript complets
✅ **Validé** : Schémas Zod pour la validation
✅ **Rétrocompatible** : Ancien système continue de fonctionner
✅ **Extensible** : Facile d'ajouter de nouveaux types de contenu
✅ **Testable** : Composants isolés et testables

---

## 🧪 Tests suggérés

### Test 1 : Configuration basique

1. Upload un template DOCX avec `{{nom}}` et `{{qrcode_test}}`
2. Configurer un QR Code :
   - Placeholder: `{{qrcode_test}}`
   - Pattern: `https://example.com/{{nom}}`
3. Générer un document avec nom = "Test"
4. Scanner le QR Code → doit afficher `https://example.com/Test`

### Test 2 : Plusieurs variables

1. Pattern: `https://example.com/{{id}}/{{code}}`
2. Données: `{id: "123", code: "ABC"}`
3. QR Code → `https://example.com/123/ABC`

### Test 3 : Options visuelles

1. Configurer couleur rouge: `#FF0000`
2. Générer → QR Code doit être rouge

### Test 4 : Plusieurs QR Codes

1. Configurer 2 QR Codes dans le même template
2. Générer → les 2 doivent apparaître correctement

---

## 📝 Notes techniques

### Performance

- Les QR Codes sont générés à la volée lors de la génération
- Pas de cache pour l'instant (chaque génération recalcule)
- Pour optimiser : ajouter un cache basé sur le contenu

### Sécurité

- Validation Zod côté API
- Vérification des permissions (owner du projet)
- Pas d'injection SQL possible (Prisma ORM)

### Limitations actuelles

- Pas de preview du QR Code dans l'interface de configuration
- Pas de validation du contenu du pattern (peut contenir des erreurs)
- Pas d'historique des configurations

### Améliorations futures possibles

- [ ] Preview en temps réel du QR Code
- [ ] Validation du pattern avec les variables disponibles
- [ ] Templates de patterns prédéfinis
- [ ] Export/import de configurations
- [ ] Historique des modifications
- [ ] Analytics (combien de fois scanné)

---

## 🚀 Déploiement

### Checklist

- [ ] Arrêter le serveur de dev
- [ ] Exécuter `npx prisma generate`
- [ ] Exécuter `npx prisma migrate dev --name add_qrcode_configs`
- [ ] Redémarrer le serveur
- [ ] Tester la nouvelle interface
- [ ] Documenter pour l'équipe

### Variables d'environnement

Aucune nouvelle variable requise pour cette fonctionnalité.

Les variables d'authentification de certificat restent optionnelles :
- `CERTIFICATE_SECRET_KEY`
- `CERTIFICATE_VERIFICATION_BASE_URL`

---

## 📚 Documentation

- [Guide utilisateur](./GUIDE_QRCODE_DOCX_WORKFLOW.md)
- [Migration BDD](./MIGRATION_DB_QRCODE_CONFIGS.md)
- [Guide général QR Codes](./docs/GUIDE_QR_CODES.md)

---

## ✅ Statut

**Implémentation** : ✅ Complète  
**Tests** : ⏳ À effectuer  
**Documentation** : ✅ Complète  
**Migration BDD** : ⚠️ À exécuter

**Prêt pour** : Tests et validation utilisateur

---

*Implémenté le* : 3 novembre 2025  
*Version* : 1.0.0

