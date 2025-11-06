# 🚀 Guide de Déploiement - Oxygen Document

Guide complet pour déployer l'application Oxygen Document sur un serveur VPS avec Docker et Nginx Proxy Manager.

## 📋 Prérequis

### Sur le serveur VPS

- **Système d'exploitation** : Ubuntu 20.04+ / Debian 11+ ou compatible
- **Docker** : Version 20.10 ou supérieure
- **Docker Compose** : Version 2.0 ou supérieure
- **Nginx Proxy Manager** : Déjà installé et fonctionnel
- **Accès SSH** : Avec privilèges sudo
- **Domaine configuré** : Pointant vers votre VPS

### Ressources minimales recommandées

- **CPU** : 2 cœurs
- **RAM** : 4 GB
- **Stockage** : 20 GB minimum
- **Bande passante** : Illimitée recommandée

## 🔧 Installation sur le VPS

### 1. Vérifier l'installation de Docker

```bash
docker --version
docker-compose --version
```

Si Docker n'est pas installé :

```bash
# Installation de Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Ajouter l'utilisateur au groupe docker
sudo usermod -aG docker $USER

# Installation de Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin
```

### 2. Cloner ou transférer le projet

```bash
# Option A : Clone depuis Git
git clone https://votre-repo.git /var/www/oxygen-document
cd /var/www/oxygen-document

# Option B : Transfert via SCP
scp -r ./oxygen-document user@votre-vps:/var/www/
```

### 3. Configuration des variables d'environnement

```bash
cd /var/www/oxygen-document

# Copier le fichier d'exemple
cp env.production.example .env.production

# Éditer avec vos configurations
nano .env.production
```

#### Variables critiques à configurer :

```bash
# URL de votre application (domaine public)
NEXTAUTH_URL=https://oxygen.votre-domaine.com

# Générer un secret NextAuth sécurisé
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Mots de passe sécurisés
POSTGRES_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)

# Configuration AWS S3 (recommandé pour la production)
STORAGE_TYPE=s3
AWS_REGION=eu-west-3
AWS_ACCESS_KEY_ID=votre_access_key
AWS_SECRET_ACCESS_KEY=votre_secret_key
AWS_S3_BUCKET=oxygen-document-prod

# Configuration Email (Resend recommandé)
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_votre_cle_resend
```

### 4. Rendre le script de déploiement exécutable

```bash
chmod +x deploy.sh
chmod +x scripts/docker-entrypoint.sh
```

## 🚀 Déploiement

### Déploiement complet (première fois)

```bash
# Déploiement avec migrations de base de données
./deploy.sh --migrate
```

### Déploiement sans cache (mise à jour majeure)

```bash
./deploy.sh --no-cache --migrate
```

### Construction uniquement (pour tester)

```bash
./deploy.sh --build-only
```

## 🌐 Configuration de Nginx Proxy Manager

### 1. Accéder à Nginx Proxy Manager

Ouvrez votre interface NPM (généralement sur le port 81) : `http://votre-vps:81`

### 2. Ajouter un Proxy Host

1. **Cliquer sur "Proxy Hosts"** → **"Add Proxy Host"**

2. **Onglet Details** :
   - **Domain Names** : `oxygen.votre-domaine.com`
   - **Scheme** : `http`
   - **Forward Hostname / IP** : `oxygen-document-app` (nom du conteneur)
   - **Forward Port** : `3000`
   - **Cache Assets** : ✅ Activé
   - **Block Common Exploits** : ✅ Activé
   - **Websockets Support** : ✅ Activé

3. **Onglet SSL** :
   - **SSL Certificate** : Request a new SSL Certificate
   - **Force SSL** : ✅ Activé
   - **HTTP/2 Support** : ✅ Activé
   - **HSTS Enabled** : ✅ Activé
   - **Email** : votre@email.com
   - **I Agree to the Let's Encrypt Terms of Service** : ✅

4. **Sauvegarder**

### 3. Configuration avancée (optionnel)

Dans l'onglet **Advanced**, vous pouvez ajouter :

```nginx
# Augmenter les limites pour les uploads de fichiers
client_max_body_size 100M;

# Timeout pour les longues requêtes (génération PDF)
proxy_connect_timeout 300s;
proxy_send_timeout 300s;
proxy_read_timeout 300s;

# Headers de sécurité
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;

# Caching des assets statiques
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 🔍 Vérification du déploiement

### 1. Vérifier les conteneurs

```bash
docker-compose -f docker-compose.prod.yml ps
```

Tous les services doivent être **Up** et **healthy**.

### 2. Vérifier les logs

```bash
# Logs de l'application
docker-compose -f docker-compose.prod.yml logs -f app

# Logs PostgreSQL
docker-compose -f docker-compose.prod.yml logs -f postgres

# Logs Redis
docker-compose -f docker-compose.prod.yml logs -f redis
```

### 3. Test de santé

```bash
# Depuis le serveur
curl http://localhost:3000/api/health

# Depuis l'extérieur
curl https://oxygen.votre-domaine.com/api/health
```

Réponse attendue :

```json
{
  "status": "healthy",
  "checks": {
    "app": "ok",
    "database": "ok",
    "timestamp": "2025-11-06T12:00:00.000Z"
  }
}
```

### 4. Créer le premier utilisateur

```bash
docker-compose -f docker-compose.prod.yml exec app npm run user:create
```

## 🔄 Mises à jour

### Mise à jour de l'application

```bash
cd /var/www/oxygen-document

# Pull les derniers changements
git pull origin main

# Reconstruire et redéployer
./deploy.sh --migrate
```

### Mise à jour sans downtime (stratégie blue-green)

```bash
# 1. Construire la nouvelle image
./deploy.sh --build-only

# 2. Tester localement si nécessaire

# 3. Déployer avec mise à jour progressive
docker-compose -f docker-compose.prod.yml up -d --no-deps --build app
```

## 📊 Monitoring et Maintenance

### Commandes utiles

```bash
# Voir les logs en temps réel
docker-compose -f docker-compose.prod.yml logs -f

# Redémarrer un service
docker-compose -f docker-compose.prod.yml restart app

# Voir l'utilisation des ressources
docker stats

# Nettoyer les images inutilisées
docker system prune -a
```

### Sauvegardes

#### Base de données PostgreSQL

```bash
# Créer une sauvegarde
docker-compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U postgres oxygen_document > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurer une sauvegarde
cat backup_20251106_120000.sql | \
  docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U postgres oxygen_document
```

#### Volumes Docker

```bash
# Sauvegarder tous les volumes
docker run --rm \
  -v oxygen-document_postgres_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/postgres_data_$(date +%Y%m%d).tar.gz /data

# Restaurer
docker run --rm \
  -v oxygen-document_postgres_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/postgres_data_20251106.tar.gz -C /
```

### Rotation des logs

Créer `/etc/docker/daemon.json` :

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Redémarrer Docker :

```bash
sudo systemctl restart docker
```

## 🐛 Dépannage

### Les conteneurs ne démarrent pas

```bash
# Vérifier les logs d'erreur
docker-compose -f docker-compose.prod.yml logs

# Vérifier les variables d'environnement
docker-compose -f docker-compose.prod.yml config
```

### Erreurs de connexion à la base de données

```bash
# Vérifier que PostgreSQL est accessible
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U postgres -c "SELECT version();"

# Vérifier les permissions
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U postgres -c "\du"
```

### Workers BullMQ ne traitent pas les jobs

```bash
# Vérifier la connexion Redis
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping

# Vérifier les logs des workers
docker-compose -f docker-compose.prod.yml logs app | grep -i worker
```

### Problèmes de génération PDF (Puppeteer)

```bash
# Vérifier l'installation de Chromium
docker-compose -f docker-compose.prod.yml exec app \
  /usr/bin/chromium-browser --version

# Tester Puppeteer manuellement
docker-compose -f docker-compose.prod.yml exec app node -e "
const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  console.log('Puppeteer fonctionne!');
  await browser.close();
})();
"
```

## 🔒 Sécurité en Production

### Checklist de sécurité

- ✅ Utiliser des mots de passe forts (générés aléatoirement)
- ✅ Ne JAMAIS committer le fichier `.env.production`
- ✅ Activer HTTPS via Let's Encrypt (NPM)
- ✅ Configurer un pare-feu (UFW)
- ✅ Limiter l'accès SSH aux clés uniquement
- ✅ Mettre à jour régulièrement les images Docker
- ✅ Surveiller les logs pour les activités suspectes
- ✅ Sauvegarder régulièrement les données

### Configuration du pare-feu UFW

```bash
# Autoriser SSH
sudo ufw allow 22/tcp

# Autoriser HTTP/HTTPS (pour NPM)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Autoriser NPM Admin (optionnel, limiter par IP)
sudo ufw allow from VOTRE_IP to any port 81

# Activer UFW
sudo ufw enable
```

## 📞 Support

Pour toute question ou problème :

1. Vérifiez les logs : `docker-compose logs -f`
2. Consultez la documentation Next.js : https://nextjs.org/docs
3. Consultez la documentation Prisma : https://www.prisma.io/docs

## 📝 Changelog

### Version 1.0.0 (2025-11-06)

- ✅ Configuration Docker multi-stage optimisée
- ✅ Support Nginx Proxy Manager
- ✅ Workers BullMQ automatiques en production
- ✅ Health checks pour tous les services
- ✅ Scripts de déploiement automatisés
- ✅ Support S3, FTP et stockage local
- ✅ Support Resend et SMTP pour les emails

