# 📜 Scripts Utilitaires - Oxygen Document

Ce dossier contient tous les scripts utilitaires pour la gestion et le déploiement de l'application.

## 🔐 Scripts de génération de secrets

### `generate-secrets.sh` (Linux/Mac)

Génère automatiquement des secrets cryptographiquement sécurisés pour la production.

**Usage :**

```bash
chmod +x scripts/generate-secrets.sh
./scripts/generate-secrets.sh
```

**Fonctionnalités :**

- ✅ Génère NEXTAUTH_SECRET, POSTGRES_PASSWORD, REDIS_PASSWORD
- ✅ Affiche les URLs de connexion complètes
- ✅ Option pour créer automatiquement `.env.production`
- ✅ Permissions sécurisées (chmod 600) automatiquement

### `generate-secrets.ps1` (Windows)

Version PowerShell du générateur de secrets.

**Usage :**

```powershell
.\scripts\generate-secrets.ps1
```

**Fonctionnalités identiques à la version Linux/Mac.**

## 🐳 Scripts Docker

### `docker-entrypoint.sh`

Script d'initialisation du conteneur Docker, exécuté automatiquement au démarrage.

**Fonctionnalités :**

- ✅ Attend la disponibilité de PostgreSQL (avec retry)
- ✅ Attend la disponibilité de Redis (avec retry)
- ✅ Génère le client Prisma
- ✅ Exécute les migrations en production
- ✅ Gestion d'erreurs robuste

**Note :** Ce script est copié dans l'image Docker et n'a pas besoin d'être exécuté manuellement.

## 👤 Scripts de gestion des utilisateurs

### `create-user.ts`

Script pour créer un utilisateur administrateur.

**Usage :**

```bash
# En développement
npm run user:create

# En production (dans le conteneur)
docker-compose -f docker-compose.prod.yml exec app npm run user:create

# Ou avec Make
make db-seed
```

## ⚙️ Scripts de workers

### `start-workers.ts`

Démarre manuellement les workers BullMQ pour le traitement des jobs en arrière-plan.

**Usage :**

```bash
# En développement (si les workers ne sont pas auto-démarrés)
npm run workers
```

**Note :** En production, les workers sont automatiquement démarrés via `instrumentation.ts`.

## 🔄 Script de génération Prisma

### `generate-prisma.ps1`

Script PowerShell pour générer le client Prisma avec gestion d'erreurs.

**Usage :**

```powershell
npm run db:generate:retry
```

**Note :** Principalement utilisé en développement sur Windows en cas de problèmes.

## 📊 Arborescence

```
scripts/
├── README.md                    # Ce fichier
├── create-user.ts              # Création d'utilisateur
├── start-workers.ts            # Démarrage des workers
├── generate-prisma.ps1         # Génération Prisma (Windows)
├── generate-secrets.sh         # Génération de secrets (Linux/Mac)
├── generate-secrets.ps1        # Génération de secrets (Windows)
└── docker-entrypoint.sh        # Entrypoint Docker
```

## 🚀 Guide rapide

### Première installation

1. **Générer les secrets :**

   ```bash
   # Linux/Mac
   ./scripts/generate-secrets.sh

   # Windows
   .\scripts\generate-secrets.ps1
   ```

2. **Compléter la configuration :**

   ```bash
   nano .env.production  # Ou notepad .env.production sur Windows
   ```

3. **Déployer :**

   ```bash
   ./deploy.sh --migrate
   ```

4. **Créer le premier utilisateur :**
   ```bash
   make db-seed
   ```

## 🔒 Sécurité

### Bonnes pratiques

- ✅ Toujours générer des secrets aléatoires (ne jamais utiliser de valeurs par défaut)
- ✅ Ne jamais committer `.env.production`
- ✅ Conserver une copie sécurisée des secrets (gestionnaire de mots de passe)
- ✅ Changer régulièrement les secrets (rotation)
- ✅ Utiliser des permissions strictes (chmod 600) sur les fichiers de configuration

### Rotation des secrets

Pour changer les secrets en production :

1. Générer de nouveaux secrets
2. Mettre à jour `.env.production`
3. Redémarrer les services :
   ```bash
   docker-compose -f docker-compose.prod.yml restart
   ```

## 🆘 Dépannage

### Problème : Les secrets ne sont pas reconnus

**Solution :** Assurez-vous que le fichier `.env.production` a les bonnes permissions :

```bash
chmod 600 .env.production
```

### Problème : Le script generate-secrets.sh n'est pas exécutable

**Solution :**

```bash
chmod +x scripts/generate-secrets.sh
```

### Problème : Erreur "openssl: command not found"

**Solution :** Installer OpenSSL :

```bash
# Ubuntu/Debian
sudo apt-get install openssl

# macOS
brew install openssl

# Windows
# Utiliser generate-secrets.ps1 à la place
```

### Problème : PowerShell refuse d'exécuter le script

**Solution :** Modifier la politique d'exécution :

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 📚 Ressources

- [Documentation de déploiement complète](../DEPLOIEMENT.md)
- [Guide de démarrage rapide](../QUICKSTART-DEPLOY.md)
- [Résumé des fichiers de déploiement](../RESUME-DEPLOIEMENT.md)

## 💡 Astuces

### Automatisation avec cron (Linux)

Pour automatiser les sauvegardes quotidiennes :

```bash
# Éditer crontab
crontab -e

# Ajouter cette ligne (sauvegarde tous les jours à 2h du matin)
0 2 * * * cd /var/www/oxygen-document && make backup
```

### Notification par email en cas d'erreur

Ajouter à la fin de `docker-entrypoint.sh` :

```bash
if [ $? -ne 0 ]; then
    echo "Erreur lors du démarrage!" | mail -s "Erreur Oxygen Document" admin@example.com
fi
```

## 🎯 Contribution

Pour ajouter un nouveau script :

1. Créer le script dans ce dossier
2. Le rendre exécutable : `chmod +x scripts/nouveau-script.sh`
3. Ajouter la documentation dans ce README
4. Optionnel : Ajouter une commande dans le Makefile

## 📝 Notes

- Tous les scripts shell utilisent `#!/bin/bash` ou `#!/bin/sh`
- Les scripts PowerShell ont l'extension `.ps1`
- Les scripts TypeScript/Node.js ont l'extension `.ts` et sont exécutés via `tsx`
