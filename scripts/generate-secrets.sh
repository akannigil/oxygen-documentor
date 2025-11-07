#!/bin/bash

# ============================================================================
# Script de génération de secrets pour Oxygen Document
# ============================================================================
# Génère des secrets cryptographiquement sécurisés pour la production
# Usage: ./scripts/generate-secrets.sh
# ============================================================================

set -e

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "============================================================================"
echo "🔐 Génération de secrets pour Oxygen Document"
echo "============================================================================"
echo ""

# Fonction pour générer un secret
generate_secret() {
    openssl rand -base64 32 | tr -d '\n'
}

# Générer les secrets
NEXTAUTH_SECRET=$(generate_secret)
POSTGRES_PASSWORD=$(generate_secret)
REDIS_PASSWORD=$(generate_secret)

echo -e "${BLUE}Secrets générés avec succès !${NC}"
echo ""
echo "============================================================================"
echo ""

echo -e "${GREEN}NEXTAUTH_SECRET:${NC}"
echo "$NEXTAUTH_SECRET"
echo ""

echo -e "${GREEN}POSTGRES_PASSWORD:${NC}"
echo "$POSTGRES_PASSWORD"
echo ""

echo -e "${GREEN}REDIS_PASSWORD:${NC}"
echo "$REDIS_PASSWORD"
echo ""

echo "============================================================================"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT :${NC}"
echo "1. Copiez ces valeurs dans votre fichier .env.production"
echo "2. Ne partagez JAMAIS ces secrets"
echo "3. Conservez une copie sécurisée (gestionnaire de mots de passe)"
echo ""
echo "Pour générer l'URL complète de la base de données :"
echo "DATABASE_URL=postgresql://postgres:$POSTGRES_PASSWORD@postgres:5432/oxygen_document?schema=public"
echo ""
echo "Pour générer l'URL Redis :"
echo "REDIS_URL=redis://:$REDIS_PASSWORD@redis:6379"
echo ""

# Option pour écrire directement dans .env.production
read -p "Voulez-vous créer automatiquement .env.production ? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -f ".env.production" ]; then
        echo -e "${YELLOW}⚠️  .env.production existe déjà !${NC}"
        read -p "Voulez-vous le remplacer ? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Annulé. Secrets affichés ci-dessus."
            exit 0
        fi
    fi

    echo -e "${BLUE}Création de .env.production...${NC}"
    
    if [ ! -f "env.production.example" ]; then
        echo -e "${YELLOW}⚠️  env.production.example non trouvé, création manuelle...${NC}"
        cat > .env.production << EOF
# ============================================================================
# Configuration de Production - Oxygen Document
# ============================================================================
# Secrets générés le $(date)

NODE_ENV=production
APP_PORT=3000

# URL publique de l'application
NEXTAUTH_URL=https://votre-domaine.com

# Secrets générés automatiquement
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
REDIS_PASSWORD=$REDIS_PASSWORD

# Base de données PostgreSQL
POSTGRES_USER=postgres
POSTGRES_DB=oxygen_document
DATABASE_URL=postgresql://postgres:$POSTGRES_PASSWORD@postgres:5432/oxygen_document?schema=public

# Redis
REDIS_URL=redis://:$REDIS_PASSWORD@redis:6379

# Stockage (à configurer)
STORAGE_TYPE=s3
AWS_REGION=eu-west-3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=

# Email (à configurer)
EMAIL_PROVIDER=resend
RESEND_API_KEY=

# Configuration
NEXT_TELEMETRY_DISABLED=1
ENABLE_WORKERS_IN_DEV=false
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
EOF
    else
        cp env.production.example .env.production
        
        # Remplacer les valeurs dans .env.production
        # Utiliser sed -i compatible Linux (GNU sed)
        # Sur Linux, sed -i nécessite une extension pour le backup, ou on peut utiliser sed -i '' sur macOS
        # Ici on utilise une approche compatible avec les deux systèmes
        if sed --version >/dev/null 2>&1; then
            # GNU sed (Linux)
            sed -i "s|NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=$NEXTAUTH_SECRET|g" .env.production
            sed -i "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$POSTGRES_PASSWORD|g" .env.production
            sed -i "s|REDIS_PASSWORD=.*|REDIS_PASSWORD=$REDIS_PASSWORD|g" .env.production
            sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql://postgres:$POSTGRES_PASSWORD@postgres:5432/oxygen_document?schema=public|g" .env.production
            sed -i "s|REDIS_URL=.*|REDIS_URL=redis://:$REDIS_PASSWORD@redis:6379|g" .env.production
        else
            # BSD sed (macOS)
            sed -i '' "s|NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=$NEXTAUTH_SECRET|g" .env.production
            sed -i '' "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$POSTGRES_PASSWORD|g" .env.production
            sed -i '' "s|REDIS_PASSWORD=.*|REDIS_PASSWORD=$REDIS_PASSWORD|g" .env.production
            sed -i '' "s|DATABASE_URL=.*|DATABASE_URL=postgresql://postgres:$POSTGRES_PASSWORD@postgres:5432/oxygen_document?schema=public|g" .env.production
            sed -i '' "s|REDIS_URL=.*|REDIS_URL=redis://:$REDIS_PASSWORD@redis:6379|g" .env.production
        fi
    fi
    
    chmod 600 .env.production
    
    echo -e "${GREEN}✅ .env.production créé avec succès!${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  N'oubliez pas de configurer les variables suivantes :${NC}"
    echo "  - NEXTAUTH_URL (votre domaine public)"
    echo "  - AWS_* (configuration S3) ou FTP_* (configuration FTP)"
    echo "  - RESEND_API_KEY ou SMTP_* (configuration email)"
    echo ""
    echo "Éditez le fichier : nano .env.production"
fi

echo ""
echo -e "${GREEN}✅ Terminé !${NC}"