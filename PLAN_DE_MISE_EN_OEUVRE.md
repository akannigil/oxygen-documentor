# Plan de Mise en Œuvre — Application de Gestion d'Attestations

## Vue d'ensemble

Application web Next.js (App Router) pour la gestion et génération en masse d'attestations personnalisées avec édition visuelle de templates, import de données, génération PDF avec QR codes, et envoi par email.

---

## Phases de Développement

### 🔷 Phase 1 : Infrastructure & Configuration (Jours 1-3)

#### 1.1 Structure du projet
- [x] Initialiser Next.js avec App Router + TypeScript strict
- [ ] Configurer Tailwind CSS
- [ ] Configurer les alias de chemins (`@/*`)
- [ ] Structure des dossiers (features, shared, lib)

#### 1.2 Base de données
- [ ] Installer Prisma
- [ ] Créer le schéma Prisma complet (User, Project, Template, Document)
- [ ] Configurer PostgreSQL (ou Supabase)
- [ ] Générer le client Prisma
- [ ] Créer les migrations initiales

#### 1.3 Configuration environnement
- [ ] Fichier `.env.example` avec toutes les variables
- [ ] Configuration TypeScript stricte (tsconfig.json)
- [ ] ESLint + Prettier
- [ ] Configuration Vercel/Production

#### 1.4 Authentification
- [ ] Installer NextAuth.js
- [ ] Configurer providers (email/password, OAuth optionnel)
- [ ] Modèle User avec rôles (owner, editor, viewer)
- [ ] Middleware de protection des routes
- [ ] Pages de login/signup

---

### 🔷 Phase 2 : CRUD Projets & Templates (Jours 4-6)

#### 2.1 Gestion des projets
- [ ] API routes : `GET /api/projects`, `POST /api/projects`
- [ ] API route : `GET /api/projects/[id]`, `PUT /api/projects/[id]`, `DELETE`
- [ ] Vérification des permissions (owner uniquement pour modifier)
- [ ] Pages frontend : liste projets, création, édition

#### 2.2 Upload de templates
- [ ] API route : `POST /api/projects/[id]/templates`
- [ ] Upload multipart (formidable ou form-data)
- [ ] Validation : taille max, types (PDF, PNG, JPG)
- [ ] Intégration avec adaptateur de stockage
- [ ] Création du record Template en DB

#### 2.3 Lecture et extraction de templates
- [ ] API route : `GET /api/templates/[id]`
- [ ] Service pour récupérer fichier depuis stockage
- [ ] Extraction de métadonnées (dimensions pour images, pages pour PDF)
- [ ] Page frontend : affichage template + métadonnées

---

### 🔷 Phase 3 : Éditeur Visuel de Zones (Jours 7-10)

#### 3.1 Canvas et affichage
- [ ] Installer `react-konva` ou `fabric.js`
- [ ] Composant `TemplateEditor` : affichage template (PDF première page ou image)
- [ ] Conversion PDF première page en image pour canvas (si nécessaire)
- [ ] Zoom, pan sur le canvas

#### 3.2 Gestion des zones
- [ ] Ajouter zone (click + drag rectangle)
- [ ] Sélection, déplacement, redimensionnement (handles)
- [ ] Suppression de zones
- [ ] Propriétés de zone : key, type (text/qrcode), fontSize, align, format

#### 3.3 Sauvegarde des définitions
- [ ] API route : `PUT /api/templates/[id]/fields`
- [ ] Stockage JSON des zones dans Prisma (champ `fields`)
- [ ] Aperçu avec valeurs demo
- [ ] Export/Import JSON de configuration

---

### 🔷 Phase 4 : Import de Données & Mapping (Jours 11-13)

#### 4.1 Upload et parsing CSV
- [ ] Page frontend : upload CSV/XLSX
- [ ] Client-side parsing : `papaparse` (CSV) + `xlsx` (Excel)
- [ ] Aperçu des colonnes détectées
- [ ] Validation format et encodage

#### 4.2 Mapping colonnes → clés
- [ ] Interface de mapping : dropdown colonnes → template keys
- [ ] Prévisualisation 10 premières lignes avec mapping
- [ ] Gestion des types (string, date, number)
- [ ] Validation : toutes les clés requises mappées ?

#### 4.3 API d'import
- [ ] API route : `POST /api/projects/[id]/import`
- [ ] Parsing serveur (optionnel, si upload fichier)
- [ ] Stockage temporaire ou session pour les données
- [ ] Retour JSON des rows validées

---

### 🔷 Phase 5 : Service de Génération PDF (Jours 14-17)

#### 5.1 Génération single document
- [ ] Service `generateDocument()` :
  - Charge template depuis stockage
  - Pour PDF : utilise `pdf-lib` pour charger
  - Pour image : crée PDF depuis image avec `pdf-lib`
  - Parcourt les champs définis
- [ ] Placement texte : `page.drawText()` avec font, taille, align
- [ ] Génération QR code : `qrcode.toDataURL()` → embed PNG dans PDF
- [ ] Formattage (date, uppercase, masks)
- [ ] Génération buffer final

#### 5.2 Stockage du document généré
- [ ] Upload sur S3 (ou autre) : `projects/{projectId}/documents/{documentId}.pdf`
- [ ] Création record `Document` en DB (filePath, mimeType, status: "generated")
- [ ] Retour URL ou signed URL (temps limité)

#### 5.3 API de génération
- [ ] API route : `POST /api/projects/[id]/generate`
- [ ] Body : `{ templateId, rows: [...] }` ou `{ importId }`
- [ ] Validation template + données
- [ ] Génération synchrone (pour 1 doc) ou job (pour batch)

---

### 🔷 Phase 6 : Jobs & Génération en Lot (Jours 18-20)

#### 6.1 Configuration BullMQ
- [ ] Installer BullMQ + Redis
- [ ] Configuration Redis (local ou cloud)
- [ ] Queue : `document-generation`
- [ ] Worker : traitement des jobs

#### 6.2 Job de génération batch
- [ ] API route `/generate` : crée job BullMQ
- [ ] Worker : traite chaque ligne → appelle `generateDocument()`
- [ ] Progression : événements/métriques (optionnel WebSocket)
- [ ] API route : `GET /api/jobs/[id]` pour status

#### 6.3 Gestion des erreurs
- [ ] Retry sur échec (3 tentatives)
- [ ] Logging des erreurs par document
- [ ] Statut "failed" dans DB

---

### 🔷 Phase 7 : Système d'Envoi Email (Jours 21-23)

#### 7.1 Configuration SMTP
- [ ] Installer `nodemailer`
- [ ] Configuration SMTP (env vars)
- [ ] Template email HTML (avec lien ou pièce jointe)
- [ ] Service `sendDocumentEmail()`

#### 7.2 Providers transactionnels (optionnel)
- [ ] Adapter pour SendGrid API
- [ ] Adapter pour AWS SES
- [ ] Adapter pour Mailgun
- [ ] Configuration via env (choix du provider)

#### 7.3 Jobs d'envoi
- [ ] Queue BullMQ : `email-sending`
- [ ] Job : récupère document, génère email, envoie
- [ ] Mise à jour `Document.emailSentAt`, `status: "sent"`
- [ ] Gestion bounces/erreurs

#### 7.4 API d'envoi
- [ ] API route : `POST /api/documents/[id]/send`
- [ ] Body : `{ recipientEmail, subject?, body? }`
- [ ] Validation email
- [ ] Lancement job ou envoi synchrone

---

### 🔷 Phase 8 : Interface Dashboard & Historique (Jours 24-26)

#### 8.1 Dashboard principal
- [ ] Page `/dashboard` : vue d'ensemble projets
- [ ] Statistiques : nombre templates, documents générés/sent
- [ ] Liste documents récents
- [ ] Actions rapides (nouveau projet, générer, importer)

#### 8.2 Liste des documents
- [ ] Page `/projects/[id]/documents`
- [ ] Filtres : status (generated, sent, failed), date
- [ ] Recherche par destinataire
- [ ] Pagination
- [ ] Téléchargement individuel (signed URL)

#### 8.3 Détails document
- [ ] Page `/documents/[id]`
- [ ] Métadonnées : template, données utilisées, dates
- [ ] Aperçu PDF (iframe ou viewer)
- [ ] Actions : renvoyer, régénérer, supprimer

#### 8.4 Export historique
- [ ] Export CSV de la liste documents (métadonnées)
- [ ] Filtres appliqués dans l'export

---

### 🔷 Phase 9 : Sécurité & Optimisations (Jours 27-29)

#### 9.1 Sécurité
- [ ] Rate limiting (API routes sensibles : `/generate`, `/import`)
- [ ] Vérification uploads : scan virus (ClamAV optionnel)
- [ ] Signed URLs pour S3 (expiration configurable)
- [ ] Validation stricte des données (Zod schemas)
- [ ] Sanitization des inputs

#### 9.2 Permissions & RBAC
- [ ] Middleware vérifiant rôles (owner/editor/viewer)
- [ ] Restrictions : viewer ne peut pas modifier/générer
- [ ] Audit log (optionnel) : qui a fait quoi

#### 9.3 Performance
- [ ] Cache des templates (Redis)
- [ ] Compression des PDFs générés (optionnel)
- [ ] Optimisation images (resize avant upload)
- [ ] Lazy loading des listes

---

### 🔷 Phase 10 : Tests & Documentation (Jours 30-32)

#### 10.1 Tests unitaires
- [ ] Tests services : génération PDF, QR codes
- [ ] Tests adaptateurs stockage
- [ ] Tests parsing CSV/Excel
- [ ] Tests utilitaires (formattage, validation)

#### 10.2 Tests d'intégration
- [ ] Tests API routes (Vitest + supertest ou Playwright)
- [ ] Tests flux complet : import → génération → envoi

#### 10.3 Documentation
- [ ] README avec installation et configuration
- [ ] Documentation API (Swagger/OpenAPI optionnel)
- [ ] Guide utilisateur (création template, import, génération)
- [ ] Documentation déploiement (Docker, Vercel, VPS)

---

## Architecture Technique Détaillée

### Structure des dossiers

```
oxygen-document/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Routes auth (group)
│   │   ├── dashboard/         # Dashboard principal
│   │   ├── projects/          # Gestion projets
│   │   ├── templates/         # Éditeur templates
│   │   ├── documents/         # Liste & détails documents
│   │   └── api/               # API routes
│   ├── components/            # Composants React réutilisables
│   │   ├── ui/               # Composants UI de base (shadcn/ui)
│   │   ├── template-editor/  # Éditeur visuel
│   │   ├── data-import/      # Import CSV/Excel
│   │   └── documents/         # Composants documents
│   ├── features/             # Features par domaine
│   │   ├── auth/
│   │   ├── projects/
│   │   ├── templates/
│   │   ├── documents/
│   │   └── emails/
│   ├── lib/                  # Utilitaires & config
│   │   ├── prisma.ts
│   │   ├── auth.ts           # NextAuth config
│   │   ├── storage/          # Adaptateurs stockage
│   │   ├── pdf/              # Services PDF
│   │   ├── qrcode/           # Génération QR
│   │   └── email/            # Services email
│   ├── shared/               # Code partagé
│   │   ├── types/            # Types TypeScript
│   │   ├── schemas/          # Zod schemas
│   │   └── utils/            # Utilitaires
│   └── workers/              # BullMQ workers
├── prisma/
│   └── schema.prisma
├── public/
├── tests/
└── [config files]
```

### Stack Technique Détaillée

| Composant | Technologie | Version cible |
|-----------|-------------|---------------|
| Framework | Next.js | 14+ (App Router) |
| Language | TypeScript | 5+ (strict mode) |
| Styling | Tailwind CSS | 3+ |
| ORM | Prisma | 5+ |
| Database | PostgreSQL | 14+ (ou Supabase) |
| Auth | NextAuth.js | 5+ |
| PDF | pdf-lib | 1.17+ |
| QR Code | qrcode | 1.5+ |
| Canvas | react-konva | 9+ |
| CSV | papaparse | 5+ |
| Excel | xlsx (SheetJS) | 0.18+ |
| Jobs | BullMQ | 4+ |
| Queue | Redis | 7+ |
| Storage | AWS SDK v3 | 3+ |
| Email | nodemailer | 6+ |
| Testing | Vitest | 1+ |
| Validation | Zod | 3+ |

---

## Variables d'Environnement Requises

```env
# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."

# Storage (S3)
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
S3_BUCKET_NAME="..."

# Storage (FTP - optionnel)
FTP_HOST="..."
FTP_USER="..."
FTP_PASSWORD="..."

# Email (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="..."
SMTP_PASSWORD="..."

# Email (SendGrid - optionnel)
SENDGRID_API_KEY="..."

# Redis (pour BullMQ)
REDIS_URL="redis://localhost:6379"

# App
NODE_ENV="development"
```

---

## Points d'Attention & Décisions à Prendre

### 1. Choix Canvas Library
- **react-konva** : Plus léger, bien intégré React
- **fabric.js** : Plus de features, mais plus lourd
- **Recommandation** : `react-konva` pour MVP, migration possible si besoin

### 2. Conversion PDF → Image pour Canvas
- Option A : Convertir côté serveur (pdf2pic, pdf-lib + canvas)
- Option B : Utiliser PDF.js côté client pour render
- **Recommandation** : PDF.js côté client (moins de charge serveur)

### 3. Génération QR Code
- Génération côté serveur (plus sûr, contrôle total)
- Embed dans PDF via pdf-lib
- Taille configurable par zone

### 4. Stockage Fichiers
- **Production** : S3 (scalable, CDN)
- **Dev local** : Stockage local (dossier `uploads/`)
- **Fallback** : FTP (pour clients spécifiques)

### 5. Gestion des Erreurs
- Sentry pour monitoring production
- Logs structurés (Winston ou Pino)
- Notifications admin sur erreurs critiques

### 6. Scalabilité
- Utiliser Vercel pour frontend (serverless)
- Worker séparé pour BullMQ (VPS ou Railway)
- S3 pour storage (pas de limite pratique)
- Redis géré (Upstash, Redis Cloud)

---

## Checklist MVP (Priorités)

### ✅ Priorité 1 (Core)
- [x] Auth + CRUD projets
- [ ] Upload template + éditeur zones visuel
- [ ] Import CSV/Excel + mapping
- [ ] Génération single doc (pdf-lib + qrcode) + stockage

### ✅ Priorité 2 (Fonctionnel)
- [ ] Historique documents
- [ ] Batch generate + worker
- [ ] Envoi email (SMTP) + logging

### ✅ Priorité 3 (Production-ready)
- [ ] Role-based access + signed URLs
- [ ] Rate limiting
- [ ] Tests + documentation
- [ ] Monitoring & logs

---

## Estimation Globale

- **MVP Fonctionnel** : ~3-4 semaines (1 développeur full-time)
- **Production-ready** : ~5-6 semaines (incluant tests, sécurité, optimisations)
- **Avec features avancées** : ~8-10 semaines (multi-providers, analytics, etc.)

---

## Prochaines Étapes Immédiates

1. Initialiser le projet Next.js avec TypeScript strict
2. Configurer Prisma avec le schéma complet
3. Mettre en place l'authentification NextAuth
4. Créer les premiers composants UI de base
5. Implémenter l'upload de templates

---

## Notes de Développement

- Respecter les règles TypeScript strictes définies
- Utiliser les alias `@/*` pour les imports
- Valider toutes les entrées avec Zod
- Gérer les erreurs de manière explicite
- Documenter les fonctions complexes
- Écrire des tests pour les services critiques

