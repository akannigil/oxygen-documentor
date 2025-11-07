#!/bin/bash

# ============================================================================
# Script de configuration des permissions pour les scripts shell
# ============================================================================
# Définit les permissions d'exécution pour tous les scripts .sh du projet
# Usage: ./scripts/fix-permissions.sh
# ============================================================================

set -e

echo "============================================================================"
echo "🔧 Configuration des permissions pour les scripts shell"
echo "============================================================================"
echo ""

# Définir les permissions d'exécution pour tous les scripts .sh
chmod +x deploy.sh
chmod +x test-docker-local.sh
chmod +x scripts/generate-secrets.sh
chmod +x scripts/docker-entrypoint.sh

echo "✅ Permissions d'exécution définies pour:"
echo "  - deploy.sh"
echo "  - test-docker-local.sh"
echo "  - scripts/generate-secrets.sh"
echo "  - scripts/docker-entrypoint.sh"
echo ""

# Vérifier les shebangs
echo "Vérification des shebangs..."
for script in deploy.sh test-docker-local.sh scripts/generate-secrets.sh scripts/docker-entrypoint.sh; do
    if [ -f "$script" ]; then
        first_line=$(head -n 1 "$script")
        if [[ "$first_line" =~ ^#!/bin/(bash|sh) ]]; then
            echo "  ✅ $script: shebang correct ($first_line)"
        else
            echo "  ⚠️  $script: shebang manquant ou incorrect"
        fi
    fi
done

echo ""
echo "============================================================================"
echo "✅ Configuration terminée!"
echo "============================================================================"
echo ""
echo "Note: Si vous êtes sur Windows et utilisez Git, assurez-vous que:"
echo "  1. Les fins de ligne sont en LF (pas CRLF)"
echo "  2. Exécutez: git config core.autocrlf false"
echo "  3. Ou utilisez: dos2unix *.sh scripts/*.sh"
echo ""