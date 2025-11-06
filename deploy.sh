#!/bin/bash

# ============================================================================
# Script de déploiement pour Oxygen Document (Production)
# ============================================================================
# Ce script aide au déploiement de l'application sur un VPS avec Docker
# Usage: ./deploy.sh [options]
# Options:
#   --build-only    : Construire uniquement les images sans démarrer
#   --no-cache      : Construire sans utiliser le cache Docker
#   --migrate       : Exécuter les migrations Prisma après le déploiement
# ============================================================================

set -e  # Arrêter en cas d'erreur

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Variables
BUILD_ONLY=false
NO_CACHE=false
RUN_MIGRATE=false

# Parser les arguments
for arg in "$@"; do
    case $arg in
        --build-only)
            BUILD_ONLY=true
            shift
            ;;
        --no-cache)
            NO_CACHE=true
            shift
            ;;
        --migrate)
            RUN_MIGRATE=true
            shift
            ;;
        *)
            ;;
    esac
done

echo "============================================================================"
echo "🚀 Déploiement de Oxygen Document (Production)"
echo "============================================================================"

# Vérifier que le fichier .env.production existe
if [ ! -f ".env.production" ]; then
    log_error "Le fichier .env.production n'existe pas!"
    log_info "Copiez env.production.example vers .env.production et configurez-le."
    log_info "cp env.production.example .env.production"
    exit 1
fi

log_success "Fichier .env.production trouvé"

# Charger les variables d'environnement
export $(grep -v '^#' .env.production | xargs)

# Vérifier les variables critiques
REQUIRED_VARS=("POSTGRES_PASSWORD" "REDIS_PASSWORD" "NEXTAUTH_SECRET" "NEXTAUTH_URL")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    log_error "Variables d'environnement manquantes dans .env.production:"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    exit 1
fi

log_success "Toutes les variables d'environnement requises sont présentes"

# Construire les options Docker Compose
BUILD_OPTS=""
if [ "$NO_CACHE" = true ]; then
    BUILD_OPTS="--no-cache"
    log_info "Construction sans cache Docker"
fi

# Arrêter les conteneurs existants
log_info "Arrêt des conteneurs existants..."
docker-compose -f docker-compose.prod.yml --env-file .env.production down

# Construire les images
log_info "Construction des images Docker..."
docker-compose -f docker-compose.prod.yml --env-file .env.production build $BUILD_OPTS

log_success "Images construites avec succès"

# Si mode build-only, s'arrêter ici
if [ "$BUILD_ONLY" = true ]; then
    log_success "Mode build-only: images construites, déploiement non effectué"
    exit 0
fi

# Démarrer les services
log_info "Démarrage des services..."
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# Attendre que la base de données soit prête
log_info "Attente de la disponibilité de PostgreSQL..."
sleep 10

# Exécuter les migrations Prisma si demandé
if [ "$RUN_MIGRATE" = true ]; then
    log_info "Exécution des migrations Prisma..."
    docker-compose -f docker-compose.prod.yml --env-file .env.production exec app npx prisma migrate deploy
    log_success "Migrations exécutées"
fi

# Vérifier l'état des services
log_info "Vérification de l'état des services..."
docker-compose -f docker-compose.prod.yml --env-file .env.production ps

echo ""
echo "============================================================================"
log_success "Déploiement terminé avec succès!"
echo "============================================================================"
echo ""
log_info "Services disponibles:"
echo "  - Application: http://localhost:${APP_PORT:-3000}"
echo "  - Base de données: localhost:5432"
echo "  - Redis: localhost:6379"
echo ""
log_info "Commandes utiles:"
echo "  - Logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "  - Arrêter: docker-compose -f docker-compose.prod.yml down"
echo "  - Redémarrer: docker-compose -f docker-compose.prod.yml restart"
echo ""
log_warning "N'oubliez pas de configurer votre Nginx Proxy Manager pour pointer vers le port ${APP_PORT:-3000}"
echo ""

