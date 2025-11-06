# Guide de Configuration Initiale

## 🚀 Étapes de Configuration

### 1. Variables d'environnement

Créez un fichier `.env.local` à la racine du projet avec les valeurs suivantes :

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/oxygen_document"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="change-me-in-production-use-openssl-rand-base64-32"

# Storage Configuration
# Options: 'local', 's3', 'ftp'
STORAGE_TYPE="local"

# Storage - S3 (si STORAGE_TYPE="s3")
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
S3_BUCKET_NAME=""

# Storage - FTP (si STORAGE_TYPE="ftp")
FTP_HOST=""
FTP_USER=""
FTP_PASSWORD=""
FTP_PORT="21"
FTP_SECURE="false"
FTP_BASE_PATH=""

# Storage - Local (par défaut, si STORAGE_TYPE="local")
LOCAL_STORAGE_DIR="./uploads"

# Email Configuration (optionnel)
# Options: 'smtp', 'resend'
EMAIL_PROVIDER="smtp"

# Email - SMTP (si EMAIL_PROVIDER="smtp")
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER=""
SMTP_PASSWORD=""
EMAIL_FROM=""

# Email - Resend (si EMAIL_PROVIDER="resend")
RESEND_API_KEY=""
RESEND_FROM_EMAIL=""

# Email - Informations optionnelles
EMAIL_ORGANIZATION_NAME="Votre Organisation"
EMAIL_APP_NAME="Oxygen Document"
EMAIL_CONTACT="contact@example.com"
EMAIL_REPLY_TO="contact@example.com"
```

### 2. Configuration de la base de données PostgreSQL

#### Option A : PostgreSQL local

1. Installer PostgreSQL 14+ sur votre machine
2. Créer une base de données :
```sql
CREATE DATABASE oxygen_document;
```

3. Utiliser cette connexion dans `.env.local` :
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/oxygen_document"
```

#### Option B : Docker PostgreSQL (recommandé pour dev)

```bash
docker-compose up -d postgres
```

Cela démarrera PostgreSQL avec les configurations du `docker-compose.yml`.

### 3. Génération du client Prisma

```bash
npm run db:generate
```

### 4. Initialisation de la base de données

#### Option A : Pousser le schéma (recommandé pour dev)

```bash
npm run db:push
```

#### Option B : Créer une migration (recommandé pour prod)

```bash
npm run db:migrate
```

### 5. Configuration du stockage

#### Option A : Stockage Local (par défaut, pour dev)

Aucune configuration supplémentaire nécessaire. Les fichiers seront stockés dans `./uploads`.

#### Option B : AWS S3 (pour production)

1. Créer un bucket S3 sur AWS
2. Configurer les credentials AWS :
   - Créer un utilisateur IAM avec permissions S3
   - Générer des access keys
3. Ajouter dans `.env.local` :
```env
STORAGE_TYPE="s3"
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
S3_BUCKET_NAME="your-bucket-name"
```

#### Option C : FTP (optionnel)

```env
STORAGE_TYPE="ftp"
FTP_HOST="ftp.example.com"
FTP_USER="username"
FTP_PASSWORD="password"
FTP_PORT="21"
FTP_SECURE="false"
FTP_BASE_PATH="/documents"
```

### 6. Configuration Redis (optionnel, pour BullMQ)

> **Note** : Redis est utilisé pour les queues de jobs (BullMQ). Si vous n'utilisez pas les fonctionnalités de génération en masse ou d'envoi d'emails asynchrone, vous pouvez désactiver Redis.

#### Option A : Désactiver Redis (si non nécessaire)

Si vous n'avez pas besoin des queues BullMQ, vous pouvez désactiver Redis complètement :

```env
REDIS_DISABLED="true"
```

> **Avantage** : Évite les erreurs de connexion si Redis n'est pas disponible. Les fonctionnalités qui nécessitent Redis seront désactivées automatiquement.

#### Option B : Redis local avec Docker (recommandé pour dev)

```bash
docker-compose up -d redis
```

Puis ajouter dans `.env.local` :
```env
REDIS_URL="redis://localhost:6379"
```

#### Option C : Redis local (installation native)

Si Redis est installé localement :
```env
REDIS_URL="redis://localhost:6379"
```

#### Option D : Redis cloud (production)

Utiliser un service comme Upstash ou Redis Cloud et configurer :
```env
REDIS_URL="redis://username:password@host:port"
```

**Dépannage** :
- Si vous voyez des erreurs `ECONNREFUSED`, vérifiez que Redis est démarré : `docker ps` ou `redis-cli ping`
- Pour désactiver temporairement Redis : définir `REDIS_DISABLED="true"`

### 7. Vérification avec Prisma Studio

```bash
npm run db:studio
```

Cela ouvrira une interface graphique pour visualiser et gérer vos données.

### 8. Lancement du serveur de développement

```bash
npm run dev
```

Visitez [http://localhost:3000](http://localhost:3000)

## ✅ Checklist de Vérification

- [ ] Fichier `.env.local` créé avec toutes les variables
- [ ] PostgreSQL configuré et accessible
- [ ] Client Prisma généré (`npm run db:generate`)
- [ ] Schéma poussé vers la DB (`npm run db:push`)
- [ ] Stockage configuré (local, S3, ou FTP)
- [ ] Redis configuré (optionnel, pour BullMQ)
- [ ] Serveur de développement lancé (`npm run dev`)
- [ ] Application accessible sur http://localhost:3000

## 🔍 Vérification de la connexion à PostgreSQL

Testez la connexion avec Prisma Studio :

```bash
npm run db:studio
```

Ou directement avec psql :

```bash
psql -U postgres -d oxygen_document -c "SELECT 1;"
```

## 📝 Prochaines Étapes

Une fois la configuration de base terminée, vous pouvez :

1. Configurer NextAuth.js pour l'authentification
2. Créer les premières routes API
3. Développer l'interface utilisateur

Voir `PLAN_DE_MISE_EN_OEUVRE.md` pour le plan complet.
