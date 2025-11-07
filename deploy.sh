#!/bin/bash

# ============================================================================
# Script de dÃƒÆ’Ã‚Â©ploiement pour Oxygen Document (Production)
# ============================================================================
# Ce script aide au dÃƒÆ’Ã‚Â©ploiement de l'application sur un VPS avec Docker
# Usage: ./deploy.sh [options]
# Options:
#   --build-only    : Construire uniquement les images sans dÃƒÆ’Ã‚Â©marrer
#   --no-cache      : Construire sans utiliser le cache Docker
#   --migrate       : ExÃƒÆ’Ã‚Â©cuter les migrations Prisma aprÃƒÆ’Ã‚Â¨s le dÃƒÆ’Ã‚Â©ploiement
# ============================================================================

set -e  # ArrÃƒÆ’Ã‚Âªter en cas d'erreur

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
log_info() {
    echo -e "${BLUE}ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¹ÃƒÂ¯Ã‚Â¸Ã‚Â  $1${NC}"
}

log_success() {
    echo -e "${GREEN}ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â  $1${NC}"
}

log_error() {
    echo -e "${RED}ÃƒÂ¢Ã‚ÂÃ…â€™ $1${NC}"
}

# Variables
BUILD_ONLY=false
NO_CACHE=false
RUN_MIGRATE=false

# DÃƒÆ’Ã‚Â©tecter la commande Docker Compose (V1 ou V2)
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
else
    log_error "Docker Compose n'est pas installÃƒÆ’Ã‚Â©!"
    exit 1
fi

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
echo "ÃƒÂ°Ã…Â¸Ã…Â¡Ã¢â€šÂ¬ DÃƒÆ’Ã‚Â©ploiement de Oxygen Document (Production)"
echo "============================================================================"

# VÃƒÆ’Ã‚Â©rifier que le fichier .env.production existe
if [ ! -f ".env.production" ]; then
    log_error "Le fichier .env.production n'existe pas!"
    log_info "Copiez env.production.example vers .env.production et configurez-le."
    log_info "cp env.production.example .env.production"
    exit 1
fi

log_success "Fichier .env.production trouvÃƒÆ’Ã‚Â©"

# Charger les variables d'environnement
export $(grep -v '^#' .env.production | xargs)

# VÃƒÆ’Ã‚Â©rifier les variables critiques
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

log_success "Toutes les variables d'environnement requises sont prÃƒÆ’Ã‚Â©sentes"

# Construire les options Docker Compose
BUILD_OPTS=""
if [ "$NO_CACHE" = true ]; then
    BUILD_OPTS="--no-cache"
    log_info "Construction sans cache Docker"
fi

# ArrÃƒÆ’Ã‚Âªter les conteneurs existants
log_info "ArrÃƒÆ’Ã‚Âªt des conteneurs existants..."
$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml --env-file .env.production down

# Construire les images
log_info "Construction des images Docker..."
$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml --env-file .env.production build $BUILD_OPTS

log_success "Images construites avec succÃƒÆ’Ã‚Â¨s"

# Si mode build-only, s'arrÃƒÆ’Ã‚Âªter ici
if [ "$BUILD_ONLY" = true ]; then
    log_success "Mode build-only: images construites, dÃƒÆ’Ã‚Â©ploiement non effectuÃƒÆ’Ã‚Â©"
    exit 0
fi

# DÃƒÆ’Ã‚Â©marrer les services
log_info "DÃƒÆ’Ã‚Â©marrage des services..."
$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml --env-file .env.production up -d

# Attendre que la base de donnÃƒÆ’Ã‚Â©es soit prÃƒÆ’Ã‚Âªte
log_info "Attente de la disponibilitÃƒÆ’Ã‚Â© de PostgreSQL..."
sleep 10

# ExÃƒÆ’Ã‚Â©cuter les migrations Prisma si demandÃƒÆ’Ã‚Â©
if [ "$RUN_MIGRATE" = true ]; then
    log_info "ExÃƒÆ’Ã‚Â©cution des migrations Prisma..."
    $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml --env-file .env.production exec app npx prisma migrate deploy
    log_success "Migrations exÃƒÆ’Ã‚Â©cutÃƒÆ’Ã‚Â©es"
fi

# VÃƒÆ’Ã‚Â©rifier l'ÃƒÆ’Ã‚Â©tat des services
log_info "VÃƒÆ’Ã‚Â©rification de l'ÃƒÆ’Ã‚Â©tat des services..."
$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml --env-file .env.production ps

echo ""
echo "============================================================================"
log_success "DÃƒÆ’Ã‚Â©ploiement terminÃƒÆ’Ã‚Â© avec succÃƒÆ’Ã‚Â¨s!"
echo "============================================================================"
echo ""
log_info "Services disponibles:"
echo "  - Application: http://localhost:${APP_PORT:-3000}"
echo "  - Base de donnÃƒÆ’Ã‚Â©es: localhost:5432"
echo "  - Redis: localhost:6379"
echo ""
log_info "Commandes utiles:"
echo "  - Logs: $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml logs -f"
echo "  - ArrÃƒÆ’Ã‚Âªter: $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml down"
echo "  - RedÃƒÆ’Ã‚Â©marrer: $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml restart"
echo ""
log_warning "N'oubliez pas de configurer votre Nginx Proxy Manager pour pointer vers le port ${APP_PORT:-3000}"
echo ""

