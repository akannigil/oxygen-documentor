#!/bin/sh

# ============================================================================
# Docker Entrypoint Script - Oxygen Document
# ============================================================================
# Ce script s'exÃƒÆ’Ã‚Â©cute au dÃƒÆ’Ã‚Â©marrage du conteneur pour:
# 1. Attendre que PostgreSQL soit disponible
# 2. ExÃƒÆ’Ã‚Â©cuter les migrations Prisma si nÃƒÆ’Ã‚Â©cessaire
# 3. DÃƒÆ’Ã‚Â©marrer l'application Next.js
# ============================================================================

set -e

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    printf "${BLUE}ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¹ÃƒÂ¯Ã‚Â¸Ã‚Â  %s${NC}\n" "$1"
}

log_success() {
    printf "${GREEN}ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ %s${NC}\n" "$1"
}

log_error() {
    printf "${RED}ÃƒÂ¢Ã‚ÂÃ…â€™ %s${NC}\n" "$1"
}

log_info "DÃƒÆ’Ã‚Â©marrage du conteneur Oxygen Document..."

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
        log_error "PostgreSQL n'est pas disponible aprÃƒÆ’Ã‚Â¨s $MAX_RETRIES tentatives"
        exit 1
    fi
    log_info "PostgreSQL n'est pas encore prÃƒÆ’Ã‚Âªt, attente... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

log_success "PostgreSQL est disponible"

# Attendre que Redis soit disponible (si REDIS_PASSWORD est dÃƒÆ’Ã‚Â©fini)
if [ -n "$REDIS_PASSWORD" ]; then
    log_info "Attente de Redis..."
    RETRY_COUNT=0
    until redis-cli -h redis -a "$REDIS_PASSWORD" ping > /dev/null 2>&1; do
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
            log_error "Redis n'est pas disponible aprÃƒÆ’Ã‚Â¨s $MAX_RETRIES tentatives"
            exit 1
        fi
        log_info "Redis n'est pas encore prÃƒÆ’Ã‚Âªt, attente... ($RETRY_COUNT/$MAX_RETRIES)"
        sleep 2
    done
    log_success "Redis est disponible"
else
    log_info "Attente de Redis..."
    RETRY_COUNT=0
    until redis-cli -h redis ping > /dev/null 2>&1; do
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
            log_error "Redis n'est pas disponible aprÃƒÆ’Ã‚Â¨s $MAX_RETRIES tentatives"
            exit 1
        fi
        log_info "Redis n'est pas encore prÃƒÆ’Ã‚Âªt, attente... ($RETRY_COUNT/$MAX_RETRIES)"
        sleep 2
    done
    log_success "Redis est disponible"
fi

# GÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©rer le client Prisma (si nÃƒÆ’Ã‚Â©cessaire)
log_info "GÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©ration du client Prisma..."
npx prisma generate

# ExÃƒÆ’Ã‚Â©cuter les migrations Prisma en production
if [ "$NODE_ENV" = "production" ]; then
    log_info "ExÃƒÆ’Ã‚Â©cution des migrations Prisma..."
    if npx prisma migrate deploy; then
        log_success "Migrations Prisma exÃƒÆ’Ã‚Â©cutÃƒÆ’Ã‚Â©es"
    else
        log_error "Erreur lors des migrations Prisma"
        exit 1
    fi
fi

log_success "Initialisation terminÃƒÆ’Ã‚Â©e, dÃƒÆ’Ã‚Â©marrage de l'application..."

# DÃƒÆ’Ã‚Â©marrer l'application Next.js
exec "$@"

