# Oxygen Document — Application de Gestion d'Attestations

Application web Next.js pour la gestion et génération en masse d'attestations personnalisées avec édition visuelle de templates, import de données, génération PDF avec QR codes, et envoi par email.

## 🚀 Technologies

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript 5+ (strict mode)
- **Styling**: Tailwind CSS 3+
- **Database**: PostgreSQL
- **ORM**: Prisma 5+
- **Storage**: AWS S3 (ou Local/FTP pour dev)
- **Auth**: NextAuth.js 5+
- **PDF**: pdf-lib
- **QR Code**: qrcode
- **Canvas**: react-konva
- **CSV/Excel**: papaparse, xlsx
- **Jobs**: BullMQ + Redis
- **Email**: nodemailer

## 📋 Prérequis

- Node.js 18+
- PostgreSQL (local ou via Docker)
- Redis (pour BullMQ en production)
- AWS S3 (pour le stockage en production) - optionnel, peut utiliser Local/FTP

## 🔧 Installation

1. **Cloner le projet**

```bash
git clone <repository-url>
cd oxygen-document
```

2. **Installer les dépendances**

```bash
npm install
```

3. **Configurer l'environnement**

Copier `.env.example` vers `.env.local` et remplir les variables :

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/oxygen_document"

# NextAuth
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# Storage (optionnel - par défaut: local)
STORAGE_TYPE="local"  # Options: 'local', 's3', 'ftp'

# Pour S3 (si STORAGE_TYPE="s3")
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
S3_BUCKET_NAME=""
```

4. **Configurer la base de données**

```bash
# Générer le client Prisma
npm run db:generate

# Pousser le schéma vers la DB (dev)
npm run db:push

# Ou créer une migration (prod)
npm run db:migrate
```

5. **Configurer le stockage (optionnel)**

- **Local (par défaut)** : Les fichiers seront stockés dans `./uploads`
- **S3** : Configurer les credentials AWS dans `.env.local`
- **FTP** : Configurer les variables FTP dans `.env.local`

6. **Lancer le serveur de développement**

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000) dans le navigateur.

## 📁 Structure du Projet

```
oxygen-document/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Routes auth (group)
│   ├── dashboard/         # Dashboard principal
│   ├── projects/          # Gestion projets
│   ├── templates/         # Éditeur templates
│   └── api/               # API routes
├── components/            # Composants React
│   ├── ui/               # Composants UI de base
│   ├── template-editor/  # Éditeur visuel
│   └── ...
├── features/              # Features par domaine
│   ├── auth/
│   ├── projects/
│   └── ...
├── lib/                   # Utilitaires & config
│   ├── prisma.ts
│   ├── storage/          # Adaptateurs de stockage
│   └── ...
├── shared/               # Code partagé
│   ├── types/
│   ├── schemas/          # Zod schemas
│   └── utils/
└── prisma/               # Prisma schema
```

## 🔐 Authentification

L'authentification utilise NextAuth.js (email/password ou OAuth).

## 📦 Génération de Documents

### Formats supportés
- **PDF/Images** : Templates visuels avec éditeur graphique
- **DOCX** : Templates Word avec placeholders `{{variable}}`

### Fonctionnalités
- Upload de templates (PDF, PNG, JPG, DOCX)
- Éditeur visuel pour définir les zones (PDF/Images)
- Génération PDF avec pdf-lib
- **QR codes intégrés** avec authentification avancée
- Variables dynamiques et formatage
- Stockage sur S3, FTP ou local (selon configuration)

### 📚 Documentation QR Codes

Pour intégrer des QR Codes dans vos documents :

- **🚀 [Référence Rapide QR Code](./docs/QRCODE_QUICK_REFERENCE.md)** - Guide visuel en 2 minutes
- **📖 [Guide Complet par Type de Template](./docs/GUIDE_INTEGRATION_QRCODE_PAR_TYPE.md)** - Tutoriel détaillé
- **🔒 [Authentification des Certificats](./docs/GUIDE_AUTHENTIFICATION_CERTIFICATS.md)** - QR Codes sécurisés
- **⚙️ [Guide Complet QR Codes](./docs/GUIDE_QR_CODES.md)** - Documentation technique complète

## 📧 Emails

- Envoi via SMTP (nodemailer)
- Support pour SendGrid/AWS SES (optionnel)
- Jobs BullMQ pour envois en masse

## 🧪 Développement

```bash
# Dev server
npm run dev

# Build production
npm run build

# Start production
npm start

# Linting
npm run lint

# Prisma Studio
npm run db:studio
```

## 📝 Scripts Disponibles

- `npm run dev` - Serveur de développement
- `npm run build` - Build production
- `npm run start` - Serveur production
- `npm run lint` - Linter ESLint
- `npm run db:generate` - Générer client Prisma
- `npm run db:push` - Pousser schéma (dev)
- `npm run db:migrate` - Créer migration (prod)
- `npm run db:studio` - Ouvrir Prisma Studio

## 🐳 Production (Docker)

Voir `docker-compose.yml` pour la configuration de production avec PostgreSQL et Redis.

## 📄 License

Propriétaire

