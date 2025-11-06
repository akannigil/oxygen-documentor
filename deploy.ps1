# ============================================================================
# Script de déploiement pour Oxygen Document (Production) - Windows
# ============================================================================
# Ce script aide au déploiement de l'application sur un VPS avec Docker
# Usage: .\deploy.ps1 [-BuildOnly] [-NoCache] [-Migrate]
# Options:
#   -BuildOnly    : Construire uniquement les images sans démarrer
#   -NoCache      : Construire sans utiliser le cache Docker
#   -Migrate      : Exécuter les migrations Prisma après le déploiement
# ============================================================================

param(
    [switch]$BuildOnly,
    [switch]$NoCache,
    [switch]$Migrate
)

$ErrorActionPreference = "Stop"

# Fonction pour afficher les messages avec couleurs
function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "🚀 Déploiement de Oxygen Document (Production)" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier que le fichier .env.production existe
if (-not (Test-Path ".env.production")) {
    Write-Error-Custom "Le fichier .env.production n'existe pas!"
    Write-Info "Copiez env.production.example vers .env.production et configurez-le."
    Write-Info "cp env.production.example .env.production"
    exit 1
}

Write-Success "Fichier .env.production trouvé"

# Charger les variables d'environnement
Get-Content .env.production | ForEach-Object {
    if ($_ -match '^([^#][^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        [System.Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

# Vérifier les variables critiques
$requiredVars = @("POSTGRES_PASSWORD", "REDIS_PASSWORD", "NEXTAUTH_SECRET", "NEXTAUTH_URL")
$missingVars = @()

foreach ($var in $requiredVars) {
    if ([string]::IsNullOrEmpty([System.Environment]::GetEnvironmentVariable($var))) {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-Error-Custom "Variables d'environnement manquantes dans .env.production:"
    foreach ($var in $missingVars) {
        Write-Host "  - $var" -ForegroundColor Red
    }
    exit 1
}

Write-Success "Toutes les variables d'environnement requises sont présentes"

# Construire les options Docker Compose
$buildOpts = ""
if ($NoCache) {
    $buildOpts = "--no-cache"
    Write-Info "Construction sans cache Docker"
}

# Arrêter les conteneurs existants
Write-Info "Arrêt des conteneurs existants..."
docker-compose -f docker-compose.prod.yml --env-file .env.production down

# Construire les images
Write-Info "Construction des images Docker..."
if ($buildOpts) {
    docker-compose -f docker-compose.prod.yml --env-file .env.production build $buildOpts
} else {
    docker-compose -f docker-compose.prod.yml --env-file .env.production build
}

if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "Erreur lors de la construction des images"
    exit 1
}

Write-Success "Images construites avec succès"

# Si mode build-only, s'arrêter ici
if ($BuildOnly) {
    Write-Success "Mode build-only: images construites, déploiement non effectué"
    exit 0
}

# Démarrer les services
Write-Info "Démarrage des services..."
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "Erreur lors du démarrage des services"
    exit 1
}

# Attendre que la base de données soit prête
Write-Info "Attente de la disponibilité de PostgreSQL..."
Start-Sleep -Seconds 10

# Exécuter les migrations Prisma si demandé
if ($Migrate) {
    Write-Info "Exécution des migrations Prisma..."
    docker-compose -f docker-compose.prod.yml --env-file .env.production exec app npx prisma migrate deploy
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Migrations exécutées"
    } else {
        Write-Warning "Erreur lors des migrations (peut-être déjà appliquées)"
    }
}

# Vérifier l'état des services
Write-Info "Vérification de l'état des services..."
docker-compose -f docker-compose.prod.yml --env-file .env.production ps

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Success "Déploiement terminé avec succès!"
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

$appPort = [System.Environment]::GetEnvironmentVariable("APP_PORT")
if ([string]::IsNullOrEmpty($appPort)) {
    $appPort = "3000"
}

Write-Info "Services disponibles:"
Write-Host "  - Application: http://localhost:$appPort" -ForegroundColor White
Write-Host "  - Base de données: localhost:5432" -ForegroundColor White
Write-Host "  - Redis: localhost:6379" -ForegroundColor White
Write-Host ""

Write-Info "Commandes utiles:"
Write-Host "  - Logs: docker-compose -f docker-compose.prod.yml logs -f" -ForegroundColor White
Write-Host "  - Arrêter: docker-compose -f docker-compose.prod.yml down" -ForegroundColor White
Write-Host "  - Redémarrer: docker-compose -f docker-compose.prod.yml restart" -ForegroundColor White
Write-Host ""

Write-Warning "N'oubliez pas de configurer votre Nginx Proxy Manager pour pointer vers le port $appPort"
Write-Host ""

