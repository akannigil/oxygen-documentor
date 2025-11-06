# ============================================================================
# Makefile pour Oxygen Document
# ============================================================================
# Facilite le développement et le déploiement de l'application
# ============================================================================

.PHONY: help dev build start stop restart logs clean deploy deploy-prod migrate backup restore

# Variables
DOCKER_COMPOSE_DEV = docker-compose -f docker-compose.yml
DOCKER_COMPOSE_PROD = docker-compose -f docker-compose.prod.yml --env-file .env.production

help: ## Afficher l'aide
	@echo "╔══════════════════════════════════════════════════════════════╗"
	@echo "║           Oxygen Document - Commandes disponibles           ║"
	@echo "╚══════════════════════════════════════════════════════════════╝"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ============================================================================
# Développement
# ============================================================================

dev: ## Démarrer l'environnement de développement
	@echo "🚀 Démarrage de l'environnement de développement..."
	$(DOCKER_COMPOSE_DEV) up -d
	@echo "✅ Services démarrés!"
	@echo "   - PostgreSQL: localhost:5432"
	@echo "   - Redis: localhost:6379"
	@echo ""
	@echo "Pour démarrer l'application Next.js:"
	@echo "   npm run dev"

dev-stop: ## Arrêter l'environnement de développement
	@echo "⏹️  Arrêt de l'environnement de développement..."
	$(DOCKER_COMPOSE_DEV) down
	@echo "✅ Services arrêtés!"

dev-logs: ## Voir les logs de développement
	$(DOCKER_COMPOSE_DEV) logs -f

# ============================================================================
# Production - Déploiement
# ============================================================================

deploy: ## Déployer en production (avec migrations)
	@echo "🚀 Déploiement en production..."
	@if [ ! -f .env.production ]; then \
		echo "❌ Erreur: .env.production n'existe pas!"; \
		echo "Copiez env.production.example vers .env.production"; \
		exit 1; \
	fi
	chmod +x deploy.sh
	./deploy.sh --migrate

deploy-no-cache: ## Déployer en production sans cache Docker
	@echo "🚀 Déploiement en production (sans cache)..."
	chmod +x deploy.sh
	./deploy.sh --no-cache --migrate

build: ## Construire les images Docker pour la production
	@echo "🔨 Construction des images Docker..."
	$(DOCKER_COMPOSE_PROD) build

start: ## Démarrer les services en production
	@echo "▶️  Démarrage des services..."
	$(DOCKER_COMPOSE_PROD) up -d
	@echo "✅ Services démarrés!"

stop: ## Arrêter les services en production
	@echo "⏹️  Arrêt des services..."
	$(DOCKER_COMPOSE_PROD) down
	@echo "✅ Services arrêtés!"

restart: ## Redémarrer les services en production
	@echo "🔄 Redémarrage des services..."
	$(DOCKER_COMPOSE_PROD) restart
	@echo "✅ Services redémarrés!"

logs: ## Voir les logs de production
	$(DOCKER_COMPOSE_PROD) logs -f

logs-app: ## Voir les logs de l'application uniquement
	$(DOCKER_COMPOSE_PROD) logs -f app

status: ## Vérifier le statut des services
	@echo "📊 Statut des services:"
	$(DOCKER_COMPOSE_PROD) ps

health: ## Vérifier la santé de l'application
	@echo "🏥 Vérification de la santé de l'application..."
	@curl -s http://localhost:3000/api/health | jq '.' || echo "❌ L'application ne répond pas"

# ============================================================================
# Base de données
# ============================================================================

migrate: ## Exécuter les migrations Prisma
	@echo "🗄️  Exécution des migrations Prisma..."
	$(DOCKER_COMPOSE_PROD) exec app npx prisma migrate deploy
	@echo "✅ Migrations exécutées!"

migrate-dev: ## Créer et exécuter une migration en développement
	npx prisma migrate dev

db-studio: ## Ouvrir Prisma Studio
	npx prisma studio

db-seed: ## Créer un utilisateur administrateur
	@echo "👤 Création d'un utilisateur..."
	$(DOCKER_COMPOSE_PROD) exec app npm run user:create

backup: ## Sauvegarder la base de données
	@echo "💾 Création d'une sauvegarde..."
	@mkdir -p backups
	$(DOCKER_COMPOSE_PROD) exec postgres pg_dump -U postgres oxygen_document > backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "✅ Sauvegarde créée dans backups/"

restore: ## Restaurer la base de données (usage: make restore FILE=backup.sql)
	@echo "📥 Restauration de la base de données..."
	@if [ -z "$(FILE)" ]; then \
		echo "❌ Erreur: Spécifiez un fichier avec FILE=backup.sql"; \
		exit 1; \
	fi
	cat $(FILE) | $(DOCKER_COMPOSE_PROD) exec -T postgres psql -U postgres oxygen_document
	@echo "✅ Base de données restaurée!"

# ============================================================================
# Maintenance
# ============================================================================

clean: ## Nettoyer les ressources Docker inutilisées
	@echo "🧹 Nettoyage des ressources Docker..."
	docker system prune -af --volumes
	@echo "✅ Nettoyage terminé!"

clean-volumes: ## Supprimer tous les volumes (⚠️  ATTENTION: Perte de données!)
	@echo "⚠️  ATTENTION: Cette action supprimera toutes les données!"
	@read -p "Êtes-vous sûr? (yes/no): " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		$(DOCKER_COMPOSE_PROD) down -v; \
		echo "✅ Volumes supprimés!"; \
	else \
		echo "❌ Annulé."; \
	fi

update: ## Mettre à jour l'application
	@echo "⬆️  Mise à jour de l'application..."
	git pull origin main
	$(MAKE) deploy
	@echo "✅ Mise à jour terminée!"

shell: ## Accéder au shell du conteneur app
	$(DOCKER_COMPOSE_PROD) exec app sh

shell-db: ## Accéder au shell PostgreSQL
	$(DOCKER_COMPOSE_PROD) exec postgres psql -U postgres oxygen_document

test-libreoffice: ## Tester LibreOffice dans le conteneur
	$(DOCKER_COMPOSE_PROD) exec app npm run test:libreoffice

# ============================================================================
# Tests & Qualité
# ============================================================================

lint: ## Exécuter le linter
	npm run lint

format: ## Formater le code avec Prettier
	npx prettier --write .

type-check: ## Vérifier les types TypeScript
	npx tsc --noEmit

# ============================================================================
# Installation & Configuration
# ============================================================================

install: ## Installer les dépendances
	npm ci

setup: ## Configuration initiale du projet
	@echo "🔧 Configuration initiale..."
	npm ci
	@if [ ! -f .env.production ]; then \
		echo "📝 Création de .env.production..."; \
		cp env.production.example .env.production; \
		echo "⚠️  N'oubliez pas de configurer .env.production!"; \
	fi
	chmod +x deploy.sh
	chmod +x scripts/docker-entrypoint.sh
	@echo "✅ Configuration terminée!"
	@echo ""
	@echo "Prochaines étapes:"
	@echo "  1. Configurez .env.production avec vos valeurs"
	@echo "  2. Lancez: make deploy"

# ============================================================================
# Monitoring
# ============================================================================

stats: ## Voir les statistiques d'utilisation des ressources
	docker stats

top: ## Voir les processus en cours
	$(DOCKER_COMPOSE_PROD) top

