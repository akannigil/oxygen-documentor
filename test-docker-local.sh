#!/bin/bash

# ============================================================================
# Script de test Docker en local
# ============================================================================
# Teste la configuration Docker localement avant le dÃƒÆ’Ã‚Â©ploiement sur le VPS
# Usage: ./test-docker-local.sh
# ============================================================================

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

echo "============================================================================"
echo "ÃƒÂ°Ã…Â¸Ã‚Â§Ã‚Âª Test de la configuration Docker en local"
echo "============================================================================"
echo ""

# VÃƒÆ’Ã‚Â©rifier que Docker est installÃƒÆ’Ã‚Â©
if ! command -v docker &> /dev/null; then
    log_error "Docker n'est pas installÃƒÆ’Ã‚Â©!"
    exit 1
fi

log_success "Docker est installÃƒÆ’Ã‚Â©"

# DÃƒÆ’Ã‚Â©tecter la commande Docker Compose (V1 ou V2)
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
    log_success "Docker Compose V1 dÃƒÆ’Ã‚Â©tectÃƒÆ’Ã‚Â©"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
    log_success "Docker Compose V2 dÃƒÆ’Ã‚Â©tectÃƒÆ’Ã‚Â©"
else
    log_error "Docker Compose n'est pas installÃƒÆ’Ã‚Â©!"
    exit 1
fi

# CrÃƒÆ’Ã‚Â©er un fichier .env.production de test
if [ ! -f ".env.production" ]; then
    log_warning ".env.production n'existe pas, crÃƒÆ’Ã‚Â©ation d'un fichier de test..."
    
    cat > .env.production << EOF
NODE_ENV=production
APP_PORT=3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=$(openssl rand -base64 32)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$(openssl rand -base64 32)
POSTGRES_DB=oxygen_document
REDIS_PASSWORD=$(openssl rand -base64 32)
STORAGE_TYPE=local
EMAIL_PROVIDER=resend
RESEND_API_KEY=test_key
NEXT_TELEMETRY_DISABLED=1
ENABLE_WORKERS_IN_DEV=false
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
EOF
    
    # GÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©rer DATABASE_URL et REDIS_URL
    POSTGRES_PASS=$(grep POSTGRES_PASSWORD .env.production | cut -d '=' -f2)
    REDIS_PASS=$(grep REDIS_PASSWORD .env.production | cut -d '=' -f2)
    echo "DATABASE_URL=postgresql://postgres:${POSTGRES_PASS}@postgres:5432/oxygen_document?schema=public" >> .env.production
    echo "REDIS_URL=redis://:${REDIS_PASS}@redis:6379" >> .env.production
    
    log_success "Fichier .env.production de test crÃƒÆ’Ã‚Â©ÃƒÆ’Ã‚Â©"
fi

# Nettoyer les conteneurs existants
log_info "Nettoyage des conteneurs existants..."
$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml --env-file .env.production down -v 2>/dev/null || true

# Construire l'image
log_info "Construction de l'image Docker..."
echo ""
$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml --env-file .env.production build

if [ $? -ne 0 ]; then
    log_error "Erreur lors de la construction de l'image"
    exit 1
fi

log_success "Image construite avec succÃƒÆ’Ã‚Â¨s"
echo ""

# DÃƒÆ’Ã‚Â©marrer les services
log_info "DÃƒÆ’Ã‚Â©marrage des services..."
$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml --env-file .env.production up -d

if [ $? -ne 0 ]; then
    log_error "Erreur lors du dÃƒÆ’Ã‚Â©marrage des services"
    exit 1
fi

log_success "Services dÃƒÆ’Ã‚Â©marrÃƒÆ’Ã‚Â©s"
echo ""

# Attendre que les services soient prÃƒÆ’Ã‚Âªts
log_info "Attente de la disponibilitÃƒÆ’Ã‚Â© des services (60s max)..."
MAX_WAIT=60
ELAPSED=0

while [ $ELAPSED -lt $MAX_WAIT ]; do
    if $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml --env-file .env.production ps | grep -q "healthy"; then
        break
    fi
    sleep 2
    ELAPSED=$((ELAPSED + 2))
    echo -n "."
done

echo ""
echo ""

# VÃƒÆ’Ã‚Â©rifier l'ÃƒÆ’Ã‚Â©tat des services
log_info "ÃƒÆ’Ã¢â‚¬Â°tat des services:"
$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml --env-file .env.production ps
echo ""

# Tester le health check
log_info "Test du health check..."
sleep 10  # Attendre un peu plus pour que l'app soit vraiment prÃƒÆ’Ã‚Âªte

HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)

if [ "$HEALTH_STATUS" = "200" ]; then
    log_success "Health check: OK (HTTP $HEALTH_STATUS)"
    echo ""
    curl -s http://localhost:3000/api/health | jq '.' 2>/dev/null || curl -s http://localhost:3000/api/health
    echo ""
else
    log_error "Health check: ÃƒÆ’Ã¢â‚¬Â°CHEC (HTTP $HEALTH_STATUS)"
    log_warning "VÃƒÆ’Ã‚Â©rification des logs..."
    $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml --env-file .env.production logs app | tail -30
fi

echo ""
echo "============================================================================"

if [ "$HEALTH_STATUS" = "200" ]; then
    log_success "ÃƒÂ¢Ã…â€œÃ‚Â¨ Test rÃƒÆ’Ã‚Â©ussi!"
    echo ""
    log_info "L'application est accessible ÃƒÆ’Ã‚Â : http://localhost:3000"
    echo ""
    log_info "Commandes utiles:"
    echo "  - Voir les logs: $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml logs -f"
    echo "  - ArrÃƒÆ’Ã‚Âªter: $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml down"
    echo "  - CrÃƒÆ’Ã‚Â©er un utilisateur: $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml exec app npm run user:create"
    echo ""
    log_warning "Appuyez sur Ctrl+C puis tapez la commande ci-dessous pour arrÃƒÆ’Ã‚Âªter:"
    echo "$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml --env-file .env.production down"
else
    log_error "ÃƒÂ¢Ã‚ÂÃ…â€™ Test ÃƒÆ’Ã‚Â©chouÃƒÆ’Ã‚Â©!"
    echo ""
    log_info "VÃƒÆ’Ã‚Â©rifiez les logs pour plus de dÃƒÆ’Ã‚Â©tails:"
    echo "$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml --env-file .env.production logs"
    echo ""
    log_info "Pour nettoyer et rÃƒÆ’Ã‚Â©essayer:"
    echo "$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml --env-file .env.production down -v"
    echo "./test-docker-local.sh"
fi

echo "============================================================================"

