# Script PowerShell pour generer Prisma avec reessai automatique
# Resout le probleme EPERM sur Windows

param(
    [int]$MaxRetries = 5,
    [int]$DelaySeconds = 3
)

$ErrorActionPreference = "Continue"
$retryCount = 0
$success = $false

Write-Host "Tentative de generation du client Prisma..." -ForegroundColor Cyan

# Supprimer le dossier .prisma si existe
$prismaPath = "node_modules\.prisma"
if (Test-Path $prismaPath) {
    Write-Host "Suppression du dossier .prisma existant..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $prismaPath -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

while ($retryCount -lt $MaxRetries -and -not $success) {
    $retryCount++
    Write-Host "`nTentative $retryCount/$MaxRetries..." -ForegroundColor Yellow
    
    # Supprimer le fichier cible s'il existe
    $targetFile = "node_modules\.prisma\client\query_engine-windows.dll.node"
    if (Test-Path $targetFile) {
        Remove-Item -Force $targetFile -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }
    
    # Executer prisma generate
    $result = & npx prisma generate 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nClient Prisma genere avec succes!" -ForegroundColor Green
        $success = $true
    } else {
        $errorMsg = $result | Select-String "EPERM"
        if ($errorMsg) {
            Write-Host "Erreur EPERM detectee. Attente de $DelaySeconds secondes avant reessai..." -ForegroundColor Red
            Start-Sleep -Seconds $DelaySeconds
        } else {
            Write-Host "Erreur inconnue:" -ForegroundColor Red
            $result | Write-Host
            break
        }
    }
}

if (-not $success) {
    Write-Host "`nEchec apres $MaxRetries tentatives." -ForegroundColor Red
    Write-Host "`nSolutions possibles:" -ForegroundColor Yellow
    Write-Host "1. Executer PowerShell en tant qu'administrateur" -ForegroundColor White
    Write-Host "2. Desactiver temporairement l'antivirus" -ForegroundColor White
    Write-Host "3. Ajouter une exception pour le dossier node_modules dans l'antivirus" -ForegroundColor White
    Write-Host "4. Redemarrer l'ordinateur et reessayer" -ForegroundColor White
    exit 1
}

exit 0
