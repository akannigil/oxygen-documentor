# Corrections de Déploiement - Oxygen Document

## ✅ Corrections Appliquées

### 1. Problème Redis (RÉSOLU)
**Symptôme**: `Redis n'est pas disponible après 30 tentatives`

**Cause**: Le package `redis-cli` n'était pas installé dans l'image Docker

**Solution**: Ajout du package `redis` dans les 3 stages du Dockerfile

### 2. Problème NextAuth UntrustedHost (RÉSOLU)
**Symptôme**: `[auth][error] UntrustedHost: Host must be trusted`

**Cause**: NextAuth nécessite `AUTH_TRUST_HOST=true` en production derrière un proxy

**Solution**: Ajout de `AUTH_TRUST_HOST: 'true'` dans `docker-compose.prod.yml`

### 3. Problème EMAIL_FROM manquant (RÉSOLU)
**Symptôme**: `RESEND_FROM_EMAIL ou EMAIL_FROM non configuré`

**Cause**: Variables d'environnement email non définies

**Solution**: Ajout des variables email dans `docker-compose.prod.yml` et `env.production.example`

### 4. Problème Script deploy.sh (RÉSOLU)
**Symptôme**: `/dev/fd/63: line 34: Document: command not found`

**Cause**: Le script ne gérait pas correctement les valeurs avec espaces dans `.env.production`

**Solution**: Amélioration du parsing du fichier `.env.production` avec gestion robuste des espaces et guillemets

---

## 📝 Configuration Requise

### Dans votre fichier `.env.production` sur le serveur, ajoutez :

```bash
# NextAuth - Trust Host (obligatoire)
AUTH_TRUST_HOST=true

# Configuration Email - Option 1 : Resend (recommandé)
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_votre_cle_api_resend
RESEND_FROM_EMAIL=noreply@documentor.oxygenrh.net
EMAIL_FROM=noreply@documentor.oxygenrh.net

# Configuration Email - Option 2 : SMTP
# EMAIL_PROVIDER=smtp
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_USER=votre-email@example.com
# SMTP_PASSWORD=votre-password-smtp
# EMAIL_FROM=noreply@documentor.oxygenrh.net
# EMAIL_SENDER_NAME="Oxygen Document"
# EMAIL_REPLY_TO=contact@documentor.oxygenrh.net
```

**⚠️ Important**: Pour les valeurs contenant des espaces, utilisez des guillemets :
```bash
EMAIL_SENDER_NAME="Oxygen Document"
SMTP_FROM_NAME="Mon Application"
```

---

## 🚀 Redéploiement

### 1. Sur votre serveur, mettez à jour le code :
```bash
cd /chemin/vers/oxygen-document
git pull origin production
```

### 2. Éditez votre `.env.production` :
```bash
nano .env.production
# Ajoutez les variables manquantes listées ci-dessus
```

### 3. Redéployez avec le script corrigé :
```bash
chmod +x deploy.sh
./deploy.sh
```

**OU** manuellement :
```bash
# Rebuild l'image Docker (nécessaire pour la correction Redis)
docker-compose -f docker-compose.prod.yml build --no-cache

# Redémarrer avec les nouvelles variables d'environnement
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

### 4. Vérifiez les logs :
```bash
docker-compose -f docker-compose.prod.yml logs -f app
```

---

## ✅ Checklist de Vérification

Après le déploiement, vous devriez voir :

- [x] ✅ Redis est disponible
- [x] ✅ PostgreSQL est disponible  
- [x] ✅ Migrations Prisma exécutées
- [x] ✅ Initialisation terminée, démarrage de l'application...
- [x] Pas d'erreur `UntrustedHost`
- [x] Pas d'erreur `EMAIL_FROM non configuré` (si email configuré)

---

## 🔧 Commandes Utiles

```bash
# Voir les logs en temps réel
docker-compose -f docker-compose.prod.yml logs -f app

# Voir tous les conteneurs
docker-compose -f docker-compose.prod.yml ps

# Redémarrer un service
docker-compose -f docker-compose.prod.yml restart app

# Arrêter tout
docker-compose -f docker-compose.prod.yml down

# Voir les logs d'erreur
docker-compose -f docker-compose.prod.yml logs --tail=100 app | grep -i error
```

---

## 🌐 Configuration Nginx/Reverse Proxy

N'oubliez pas de configurer votre reverse proxy (Nginx, Traefik, Caddy, etc.) pour :

1. **Pointer vers le port de l'application** (défini dans `.env.production` : `APP_PORT`)
2. **Transmettre les headers de proxy** :
   ```nginx
   proxy_set_header Host $host;
   proxy_set_header X-Real-IP $remote_addr;
   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   proxy_set_header X-Forwarded-Proto $scheme;
   proxy_set_header X-Forwarded-Host $host;
   ```

Ces headers sont nécessaires pour que `AUTH_TRUST_HOST` fonctionne correctement.

---

## 📧 Support

Si vous rencontrez des problèmes :

1. Vérifiez les logs : `docker-compose -f docker-compose.prod.yml logs -f`
2. Vérifiez les variables d'environnement : `docker-compose -f docker-compose.prod.yml exec app env | grep -E '(AUTH|EMAIL|REDIS|POSTGRES)'`
3. Vérifiez la connectivité réseau entre les conteneurs : `docker-compose -f docker-compose.prod.yml exec app ping redis`

---

**Date de mise à jour**: 2025-11-07
**Version**: 1.0

