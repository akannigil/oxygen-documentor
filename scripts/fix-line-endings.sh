#!/bin/bash

# ============================================================================
# Script de correction des fins de ligne pour les scripts shell
# ============================================================================
# Convertit les fins de ligne CRLF (Windows) en LF (Linux/Unix)
# Usage: ./scripts/fix-line-endings.sh
# ============================================================================

set -e

echo "============================================================================"
echo "ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â§ Correction des fins de ligne (CRLF -> LF)"
echo "============================================================================"
echo ""

# VÃƒÆ’Ã‚Â©rifier si dos2unix est disponible
if command -v dos2unix &> /dev/null; then
    echo "Utilisation de dos2unix..."
    dos2unix deploy.sh test-docker-local.sh scripts/*.sh 2>/dev/null || true
    echo "ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Conversion terminÃƒÆ’Ã‚Â©e avec dos2unix"
else
    echo "dos2unix non disponible, utilisation de sed..."
    
    # Utiliser sed pour convertir CRLF en LF
    for file in deploy.sh test-docker-local.sh scripts/generate-secrets.sh scripts/docker-entrypoint.sh scripts/fix-permissions.sh scripts/fix-line-endings.sh; do
        if [ -f "$file" ]; then
            # Convertir CRLF en LF avec sed
            sed -i 's/\r$//' "$file"
            echo "  ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ $file corrigÃƒÆ’Ã‚Â©"
        fi
    done
    
    echo "ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Conversion terminÃƒÆ’Ã‚Â©e avec sed"
fi

# VÃƒÆ’Ã‚Â©rifier les shebangs et corriger si nÃƒÆ’Ã‚Â©cessaire
echo ""
echo "VÃƒÆ’Ã‚Â©rification des shebangs..."
for file in deploy.sh test-docker-local.sh scripts/generate-secrets.sh scripts/docker-entrypoint.sh scripts/fix-permissions.sh; do
    if [ -f "$file" ]; then
        # VÃƒÆ’Ã‚Â©rifier et corriger le shebang si nÃƒÆ’Ã‚Â©cessaire
        first_line=$(head -n 1 "$file" | tr -d '\r')
        if [[ ! "$first_line" =~ ^#!/bin/(bash|sh) ]]; then
            echo "  ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â  $file: shebang incorrect, correction..."
            if [[ "$file" == *"entrypoint"* ]]; then
                sed -i '1s|^.*|#!/bin/sh|' "$file"
            else
                sed -i '1s|^.*|#!/bin/bash|' "$file"
            fi
        fi
    fi
done

# DÃƒÆ’Ã‚Â©finir les permissions d'exÃƒÆ’Ã‚Â©cution
echo ""
echo "DÃƒÆ’Ã‚Â©finition des permissions d'exÃƒÆ’Ã‚Â©cution..."
chmod +x deploy.sh test-docker-local.sh scripts/*.sh 2>/dev/null || true

echo ""
echo "============================================================================"
echo "ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Correction terminÃƒÆ’Ã‚Â©e!"
echo "============================================================================"
echo ""
echo "Vous pouvez maintenant exÃƒÆ’Ã‚Â©cuter:"
echo "  ./deploy.sh --migrate"
echo ""

