# ============================================================================
# Script de génération de secrets pour Oxygen Document (Windows)
# ============================================================================
# Génère des secrets cryptographiquement sécurisés pour la production
# Usage: .\scripts\generate-secrets.ps1
# ============================================================================

$ErrorActionPreference = "Stop"

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Generate-Secret {
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    return [Convert]::ToBase64String($bytes)
}

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "🔐 Génération de secrets pour Oxygen Document" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

# Générer les secrets
$NEXTAUTH_SECRET = Generate-Secret
$POSTGRES_PASSWORD = Generate-Secret
$REDIS_PASSWORD = Generate-Secret

Write-ColorOutput "Secrets générés avec succès !" "Blue"
Write-Host ""
Write-Host "============================================================================"
Write-Host ""

Write-ColorOutput "NEXTAUTH_SECRET:" "Green"
Write-Host $NEXTAUTH_SECRET
Write-Host ""

Write-ColorOutput "POSTGRES_PASSWORD:" "Green"
Write-Host $POSTGRES_PASSWORD
Write-Host ""

Write-ColorOutput "REDIS_PASSWORD:" "Green"
Write-Host $REDIS_PASSWORD
Write-Host ""

Write-Host "============================================================================"
Write-Host ""
Write-ColorOutput "⚠️  IMPORTANT :" "Yellow"
Write-Host "1. Copiez ces valeurs dans votre fichier .env.production"
Write-Host "2. Ne partagez JAMAIS ces secrets"
Write-Host "3. Conservez une copie sécurisée (gestionnaire de mots de passe)"
Write-Host ""
Write-Host "Pour générer l'URL complète de la base de données :"
Write-Host "DATABASE_URL=postgresql://postgres:$POSTGRES_PASSWORD@postgres:5432/oxygen_document?schema=public"
Write-Host ""
Write-Host "Pour générer l'URL Redis :"
Write-Host "REDIS_URL=redis://:$REDIS_PASSWORD@redis:6379"
Write-Host ""

# Option pour écrire directement dans .env.production
$response = Read-Host "Voulez-vous créer automatiquement .env.production ? (y/n)"
if ($response -eq "y" -or $response -eq "Y") {
    if (Test-Path ".env.production") {
        Write-ColorOutput "⚠️  .env.production existe déjà!" "Yellow"
        $replace = Read-Host "Voulez-vous le remplacer ? (y/n)"
        if ($replace -ne "y" -and $replace -ne "Y") {
            Write-Host "Annulé. Secrets affichés ci-dessus."
            exit 0
        }
    }

    Write-ColorOutput "Création de .env.production..." "Blue"
    
    if (-not (Test-Path "env.production.example")) {
        Write-ColorOutput "⚠️  env.production.example non trouvé, création manuelle..." "Yellow"
        
        $date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $envContent = @"
# ============================================================================
# Configuration de Production - Oxygen Document
# ============================================================================
# Secrets générés le $date

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
"@
        Set-Content -Path ".env.production" -Value $envContent
    } else {
        Copy-Item "env.production.example" ".env.production"
        
        # Remplacer les valeurs dans .env.production
        $content = Get-Content ".env.production" -Raw
        $content = $content -replace "NEXTAUTH_SECRET=.*", "NEXTAUTH_SECRET=$NEXTAUTH_SECRET"
        $content = $content -replace "POSTGRES_PASSWORD=.*", "POSTGRES_PASSWORD=$POSTGRES_PASSWORD"
        $content = $content -replace "REDIS_PASSWORD=.*", "REDIS_PASSWORD=$REDIS_PASSWORD"
        $content = $content -replace "DATABASE_URL=.*", "DATABASE_URL=postgresql://postgres:$POSTGRES_PASSWORD@postgres:5432/oxygen_document?schema=public"
        $content = $content -replace "REDIS_URL=.*", "REDIS_URL=redis://:$REDIS_PASSWORD@redis:6379"
        
        Set-Content -Path ".env.production" -Value $content
    }
    
    Write-ColorOutput "✅ .env.production créé avec succès!" "Green"
    Write-Host ""
    Write-ColorOutput "⚠️  N'oubliez pas de configurer les variables suivantes :" "Yellow"
    Write-Host "  - NEXTAUTH_URL (votre domaine public)"
    Write-Host "  - AWS_* (configuration S3) ou FTP_* (configuration FTP)"
    Write-Host "  - RESEND_API_KEY ou SMTP_* (configuration email)"
    Write-Host ""
    Write-Host "Éditez le fichier : notepad .env.production"
}

Write-Host ""
Write-ColorOutput "✅ Terminé !" "Green"

