#!/bin/bash

# ============================================================================
# Script de correction des fins de ligne pour les scripts shell
# ============================================================================
# Convertit les fins de ligne CRLF (Windows) en LF (Linux/Unix)
# Usage: ./scripts/fix-line-endings.sh
# ============================================================================

set -e

echo "============================================================================"
echo "Fixing line endings (CRLF -> LF)"
echo "============================================================================"
echo ""

# VÃ©rifier si dos2unix est disponible
if command -v dos2unix &> /dev/null; then
    echo "Using dos2unix..."
    find . -type f -name "*.sh" -print0 | xargs -0 dos2unix 2>/dev/null || true
    echo "Conversion finished with dos2unix"
else
    echo "dos2unix not available, using sed..."
    
    # Utiliser sed pour convertir CRLF en LF
    find . -type f -name "*.sh" -print0 | xargs -0 sed -i 's/\r$//'
    
    echo "Conversion finished with sed"
fi

# DÃ©finir les permissions d'exÃ©cution
echo ""
echo "Setting execution permissions..."
find . -type f -name "*.sh" -print0 | xargs -0 chmod +x 2>/dev/null || true

echo ""
echo "============================================================================"
echo "Fix complete!"
echo "============================================================================"