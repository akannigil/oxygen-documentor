#!/bin/sh

# ============================================================================
# Docker Entrypoint Script - Oxygen Document
# ============================================================================
# Ce script s'exécute au démarrage du conteneur pour:
# 1. Attendre que PostgreSQL soit disponible
# 2. Exécuter les migrations Prisma si nécessaire
# 3. Démarrer l'application Next.js
# ============================================================================

set -e

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    printf "${BLUE}ℹ️  %s${NC}\n" "$1"
}

log_success() {
    printf "${GREEN}✅ %s${NC}\n" "$1"
}

log_error() {
    printf "${RED}❌ %s${NC}\n" "$1"
}

log_info "Démarrage du conteneur Oxygen Document..."

# Extraire les informations de connexion depuis DATABASE_URL
DB_HOST="postgres"
DB_USER="${POSTGRES_USER:-postgres}"

# Attendre que PostgreSQL soit disponible
log_info "Attente de PostgreSQL..."
MAX_RETRIES=30
RETRY_COUNT=0

until pg_isready -h "$DB_HOST" -U "$DB_USER" > /dev/null 2>&1; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        log_error "PostgreSQL n'est pas disponible après $MAX_RETRIES tentatives"
        exit 1
    fi
    log_info "PostgreSQL n'est pas encore prêt, attente... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

log_success "PostgreSQL est disponible"

# Attendre que Redis soit disponible
log_info "Attente de Redis..."
RETRY_COUNT=0

# Vérifier si redis-cli est disponible
if ! command -v redis-cli > /dev/null 2>&1; then
    log_error "redis-cli n'est pas installé dans le conteneur"
    exit 1
fi

# Attendre que Redis soit disponible (avec ou sans mot de passe)
if [ -n "$REDIS_PASSWORD" ]; then
    until redis-cli -h redis -a "$REDIS_PASSWORD" ping > /dev/null 2>&1; do
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
            log_error "Redis n'est pas disponible après $MAX_RETRIES tentatives"
            log_error "Vérifiez que le conteneur Redis est démarré et que REDIS_PASSWORD est correct"
            exit 1
        fi
        log_info "Redis n'est pas encore prêt, attente... ($RETRY_COUNT/$MAX_RETRIES)"
        sleep 2
    done
else
    until redis-cli -h redis ping > /dev/null 2>&1; do
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
            log_error "Redis n'est pas disponible après $MAX_RETRIES tentatives"
            log_error "Vérifiez que le conteneur Redis est démarré"
            exit 1
        fi
        log_info "Redis n'est pas encore prêt, attente... ($RETRY_COUNT/$MAX_RETRIES)"
        sleep 2
    done
fi

log_success "Redis est disponible"

# Générer le client Prisma (si nécessaire)
log_info "Génération du client Prisma..."
npx prisma generate

# Exécuter les migrations Prisma en production
if [ "$NODE_ENV" = "production" ]; then
    log_info "Exécution des migrations Prisma..."
    if npx prisma migrate deploy; then
        log_success "Migrations Prisma exécutées"
    else
        log_error "Erreur lors des migrations Prisma"
        exit 1
    fi
fi

log_success "Initialisation terminée, démarrage de l'application..."

# Démarrer l'application Next.js
exec "$@"