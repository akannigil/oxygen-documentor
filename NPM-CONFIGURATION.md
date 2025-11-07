# 🌐 Configuration Nginx Proxy Manager (NPM)

## ❓ Pourquoi ce fichier existe-t-il ?

Vous avez déjà **Nginx Proxy Manager (NPM)** sur votre serveur, c'est parfait ! Ce fichier explique comment configurer NPM pour qu'il fonctionne avec votre application Docker.

## 🎯 Concept

```
Internet (HTTPS:443)
    ↓
Nginx Proxy Manager (NPM)
    ↓ Reverse Proxy
Conteneur Docker (oxygen-document-app:PORT)
```

**NPM fait le lien entre :**

- L'extérieur (votre domaine HTTPS)
- Votre conteneur Docker (réseau interne)

## 🚀 Configuration de base dans NPM

### Étape 1 : Ajouter un Proxy Host

1. Ouvrez NPM : `http://votre-serveur:81`
2. Cliquez sur **"Proxy Hosts"** → **"Add Proxy Host"**

### Étape 2 : Onglet "Details"

```
Domain Names: votre-domaine.com
Scheme: http (car Docker est en local)
Forward Hostname/IP: oxygen-document-app
Forward Port: 3000 (ou la valeur de APP_PORT dans votre .env.production)

☑ Cache Assets
☑ Block Common Exploits
☑ Websockets Support
```

**🔍 Explication des champs :**

- **Domain Names** : Votre domaine public (ex: `oxygen.votredomaine.com`)
- **Scheme** : `http` car la communication NPM ↔ Docker est locale (pas besoin de HTTPS)
- **Forward Hostname/IP** :
  - `oxygen-document-app` = nom du conteneur Docker (recommandé si Docker Compose)
  - OU `localhost` si vous n'utilisez pas Docker Compose
- **Forward Port** : Le port de votre application (défini par `APP_PORT` dans `.env.production`, par défaut `3000`)

### Étape 3 : Onglet "SSL"

```
SSL Certificate: Request a new SSL Certificate (Let's Encrypt)

☑ Force SSL
☑ HTTP/2 Support
☑ HSTS Enabled

Email: votre@email.com
☑ I Agree to the Let's Encrypt Terms of Service
```

### Étape 4 : Onglet "Advanced" (OPTIONNEL)

C'est ici que vous pouvez copier le contenu de `nginx-advanced.conf` **si vous le souhaitez**.

**Ce n'est PAS obligatoire !** C'est seulement pour :

- Optimiser le cache des assets statiques Next.js
- Augmenter les limites d'upload
- Headers de sécurité supplémentaires
- Compression Gzip optimisée

## ⚙️ Adapter le port

### Si vous utilisez un port différent de 3000

1. **Dans `.env.production` :**

   ```bash
   APP_PORT=8080  # Par exemple
   ```

2. **Dans NPM :**
   - Forward Port: `8080`

3. **Dans `nginx-advanced.conf`** (si vous l'utilisez) :
   ```nginx
   # Remplacez tous les :3000 par :8080
   proxy_pass http://oxygen-document-app:8080;
   ```

## 🔧 Configurations selon votre setup

### Configuration A : Docker Compose (RECOMMANDÉ)

```yaml
# docker-compose.prod.yml
services:
  app:
    container_name: oxygen-document-app
    ports:
      - '${APP_PORT:-3000}:3000'
    networks:
      - oxygen-network
```

**Dans NPM :**

- Forward Hostname: `oxygen-document-app`
- Forward Port: `3000` (port interne du conteneur)

**Pourquoi ?** NPM et Docker peuvent communiquer via le nom du conteneur si ils sont sur le même réseau Docker.

### Configuration B : Docker sans Compose

```bash
docker run -d \
  --name oxygen-document-app \
  -p 3000:3000 \
  oxygen-document
```

**Dans NPM :**

- Forward Hostname: `localhost` ou `127.0.0.1`
- Forward Port: `3000`

### Configuration C : Application en local (sans Docker)

```bash
npm run start  # Port 3000
```

**Dans NPM :**

- Forward Hostname: `localhost` ou `127.0.0.1`
- Forward Port: `3000`

## 🌐 Réseau Docker (Configuration avancée)

### Si NPM et votre app sont sur le même réseau Docker

```yaml
# docker-compose.prod.yml
networks:
  oxygen-network:
    external: true # Réseau partagé avec NPM
```

**Avantages :**

- Communication directe via nom du conteneur
- Pas besoin d'exposer le port sur l'hôte
- Plus sécurisé

**Dans NPM :**

- Forward Hostname: `oxygen-document-app`
- Forward Port: `3000`

### Si NPM et votre app sont sur des réseaux différents

**Vous devez exposer le port sur l'hôte :**

```yaml
# docker-compose.prod.yml
services:
  app:
    ports:
      - '127.0.0.1:3000:3000' # Expose seulement sur localhost
```

**Dans NPM :**

- Forward Hostname: `host.docker.internal` (si NPM est dans Docker)
- OU `localhost` (si NPM est directement sur l'hôte)
- Forward Port: `3000`

## 📝 nginx-advanced.conf - À quoi ça sert ?

Ce fichier contient des **configurations Nginx avancées** pour :

1. **Cache optimisé** pour Next.js
   - Assets statiques : 1 an
   - Images : 7 jours
   - Pas de cache pour les APIs

2. **Limites d'upload** augmentées (100 MB)

3. **Timeouts** pour les conversions PDF/LibreOffice (300s)

4. **Headers de sécurité** supplémentaires

5. **Compression Gzip** optimisée

**Vous n'êtes PAS obligé de l'utiliser !**

NPM fonctionne très bien sans. Ces optimisations sont pour :

- Meilleures performances
- Meilleure sécurité
- Support de gros fichiers

## 🧪 Test de configuration

### Vérifier que NPM accède à votre app

```bash
# Sur le serveur, vérifier que l'app répond
curl http://localhost:3000/api/health
# ou
curl http://oxygen-document-app:3000/api/health

# Résultat attendu :
# {"status":"healthy","checks":{"app":"ok","database":"ok"}}
```

### Vérifier depuis l'extérieur

```bash
# Depuis votre machine locale
curl https://votre-domaine.com/api/health
```

## 🐛 Dépannage

### Erreur 502 Bad Gateway

**Causes possibles :**

1. L'application Docker n'est pas démarrée

   ```bash
   docker-compose -f docker-compose.prod.yml ps
   ```

2. Mauvais nom de conteneur dans NPM

   ```bash
   docker ps | grep oxygen
   # Utilisez le nom exact dans NPM
   ```

3. Mauvais réseau Docker

   ```bash
   docker network ls
   docker network inspect oxygen-network
   ```

4. Port incorrect
   ```bash
   # Vérifier le port exposé
   docker ps | grep oxygen
   ```

### Erreur 504 Gateway Timeout

**Solution :** Augmentez les timeouts dans NPM (onglet Advanced) :

```nginx
proxy_connect_timeout 300s;
proxy_send_timeout 300s;
proxy_read_timeout 300s;
```

### L'app est accessible en HTTP mais pas en HTTPS

**Solution :** Vérifiez le certificat SSL dans NPM :

- Onglet SSL
- Vérifiez que le certificat est valide
- Essayez de le renouveler

## 📊 Schéma récapitulatif

```
┌─────────────────────────────────────────┐
│  Internet (utilisateurs)                │
│  https://votre-domaine.com              │
└────────────────┬────────────────────────┘
                 │ Port 443 (HTTPS)
                 ↓
┌─────────────────────────────────────────┐
│  Nginx Proxy Manager (NPM)              │
│  - Gestion SSL (Let's Encrypt)          │
│  - Reverse Proxy                        │
│  - Port 81 (interface admin)            │
└────────────────┬────────────────────────┘
                 │ http://oxygen-document-app:3000
                 │ (réseau interne Docker)
                 ↓
┌─────────────────────────────────────────┐
│  Conteneur oxygen-document-app          │
│  - Next.js (port 3000)                  │
│  - PostgreSQL (port 5432)               │
│  - Redis (port 6379)                    │
└─────────────────────────────────────────┘
```

## ✅ Checklist de configuration

- [ ] Application Docker démarrée : `make status`
- [ ] Health check fonctionne : `curl http://localhost:3000/api/health`
- [ ] Proxy Host créé dans NPM avec le bon nom de conteneur
- [ ] Port correct dans NPM (3000 par défaut)
- [ ] SSL configuré (Let's Encrypt)
- [ ] Force SSL activé
- [ ] Test depuis l'extérieur : `curl https://votre-domaine.com/api/health`

## 💡 Recommandations

1. **Gardez la configuration simple** : Utilisez la configuration de base de NPM sans `nginx-advanced.conf` pour commencer

2. **Ajoutez les optimisations progressivement** : Si vous rencontrez des problèmes de performance ou de limites, ajoutez alors `nginx-advanced.conf`

3. **Utilisez les noms de conteneurs** : C'est plus propre que `localhost` et ça évite les conflits de ports

4. **Sécurisez vos ports** : N'exposez que `127.0.0.1:3000` si NPM est sur le même serveur

5. **Testez toujours le health check** avant de configurer NPM

## 📚 Ressources

- [Documentation NPM](https://nginxproxymanager.com/guide/)
- [Docker Networks](https://docs.docker.com/network/)
- [Let's Encrypt](https://letsencrypt.org/)

---

**En résumé :** `nginx-advanced.conf` est **optionnel** et sert uniquement à optimiser NPM. La configuration de base de NPM suffit largement pour commencer ! 🚀
