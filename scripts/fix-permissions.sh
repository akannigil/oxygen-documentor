#!/bin/bash

# ============================================================================
# Script de configuration des permissions pour les scripts shell
# ============================================================================
# DÃƒÆ’Ã‚Â©finit les permissions d'exÃƒÆ’Ã‚Â©cution pour tous les scripts .sh du projet
# Usage: ./scripts/fix-permissions.sh
# ============================================================================

set -e

echo "============================================================================"
echo "ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â§ Configuration des permissions pour les scripts shell"
echo "============================================================================"
echo ""

# DÃƒÆ’Ã‚Â©finir les permissions d'exÃƒÆ’Ã‚Â©cution pour tous les scripts .sh
chmod +x deploy.sh
chmod +x test-docker-local.sh
chmod +x scripts/generate-secrets.sh
chmod +x scripts/docker-entrypoint.sh

echo "ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Permissions d'exÃƒÆ’Ã‚Â©cution dÃƒÆ’Ã‚Â©finies pour:"
echo "  - deploy.sh"
echo "  - test-docker-local.sh"
echo "  - scripts/generate-secrets.sh"
echo "  - scripts/docker-entrypoint.sh"
echo ""

# VÃƒÆ’Ã‚Â©rifier les shebangs
echo "VÃƒÆ’Ã‚Â©rification des shebangs..."
for script in deploy.sh test-docker-local.sh scripts/generate-secrets.sh scripts/docker-entrypoint.sh; do
    if [ -f "$script" ]; then
        first_line=$(head -n 1 "$script")
        if [[ "$first_line" =~ ^#!/bin/(bash|sh) ]]; then
            echo "  ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ $script: shebang correct ($first_line)"
        else
            echo "  ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â  $script: shebang manquant ou incorrect"
        fi
    fi
done

echo ""
echo "============================================================================"
echo "ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Configuration terminÃƒÆ’Ã‚Â©e!"
echo "============================================================================"
echo ""
echo "Note: Si vous ÃƒÆ’Ã‚Âªtes sur Windows et utilisez Git, assurez-vous que:"
echo "  1. Les fins de ligne sont en LF (pas CRLF)"
echo "  2. ExÃƒÆ’Ã‚Â©cutez: git config core.autocrlf false"
echo "  3. Ou utilisez: dos2unix *.sh scripts/*.sh"
echo ""

