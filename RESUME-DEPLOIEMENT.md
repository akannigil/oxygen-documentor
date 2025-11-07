# 📦 Résumé des Fichiers de Déploiement

Voici un résumé de tous les fichiers créés pour le déploiement de l'application Oxygen Document en production avec Docker.

## 🗂️ Fichiers créés

### 1. **Dockerfile** ⭐ Principal

Configuration Docker multi-stage optimisée pour la production :

- **Stage 1** : Installation des dépendances
- **Stage 2** : Build de l'application Next.js avec Prisma
- **Stage 3** : Image de production minimale avec Alpine Linux

**Caractéristiques :**

- ✅ Support Puppeteer/Chromium pour génération PDF
- ✅ Support Prisma pour la base de données
- ✅ Utilisateur non-root pour la sécurité
- ✅ Health checks intégrés
- ✅ Mode standalone Next.js pour optimisation

### 2. **docker-compose.prod.yml** ⭐ Principal

Configuration Docker Compose pour la production :

- Service PostgreSQL 15 avec volumes persistants
- Service Redis 7 avec authentification
- Service Application Next.js avec toutes les dépendances
- Réseaux isolés et health checks

**Caractéristiques :**

- ✅ Variables d'environnement sécurisées
- ✅ Volumes persistants pour données
- ✅ Health checks sur tous les services
- ✅ Restart automatique des conteneurs

### 3. **docker-compose.yml**

Configuration Docker Compose pour le développement :

- Services de base (PostgreSQL + Redis uniquement)
- Permet de développer avec `npm run dev` en local
- Données isolées du mode production

### 4. **deploy.sh** ⭐ Script de déploiement Linux/Mac

Script Bash automatisé pour déployer l'application :

- ✅ Vérification des prérequis
- ✅ Validation des variables d'environnement
- ✅ Construction et démarrage des services
- ✅ Exécution optionnelle des migrations
- ✅ Options : `--build-only`, `--no-cache`, `--migrate`

### 5. **deploy.ps1**

Version PowerShell du script de déploiement pour Windows :

- Fonctionnalités identiques à deploy.sh
- Compatible avec Windows PowerShell et PowerShell Core

### 6. **scripts/docker-entrypoint.sh**

Script d'initialisation du conteneur :

- ✅ Attend la disponibilité de PostgreSQL et Redis
- ✅ Génère le client Prisma
- ✅ Exécute les migrations en production
- ✅ Gestion d'erreurs robuste

### 7. **env.production.example**

Template de configuration pour la production :

- Toutes les variables d'environnement documentées
- Valeurs d'exemple et instructions
- À copier en `.env.production` et configurer

### 8. **Makefile** ⭐ Utilitaire

Commandes simplifiées pour gérer l'application :

```bash
make deploy          # Déployer en production
make logs            # Voir les logs
make backup          # Sauvegarder la DB
make migrate         # Exécuter les migrations
make status          # Statut des services
# ... et plus de 20 autres commandes
```

### 9. **DEPLOIEMENT.md** ⭐ Documentation complète

Guide de déploiement complet avec :

- Prérequis et installation
- Configuration pas à pas
- Configuration Nginx Proxy Manager
- Dépannage et maintenance
- Sauvegardes et restauration
- Sécurité

### 10. **QUICKSTART-DEPLOY.md**

Guide de démarrage rapide (5 minutes) :

- Instructions essentielles uniquement
- Configuration minimale
- Déploiement rapide

### 11. **nginx-advanced.conf**

Configuration Nginx avancée pour NPM :

- Headers de sécurité
- Cache optimisé pour Next.js
- Compression Gzip/Brotli
- Timeouts pour génération PDF
- Limites d'upload augmentées

### 12. **app/api/health/route.ts**

Endpoint de santé pour monitoring :

- Vérifie l'état de l'application
- Vérifie la connexion à la base de données
- Utilisé par les health checks Docker

### 13. **next.config.js** (modifié)

Ajout du mode standalone :

- Optimise la taille de l'image Docker
- Réduit les dépendances de production
- Améliore les performances

### 14. **.dockerignore.prod**

Liste optimisée des fichiers à exclure du build Docker :

- Réduit la taille du contexte de build
- Accélère la construction des images
- Exclut les fichiers sensibles

## 🚀 Workflow de déploiement

### Première installation

```bash
# 1. Transférer les fichiers sur le VPS
scp -r ./oxygen-document user@vps:/var/www/

# 2. Se connecter au VPS
ssh user@vps
cd /var/www/oxygen-document

# 3. Configurer l'environnement
cp env.production.example .env.production
nano .env.production

# 4. Déployer
chmod +x deploy.sh
./deploy.sh --migrate

# 5. Créer un utilisateur
make db-seed
```

### Mises à jour

```bash
# Simple
make update

# Ou manuel
git pull origin main
./deploy.sh --migrate
```

## 📊 Architecture de déploiement

```
┌─────────────────────────────────────────────────────┐
│             Nginx Proxy Manager (NPM)                │
│         HTTPS (Let's Encrypt) - Port 443             │
└────────────────────┬────────────────────────────────┘
                     │
                     │ Reverse Proxy
                     ▼
         ┌───────────────────────┐
         │  oxygen-document-app  │
         │    Next.js (Port 3000) │
         │  + Workers BullMQ      │
         └─────┬────────────┬────┘
               │            │
       ┌───────┴──────┐  ┌──┴──────────┐
       ▼              ▼  ▼             ▼
┌────────────┐  ┌──────────────┐  ┌─────────┐
│ PostgreSQL │  │    Redis      │  │  S3/FTP │
│  (Port     │  │  (Port 6379)  │  │ Storage │
│   5432)    │  └──────────────┘  └─────────┘
└────────────┘
     │
     ▼
┌────────────┐
│  Volumes   │
│ Persistants│
└────────────┘
```

## 🔧 Configuration NPM (Nginx Proxy Manager)

### Configuration de base

1. **Proxy Host** :
   - Domain: `votre-domaine.com`
   - Scheme: `http`
   - Forward Hostname/IP: `oxygen-document-app`
   - Forward Port: `3000`
   - Cache Assets: ✅
   - Block Common Exploits: ✅
   - Websockets Support: ✅

2. **SSL** :
   - SSL Certificate: Let's Encrypt
   - Force SSL: ✅
   - HTTP/2: ✅
   - HSTS: ✅

3. **Advanced** :
   - Copier le contenu de `nginx-advanced.conf`

## 📋 Checklist de déploiement

### Avant le déploiement

- [ ] Docker et Docker Compose installés sur le VPS
- [ ] Domaine configuré et pointant vers le VPS
- [ ] NPM (Nginx Proxy Manager) installé et accessible
- [ ] Fichier `.env.production` configuré avec les vraies valeurs
- [ ] Secrets générés (NEXTAUTH_SECRET, POSTGRES_PASSWORD, etc.)
- [ ] Configuration S3 ou FTP prête
- [ ] Configuration email (Resend ou SMTP) prête

### Pendant le déploiement

- [ ] Exécuter `./deploy.sh --migrate`
- [ ] Vérifier que tous les services sont UP : `make status`
- [ ] Vérifier les logs : `make logs`
- [ ] Tester le health check : `curl http://localhost:3000/api/health`

### Après le déploiement

- [ ] Configurer le Proxy Host dans NPM
- [ ] Générer le certificat SSL Let's Encrypt
- [ ] Créer le premier utilisateur : `make db-seed`
- [ ] Tester l'accès via le domaine : `https://votre-domaine.com`
- [ ] Vérifier la génération de PDF/documents
- [ ] Vérifier l'envoi d'emails
- [ ] Configurer les sauvegardes automatiques

### Sécurité

- [ ] Pare-feu configuré (UFW)
- [ ] Ports inutiles fermés
- [ ] Accès SSH par clés uniquement
- [ ] Mots de passe forts et aléatoires
- [ ] `.env.production` sécurisé (chmod 600)
- [ ] Sauvegardes régulières configurées

## 🆘 Dépannage rapide

### Problème : Les conteneurs ne démarrent pas

```bash
make logs
docker-compose -f docker-compose.prod.yml down
./deploy.sh --no-cache --migrate
```

### Problème : Erreur de connexion à la base de données

```bash
make shell-db
# Vérifier la connexion
```

### Problème : L'application ne répond pas

```bash
make health
make restart
make logs-app
```

### Problème : Génération PDF échoue

```bash
# Vérifier Chromium
make shell
/usr/bin/chromium-browser --version
```

## 📞 Ressources

- **Documentation complète** : [DEPLOIEMENT.md](./DEPLOIEMENT.md)
- **Guide rapide** : [QUICKSTART-DEPLOY.md](./QUICKSTART-DEPLOY.md)
- **Aide Makefile** : `make help`

## 🎯 Prochaines étapes recommandées

1. **Monitoring** : Installer Grafana + Prometheus pour surveiller l'application
2. **Sauvegardes automatiques** : Configurer un cron job pour les backups quotidiens
3. **CI/CD** : Mettre en place un pipeline pour déploiements automatiques
4. **Logs centralisés** : Configurer un système de centralisation des logs (ELK Stack)
5. **Alertes** : Configurer des alertes email/Slack en cas de problème

## 📝 Notes importantes

- ⚠️ Ne jamais committer `.env.production`
- ⚠️ Toujours sauvegarder avant une mise à jour majeure
- ⚠️ Tester les migrations dans un environnement de staging d'abord
- ✅ Garder Docker et les images à jour régulièrement
- ✅ Surveiller l'espace disque et les logs

## 🎉 Félicitations !

Vous disposez maintenant d'une configuration de déploiement complète, robuste et professionnelle pour votre application Oxygen Document. Tous les fichiers sont prêts à l'emploi et documentés.

**Bon déploiement ! 🚀**
