# ============================================================================
# Stage 1: Dependencies - Installation des dépendances
# ============================================================================
FROM node:20-alpine AS deps

# Installation des dépendances système nécessaires pour Puppeteer, Prisma et LibreOffice
RUN apk add --no-cache \
    libc6-compat \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    postgresql-client \
    libreoffice \
    openjdk11-jre \
    fontconfig \
    ttf-dejavu

# Définir les variables d'environnement pour Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Copier les fichiers de dépendances
COPY package.json package-lock.json* ./

# Installation des dépendances (production + dev pour le build)
RUN npm ci

# ============================================================================
# Stage 2: Builder - Build de l'application Next.js
# ============================================================================
FROM node:20-alpine AS builder

# Installation des dépendances système nécessaires
RUN apk add --no-cache \
    libc6-compat \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    postgresql-client \
    openssl \
    libreoffice \
    openjdk11-jre \
    fontconfig \
    ttf-dejavu

# Variables d'environnement pour Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Copier les dépendances depuis l'étape précédente
COPY --from=deps /app/node_modules ./node_modules

# Copier tous les fichiers source
COPY . .

# Générer le client Prisma
RUN npx prisma generate

# Build de l'application Next.js
# Note: Les variables d'environnement de build peuvent être passées ici si nécessaire
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ============================================================================
# Stage 3: Runner - Image de production
# ============================================================================
FROM node:20-alpine AS runner

# Installation des dépendances système runtime
RUN apk add --no-cache \
    libc6-compat \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    postgresql-client \
    dumb-init \
    libreoffice \
    openjdk11-jre \
    fontconfig \
    ttf-dejavu \
    font-noto \
    font-noto-cjk \
    msttcorefonts-installer

# Installation des polices Microsoft (Times New Roman, Arial, etc.)
RUN update-ms-fonts && fc-cache -f

# Variables d'environnement pour Puppeteer et LibreOffice
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    LIBREOFFICE_PATH=/usr/bin/soffice

WORKDIR /app

# Configuration de l'environnement
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

# Créer un utilisateur non-root pour la sécurité
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Créer les répertoires nécessaires avec les bonnes permissions
RUN mkdir -p /app/uploads /app/.next && \
    chown -R nextjs:nodejs /app

# Copier les fichiers nécessaires depuis le builder
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Copier package.json pour les scripts prisma
COPY --chown=nextjs:nodejs package.json ./

# Copier le script d'entrypoint
COPY --chown=root:root scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nextjs

# Exposer le port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Utiliser dumb-init pour gérer les signaux correctement
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Démarrer l'application avec le script d'entrypoint
CMD ["/usr/local/bin/docker-entrypoint.sh", "node", "server.js"]

