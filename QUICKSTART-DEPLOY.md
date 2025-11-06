# ⚡ Déploiement Rapide - Oxygen Document

Guide rapide pour déployer l'application en production sur votre VPS.

## 🎯 En 5 minutes

### 1. Prérequis sur le VPS

```bash
# Vérifier Docker et Docker Compose
docker --version
docker-compose --version
```

### 2. Transférer l'application

```bash
# Sur votre machine locale
scp -r ./oxygen-document user@votre-vps:/var/www/

# Ou via Git
ssh user@votre-vps
cd /var/www
git clone https://votre-repo.git oxygen-document
```

### 3. Configuration

```bash
cd /var/www/oxygen-document

# Copier le fichier d'environnement
cp env.production.example .env.production

# Générer les secrets
export NEXTAUTH_SECRET=$(openssl rand -base64 32)
export POSTGRES_PASSWORD=$(openssl rand -base64 32)
export REDIS_PASSWORD=$(openssl rand -base64 32)

# Éditer .env.production
nano .env.production
```

**Variables essentielles à configurer :**

```bash
# URL publique
NEXTAUTH_URL=https://votre-domaine.com

# Secrets générés ci-dessus
NEXTAUTH_SECRET=...
POSTGRES_PASSWORD=...
REDIS_PASSWORD=...

# Stockage (S3 recommandé)
STORAGE_TYPE=s3
AWS_REGION=eu-west-3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...

# Email (Resend recommandé)
EMAIL_PROVIDER=resend
RESEND_API_KEY=...
```

### 4. Déploiement

```bash
# Rendre le script exécutable
chmod +x deploy.sh

# Déployer avec migrations
./deploy.sh --migrate
```

**Ou avec Make :**

```bash
make deploy
```

### 5. Configuration Nginx Proxy Manager

**Vous avez déjà NPM sur votre serveur, parfait !** Configurez-le pour pointer vers votre conteneur Docker :

1. Ouvrir NPM : `http://votre-vps:81`
2. Ajouter un Proxy Host :
   - **Domain Names** : `votre-domaine.com`
   - **Scheme** : `http` (communication locale)
   - **Forward Hostname/IP** : `oxygen-document-app` (nom du conteneur)
   - **Forward Port** : `3000` (ou la valeur de APP_PORT)
   - ✅ **Cache Assets**
   - ✅ **Block Common Exploits**
   - ✅ **Websockets Support**

3. Onglet SSL :
   - ✅ Request new SSL Certificate (Let's Encrypt)
   - ✅ Force SSL
   - ✅ HTTP/2 Support
   - ✅ HSTS Enabled

**📖 Pour plus de détails, consultez : [NPM-CONFIGURATION.md](./NPM-CONFIGURATION.md)**

### 6. Créer le premier utilisateur

```bash
docker-compose -f docker-compose.prod.yml exec app npm run user:create
```

## ✅ Vérification

```bash
# Vérifier les services
docker-compose -f docker-compose.prod.yml ps

# Tester l'API de santé
curl https://votre-domaine.com/api/health

# Voir les logs
docker-compose -f docker-compose.prod.yml logs -f
```

## 🔄 Mises à jour

```bash
cd /var/www/oxygen-document
git pull origin main
./deploy.sh --migrate
```

**Ou avec Make :**

```bash
make update
```

## 🆘 Dépannage rapide

### Les conteneurs ne démarrent pas

```bash
# Voir les logs d'erreur
docker-compose -f docker-compose.prod.yml logs

# Redémarrer proprement
docker-compose -f docker-compose.prod.yml down
./deploy.sh --no-cache --migrate
```

### Erreur de connexion à la base de données

```bash
# Vérifier PostgreSQL
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -c "SELECT version();"

# Reconstruire si nécessaire
docker-compose -f docker-compose.prod.yml down -v
./deploy.sh --migrate
```

### L'application ne répond pas

```bash
# Vérifier le health check
curl http://localhost:3000/api/health

# Redémarrer l'application
docker-compose -f docker-compose.prod.yml restart app

# Voir les logs
docker-compose -f docker-compose.prod.yml logs -f app
```

## 📚 Documentation complète

Pour plus de détails, consultez [DEPLOIEMENT.md](./DEPLOIEMENT.md)

## 🛠️ Commandes utiles

```bash
# Avec Make
make help              # Liste toutes les commandes
make deploy            # Déployer
make logs              # Voir les logs
make backup            # Sauvegarder la DB
make status            # Statut des services

# Avec Docker Compose
docker-compose -f docker-compose.prod.yml ps      # Statut
docker-compose -f docker-compose.prod.yml logs -f # Logs
docker-compose -f docker-compose.prod.yml restart # Redémarrer
docker-compose -f docker-compose.prod.yml down    # Arrêter
```

## 🔒 Sécurité

- ✅ Utilisez des mots de passe forts (générés aléatoirement)
- ✅ Activez HTTPS (Let's Encrypt via NPM)
- ✅ Ne committez JAMAIS `.env.production`
- ✅ Configurez un pare-feu (UFW)
- ✅ Sauvegardez régulièrement la base de données

## 💾 Sauvegardes

```bash
# Sauvegarder
make backup

# Restaurer
make restore FILE=backups/backup_20251106_120000.sql
```

## 📞 Support

En cas de problème :

1. Vérifiez les logs : `make logs`
2. Consultez [DEPLOIEMENT.md](./DEPLOIEMENT.md)
3. Vérifiez la configuration dans `.env.production`

