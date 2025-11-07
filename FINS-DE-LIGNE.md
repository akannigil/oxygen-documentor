# Guide de résolution des problèmes de fins de ligne

## Problème résolu ✅

Les fichiers `.sh` ont été corrigés et utilisent maintenant des fins de ligne LF (Linux/Unix) au lieu de CRLF (Windows).

## Pour éviter ce problème à l'avenir

### 1. Configuration Git recommandée

Le fichier `.gitattributes` a été créé pour forcer les fins de ligne LF pour tous les fichiers `.sh`.

Pour appliquer cette configuration à votre dépôt Git :

```bash
# Sur Linux/Mac
git config core.autocrlf false

# Ou pour ce dépôt uniquement
git config core.autocrlf input
```

### 2. Si le problème se reproduit

#### Sur Linux/Mac :
```bash
# Option 1: Utiliser dos2unix (si installé)
dos2unix *.sh scripts/*.sh

# Option 2: Utiliser sed
find . -name "*.sh" -type f -exec sed -i 's/\r$//' {} \;

# Option 3: Utiliser le script de correction
chmod +x scripts/fix-line-endings.sh
./scripts/fix-line-endings.sh
```

#### Sur Windows (PowerShell) :
```powershell
# Utiliser le script PowerShell
.\fix-line-endings.ps1
```

### 3. Vérification

Pour vérifier les fins de ligne d'un fichier sur Linux :
```bash
file deploy.sh
# Devrait afficher: deploy.sh: Bourne-Again shell script, ASCII text executable
# Si vous voyez "with CRLF line terminators", le fichier a encore des problèmes
```

Ou avec `hexdump` :
```bash
hexdump -C deploy.sh | head -n 1
# Cherchez "0d 0a" (CRLF) - devrait être "0a" (LF) seulement
```

## Commandes utiles

```bash
# Rendre les scripts exécutables
chmod +x deploy.sh test-docker-local.sh scripts/*.sh

# Vérifier les permissions
ls -l *.sh scripts/*.sh
```

## Note importante

Le fichier `.gitattributes` garantit que Git convertira automatiquement les fins de ligne lors des commits/push. Assurez-vous de commiter ce fichier :

```bash
git add .gitattributes
git commit -m "Ajout de .gitattributes pour gérer les fins de ligne"
```

