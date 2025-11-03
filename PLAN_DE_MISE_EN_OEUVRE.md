# Plan de Mise en Œuvre — Application de Gestion d'Attestations

## Vue d'ensemble

Application web Next.js (App Router) pour la gestion et génération en masse d'attestations personnalisées avec édition visuelle de templates, import de données, génération PDF avec QR codes, et envoi par email.

---

## Phases de Développement

### ✅ Phase 1 : Infrastructure & Configuration (Jours 1-3) — TERMINÉE

#### 1.1 Structure du projet
- [x] Initialiser Next.js avec App Router + TypeScript strict
- [x] Configurer Tailwind CSS
- [x] Configurer les alias de chemins (`@/*`)
- [x] Structure des dossiers (features, shared, lib)

#### 1.2 Base de données
- [x] Installer Prisma
- [x] Créer le schéma Prisma complet (User, Project, Template, Document)
- [x] Configurer PostgreSQL (ou Supabase)
- [x] Générer le client Prisma
- [x] Créer les migrations initiales

#### 1.3 Configuration environnement
- [x] Fichier `.env.example` avec toutes les variables
- [x] Configuration TypeScript stricte (tsconfig.json)
- [x] ESLint + Prettier
- [ ] Configuration Vercel/Production (partiel — docker-compose disponible)

#### 1.4 Authentification
- [x] Installer NextAuth.js
- [x] Configurer providers (email/password, OAuth optionnel)
- [x] Modèle User avec rôles (owner, editor, viewer)
- [x] Middleware de protection des routes
- [x] Pages de login/signup

---

### ✅ Phase 2 : CRUD Projets & Templates (Jours 4-6) — TERMINÉE

#### 2.1 Gestion des projets
- [x] API routes : `GET /api/projects`, `POST /api/projects`
- [x] API route : `GET /api/projects/[id]`, `PUT /api/projects/[id]`, `DELETE`
- [x] Vérification des permissions (owner uniquement pour modifier)
- [x] Pages frontend : liste projets, création, édition

#### 2.2 Upload de templates
- [x] API route : `POST /api/projects/[id]/templates`
- [x] Upload multipart (formidable ou form-data)
- [x] Validation : taille max, types (PDF, PNG, JPG, DOCX)
- [x] Intégration avec adaptateur de stockage
- [x] Création du record Template en DB
- [x] Support templates DOCX avec parsing variables

#### 2.3 Lecture et extraction de templates
- [x] API route : `GET /api/templates/[id]`
- [x] Service pour récupérer fichier depuis stockage
- [x] Extraction de métadonnées (dimensions pour images, variables pour DOCX)
- [x] Page frontend : affichage template + métadonnées

---

### ✅ Phase 3 : Éditeur Visuel de Zones (Jours 7-10) — TERMINÉE

#### 3.1 Canvas et affichage
- [x] Installer `react-konva` ou `fabric.js` (react-konva implémenté)
- [x] Composant `TemplateEditor` : affichage template (PDF première page ou image)
- [x] Conversion PDF première page en image pour canvas (si nécessaire)
- [x] Zoom, pan sur le canvas (via ImprovedTemplateEditor)

#### 3.2 Gestion des zones
- [x] Ajouter zone (click + drag rectangle)
- [x] Sélection, déplacement, redimensionnement (handles)
- [x] Suppression de zones
- [x] Propriétés de zone : key, type (text/qrcode), fontSize, align, format

#### 3.3 Sauvegarde des définitions
- [x] API route : `PUT /api/templates/[id]/fields`
- [x] Stockage JSON des zones dans Prisma (champ `fields`)
- [x] Aperçu avec valeurs demo
- [ ] Export/Import JSON de configuration (non implémenté)

---

### ✅ Phase 4 : Import de Données & Mapping (Jours 11-13) — TERMINÉE

#### 4.1 Upload et parsing CSV
- [x] Page frontend : upload CSV/XLSX (composant CSVExcelImport)
- [x] Client-side parsing : `papaparse` (CSV) + `xlsx` (Excel)
- [x] Aperçu des colonnes détectées
- [x] Validation format et encodage

#### 4.2 Mapping colonnes → clés
- [x] Interface de mapping : dropdown colonnes → template keys
- [x] Prévisualisation 10 premières lignes avec mapping (composant MappingPreview)
- [x] Gestion des types (string, date, number)
- [x] Validation : toutes les clés requises mappées ?

#### 4.3 API d'import
- [x] Parsing client-side (papaparse/xlsx) — intégré dans le workflow de génération
- [x] Validation et mapping effectués côté client
- [x] Données passées directement à l'API de génération

---

### ✅ Phase 5 : Service de Génération PDF (Jours 14-17) — TERMINÉE

#### 5.1 Génération single document
- [x] Service `generateDocumentFromTemplate()` :
  - Charge template depuis stockage
  - Pour PDF : utilise `pdf-lib` pour charger
  - Pour image : crée PDF depuis image avec `pdf-lib`
  - Pour DOCX : génération via docxtemplater + conversion PDF optionnelle
  - Parcourt les champs définis
- [x] Placement texte : `page.drawText()` avec font, taille, align
- [x] Génération QR code : `qrcode.toDataURL()` → embed PNG dans PDF
- [x] Formattage (date, uppercase, masks)
- [x] Génération buffer final
- [x] Support génération DOCX avec variables {{...}}

#### 5.2 Stockage du document généré
- [x] Upload sur S3 (ou autre) : `projects/{projectId}/documents/{documentId}.pdf`
- [x] Création record `Document` en DB (filePath, mimeType, status: "generated")
- [x] Retour URL ou signed URL (temps limité)

#### 5.3 API de génération
- [x] API route : `POST /api/projects/[id]/generate`
- [x] Body : `{ templateId, rows: [...] }`
- [x] Validation template + données
- [x] Génération synchrone (batch jusqu'à 100 documents)

---

### ⚠️ Phase 6 : Jobs & Génération en Lot (Jours 18-20) — PARTIELLEMENT IMPLÉMENTÉE

#### 6.1 Configuration BullMQ
- [x] Installer BullMQ + Redis (dépendances installées)
- [ ] Configuration Redis (local ou cloud)
- [ ] Queue : `document-generation`
- [ ] Worker : traitement des jobs

#### 6.2 Job de génération batch
- [ ] API route `/generate` : crée job BullMQ (génération synchrone actuellement)
- [ ] Worker : traite chaque ligne → appelle `generateDocument()`
- [ ] Progression : événements/métriques (optionnel WebSocket)
- [ ] API route : `GET /api/jobs/[id]` pour status

#### 6.3 Gestion des erreurs
- [ ] Retry sur échec (3 tentatives)
- [ ] Logging des erreurs par document (console.error seulement)
- [x] Statut "failed" dans DB (structure prête, pas d'implémentation complète)

---

### ⚠️ Phase 7 : Système d'Envoi Email (Jours 21-23) — PARTIELLEMENT IMPLÉMENTÉE

#### 7.1 Configuration SMTP
- [x] Installer `nodemailer` (dépendance installée)
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

### ✅ Phase 8 : Interface Dashboard & Historique (Jours 24-26) — TERMINÉE

#### 8.1 Dashboard principal
- [x] Page `/dashboard` : vue d'ensemble projets
- [x] Statistiques : nombre templates, documents générés/sent
- [x] Liste projets avec compteurs
- [x] Actions rapides (nouveau projet)

#### 8.2 Liste des documents
- [x] Page `/projects/[id]/documents`
- [ ] Filtres : status (generated, sent, failed), date
- [ ] Recherche par destinataire
- [ ] Pagination
- [x] Téléchargement individuel (signed URL via API)

#### 8.3 Détails document
- [x] Page `/documents/[id]`
- [x] Métadonnées : template, données utilisées, dates
- [ ] Aperçu PDF (iframe ou viewer)
- [x] Actions : supprimer (renvoyer, régénérer à implémenter)

#### 8.4 Export historique
- [ ] Export CSV de la liste documents (métadonnées)
- [ ] Filtres appliqués dans l'export

---

### ⚠️ Phase 9 : Sécurité & Optimisations (Jours 27-29) — PARTIELLEMENT IMPLÉMENTÉE

#### 9.1 Sécurité
- [ ] Rate limiting (API routes sensibles : `/generate`, `/import`)
- [ ] Vérification uploads : scan virus (ClamAV optionnel)
- [x] Signed URLs pour S3 (expiration configurable) — implémenté dans storage adapters
- [x] Validation stricte des données (Zod schemas) — utilisé partout
- [ ] Sanitization des inputs (basique via Zod)

#### 9.2 Permissions & RBAC
- [x] Middleware vérifiant authentification
- [x] Vérification ownerId pour projets/templates/documents
- [ ] Restrictions : viewer ne peut pas modifier/générer (structure prête, pas de logique métier)
- [ ] Audit log (optionnel) : qui a fait quoi

#### 9.3 Performance
- [ ] Cache des templates (Redis)
- [ ] Compression des PDFs générés (optionnel)
- [ ] Optimisation images (resize avant upload)
- [ ] Lazy loading des listes

---

### ⚠️ Phase 10 : Tests & Documentation (Jours 30-32) — PARTIELLEMENT IMPLÉMENTÉE

#### 10.1 Tests unitaires
- [ ] Tests services : génération PDF, QR codes
- [ ] Tests adaptateurs stockage
- [ ] Tests parsing CSV/Excel
- [ ] Tests utilitaires (formattage, validation)

#### 10.2 Tests d'intégration
- [ ] Tests API routes (Vitest + supertest ou Playwright)
- [ ] Tests flux complet : import → génération → envoi

#### 10.3 Documentation
- [x] README avec installation et configuration
- [ ] Documentation API (Swagger/OpenAPI optionnel)
- [x] Guide utilisateur (création template, import, génération) — docs/ avec guides QR codes, certificats, DOCX
- [x] Documentation déploiement (Docker-compose disponible)

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

### ✅ Priorité 1 (Core) — TERMINÉE
- [x] Auth + CRUD projets
- [x] Upload template + éditeur zones visuel
- [x] Import CSV/Excel + mapping
- [x] Génération single doc (pdf-lib + qrcode) + stockage
- [x] Support templates DOCX avec variables

### ⚠️ Priorité 2 (Fonctionnel) — PARTIELLEMENT TERMINÉE
- [x] Historique documents (liste et détails)
- [ ] Batch generate + worker (génération synchrone batch, pas de worker async)
- [ ] Envoi email (SMTP) + logging (nodemailer installé, service non implémenté)

### ⚠️ Priorité 3 (Production-ready) — PARTIELLEMENT TERMINÉE
- [x] Role-based access + signed URLs (structure prête, vérification ownerId)
- [ ] Rate limiting
- [x] Tests + documentation (documentation présente, tests manquants)
- [ ] Monitoring & logs

---

## Estimation Globale

- **MVP Fonctionnel** : ~3-4 semaines (1 développeur full-time)
- **Production-ready** : ~5-6 semaines (incluant tests, sécurité, optimisations)
- **Avec features avancées** : ~8-10 semaines (multi-providers, analytics, etc.)

---

## État d'Avancement Global

**Progression globale : ~70%**

### Phases terminées (✅)
- Phase 1 : Infrastructure & Configuration — **100%**
- Phase 2 : CRUD Projets & Templates — **100%**
- Phase 3 : Éditeur Visuel de Zones — **95%**
- Phase 4 : Import de Données & Mapping — **100%**
- Phase 5 : Service de Génération PDF — **100%**
- Phase 8 : Interface Dashboard & Historique — **85%**

### Phases partiellement terminées (⚠️)
- Phase 6 : Jobs & Génération en Lot — **30%** (dépendances installées, workers non implémentés)
- Phase 7 : Système d'Envoi Email — **25%** (nodemailer installé, service non implémenté)
- Phase 9 : Sécurité & Optimisations — **50%** (validation Zod, signed URLs, permissions basiques)
- Phase 10 : Tests & Documentation — **60%** (documentation présente, tests manquants)

### Fonctionnalités supplémentaires implémentées
- ✅ Support templates DOCX avec variables `{{...}}`
- ✅ Génération DOCX avec docxtemplater
- ✅ Conversion DOCX → PDF avec Puppeteer
- ✅ QR codes avec authentification de certificats
- ✅ Système de stockage multi-adapter (S3, Local, FTP)

## Prochaines Étapes Immédiates

1. ✅ ~~Initialiser le projet Next.js avec TypeScript strict~~ — **FAIT**
2. ✅ ~~Configurer Prisma avec le schéma complet~~ — **FAIT**
3. ✅ ~~Mettre en place l'authentification NextAuth~~ — **FAIT**
4. ✅ ~~Créer les premiers composants UI de base~~ — **FAIT**
5. ✅ ~~Implémenter l'upload de templates~~ — **FAIT**

### Prochaines priorités

1. **Implémenter le système d'envoi d'emails** (Phase 7)
   - Service `sendDocumentEmail()` avec nodemailer
   - API route `POST /api/documents/[id]/send`
   - Template email HTML

2. **Implémenter les workers BullMQ** (Phase 6)
   - Configuration Redis
   - Queue `document-generation`
   - Worker pour batch processing
   - API route pour suivre le statut des jobs

3. **Améliorer la sécurité** (Phase 9)
   - Rate limiting sur les routes sensibles
   - RBAC complet (viewer/editor/owner)
   - Optimisations performance (cache Redis)

4. **Tests et documentation** (Phase 10)
   - Tests unitaires pour services critiques
   - Tests d'intégration pour API routes
   - Documentation API (Swagger/OpenAPI)

---

## Notes de Développement

- Respecter les règles TypeScript strictes définies
- Utiliser les alias `@/*` pour les imports
- Valider toutes les entrées avec Zod
- Gérer les erreurs de manière explicite
- Documenter les fonctions complexes
- Écrire des tests pour les services critiques

