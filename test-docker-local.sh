#!/bin/bash

# ============================================================================
# Script de test Docker en local
# ============================================================================
# Teste la configuration Docker localement avant le déploiement sur le VPS
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

echo "============================================================================"
echo "🧪 Test de la configuration Docker en local"
echo "============================================================================"
echo ""

# Vérifier que Docker est installé
if ! command -v docker &> /dev/null; then
    log_error "Docker n'est pas installé!"
    exit 1
fi

log_success "Docker est installé"

# Vérifier que Docker Compose est installé
if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose n'est pas installé!"
    exit 1
fi

log_success "Docker Compose est installé"

# Créer un fichier .env.production de test
if [ ! -f ".env.production" ]; then
    log_warning ".env.production n'existe pas, création d'un fichier de test..."
    
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
    
    # Générer DATABASE_URL et REDIS_URL
    POSTGRES_PASS=$(grep POSTGRES_PASSWORD .env.production | cut -d '=' -f2)
    REDIS_PASS=$(grep REDIS_PASSWORD .env.production | cut -d '=' -f2)
    echo "DATABASE_URL=postgresql://postgres:${POSTGRES_PASS}@postgres:5432/oxygen_document?schema=public" >> .env.production
    echo "REDIS_URL=redis://:${REDIS_PASS}@redis:6379" >> .env.production
    
    log_success "Fichier .env.production de test créé"
fi

# Nettoyer les conteneurs existants
log_info "Nettoyage des conteneurs existants..."
docker-compose -f docker-compose.prod.yml --env-file .env.production down -v 2>/dev/null || true

# Construire l'image
log_info "Construction de l'image Docker..."
echo ""
docker-compose -f docker-compose.prod.yml --env-file .env.production build

if [ $? -ne 0 ]; then
    log_error "Erreur lors de la construction de l'image"
    exit 1
fi

log_success "Image construite avec succès"
echo ""

# Démarrer les services
log_info "Démarrage des services..."
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

if [ $? -ne 0 ]; then
    log_error "Erreur lors du démarrage des services"
    exit 1
fi

log_success "Services démarrés"
echo ""

# Attendre que les services soient prêts
log_info "Attente de la disponibilité des services (60s max)..."
MAX_WAIT=60
ELAPSED=0

while [ $ELAPSED -lt $MAX_WAIT ]; do
    if docker-compose -f docker-compose.prod.yml --env-file .env.production ps | grep -q "healthy"; then
        break
    fi
    sleep 2
    ELAPSED=$((ELAPSED + 2))
    echo -n "."
done

echo ""
echo ""

# Vérifier l'état des services
log_info "État des services:"
docker-compose -f docker-compose.prod.yml --env-file .env.production ps
echo ""

# Tester le health check
log_info "Test du health check..."
sleep 10  # Attendre un peu plus pour que l'app soit vraiment prête

HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)

if [ "$HEALTH_STATUS" = "200" ]; then
    log_success "Health check: OK (HTTP $HEALTH_STATUS)"
    echo ""
    curl -s http://localhost:3000/api/health | jq '.' 2>/dev/null || curl -s http://localhost:3000/api/health
    echo ""
else
    log_error "Health check: ÉCHEC (HTTP $HEALTH_STATUS)"
    log_warning "Vérification des logs..."
    docker-compose -f docker-compose.prod.yml --env-file .env.production logs app | tail -30
fi

echo ""
echo "============================================================================"

if [ "$HEALTH_STATUS" = "200" ]; then
    log_success "✨ Test réussi!"
    echo ""
    log_info "L'application est accessible à: http://localhost:3000"
    echo ""
    log_info "Commandes utiles:"
    echo "  - Voir les logs: docker-compose -f docker-compose.prod.yml logs -f"
    echo "  - Arrêter: docker-compose -f docker-compose.prod.yml down"
    echo "  - Créer un utilisateur: docker-compose -f docker-compose.prod.yml exec app npm run user:create"
    echo ""
    log_warning "Appuyez sur Ctrl+C puis tapez la commande ci-dessous pour arrêter:"
    echo "docker-compose -f docker-compose.prod.yml --env-file .env.production down"
else
    log_error "❌ Test échoué!"
    echo ""
    log_info "Vérifiez les logs pour plus de détails:"
    echo "docker-compose -f docker-compose.prod.yml --env-file .env.production logs"
    echo ""
    log_info "Pour nettoyer et réessayer:"
    echo "docker-compose -f docker-compose.prod.yml --env-file .env.production down -v"
    echo "./test-docker-local.sh"
fi

echo "============================================================================"

