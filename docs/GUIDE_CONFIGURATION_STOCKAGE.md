# Guide de Configuration du Stockage

## 📋 Vue d'ensemble

Oxygen Document supporte plusieurs types de stockage pour vos documents générés :
- **Local** : Fichiers stockés sur le serveur
- **S3** : AWS S3, MinIO, Cloudflare R2, DigitalOcean Spaces
- **FTP/FTPS** : Serveurs FTP traditionnels

Chaque projet peut avoir sa propre configuration de stockage ou utiliser la configuration globale par défaut.

## 🆕 Nouvelles fonctionnalités

### 1. Bannière de statut du stockage

Lors de l'upload d'un template, vous verrez désormais une bannière qui indique :
- ✅ Si le stockage est correctement configuré
- ⚠️ Si la configuration est incomplète ou manquante
- ℹ️ Si vous utilisez la configuration par défaut du serveur
- 🔗 Un lien direct vers la page de configuration

### 2. Page dédiée de configuration

Accédez à la configuration du stockage via :
- URL : `/projects/{projectId}/settings/storage`
- Ou : Cliquez sur le lien dans la bannière de statut

### 3. Validation intelligente pour MinIO

Le système détecte automatiquement si vous utilisez MinIO et :
- Affiche un avertissement si "Forcer le style de chemin" n'est pas activé
- Vous guide avec des conseils contextuels
- Valide l'endpoint avant la sauvegarde

## 🔧 Configuration MinIO - Étape par étape

### Étape 1 : Configuration globale (variables d'environnement)

Dans votre fichier `.env.production` :

```bash
# Stockage
STORAGE_TYPE=s3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=votre_access_key
AWS_SECRET_ACCESS_KEY=votre_secret_key
S3_BUCKET_NAME=votre-bucket
MINIO_ENDPOINT=https://s3.mondomaine.com
```

**Important** : Après modification, redémarrez les conteneurs Docker :

```bash
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

### Étape 2 : Configuration par projet (optionnel)

Si vous souhaitez que certains projets utilisent un stockage différent :

1. Accédez à votre projet
2. Naviguez vers `/projects/{projectId}/settings/storage`
3. Sélectionnez le type "AWS S3 / MinIO / Cloudflare R2"
4. Remplissez les champs :
   - **Nom du bucket** : `votre-bucket`
   - **Région** : `us-east-1` (ou votre région MinIO)
   - **Access Key ID** : Vos identifiants MinIO
   - **Secret Access Key** : Votre secret MinIO
   - **Endpoint** : `https://s3.mondomaine.com`
   - ✅ **Cochez** "Forcer le style de chemin (path-style)"
5. Sauvegardez

## ⚠️ Résolution du problème "PermanentRedirect"

Si vous rencontrez l'erreur :
```
PermanentRedirect: The bucket you are attempting to access must be addressed using the specified endpoint.
```

### Causes possibles

1. **Variables d'environnement manquantes dans Docker**
   - ✅ **Corrigé** : Le `docker-compose.prod.yml` a été mis à jour pour inclure `MINIO_ENDPOINT`

2. **Configuration de projet avec bucket "certificates" incorrect**
   - Vérifiez la configuration du projet via `/projects/{projectId}/settings/storage`
   - Assurez-vous que l'endpoint et le bucket sont corrects

3. **`forcePathStyle` non activé**
   - Pour MinIO, cette option DOIT être activée
   - Le système vous avertira automatiquement si elle est manquante

### Solution rapide

1. **Vérifiez votre `.env.production`** :
   ```bash
   MINIO_ENDPOINT=https://s3.mondomaine.com  # ✅ Doit être défini
   S3_BUCKET_NAME=certificates               # Votre bucket
   ```

2. **Redémarrez Docker** :
   ```bash
   docker-compose -f docker-compose.prod.yml restart app
   ```

3. **Vérifiez la configuration du projet** :
   - Allez dans `/projects/{projectId}/settings/storage`
   - Si une configuration existe, vérifiez qu'elle contient :
     - Le bon endpoint MinIO
     - Le bon nom de bucket
     - "Forcer le style de chemin" activé

## 🎯 Bonnes pratiques

### Pour MinIO

✅ **À faire** :
- Toujours définir `MINIO_ENDPOINT` dans `.env.production`
- Activer "Forcer le style de chemin" dans la configuration
- Utiliser `https://` pour l'endpoint en production
- Définir la région (souvent `us-east-1` pour MinIO)

❌ **À éviter** :
- Oublier le protocole dans l'endpoint (`s3.mondomaine.com` ❌ → `https://s3.mondomaine.com` ✅)
- Ne pas activer `forcePathStyle` pour MinIO
- Mélanger configuration globale et configuration de projet sans cohérence

### Pour AWS S3

✅ **À faire** :
- Définir la région correcte du bucket
- Utiliser des utilisateurs IAM avec permissions limitées
- Ne PAS définir d'endpoint (laissez vide)

### Sécurité

- ✅ Les identifiants sont stockés de manière sécurisée en base de données
- ✅ Ils ne sont jamais exposés côté client
- ✅ Chaque projet peut avoir ses propres identifiants isolés
- ⚠️ Ne committez JAMAIS votre `.env.production` dans Git

## 📊 Hiérarchie des configurations

1. **Configuration spécifique au projet** (si définie)
   - Utilisée pour l'upload des templates ET la génération des documents
   
2. **Configuration globale** (variables d'environnement)
   - Utilisée si aucune configuration de projet n'est définie
   - S'applique à tous les nouveaux projets par défaut

## 🔍 Vérification de la configuration

### Via l'interface

1. Créez ou uploadez un template
2. La bannière de statut vous indiquera immédiatement si la configuration est correcte

### Via les logs

Vérifiez les logs Docker :
```bash
docker-compose -f docker-compose.prod.yml logs app
```

Recherchez :
- ✅ `[Worker] Configuration de stockage: s3` (configuration chargée)
- ❌ `Error uploading template: PermanentRedirect` (problème d'endpoint)

## 🆘 Support

Si vous rencontrez des problèmes :

1. **Vérifiez la bannière de statut** sur la page d'upload de template
2. **Consultez la configuration** via `/projects/{projectId}/settings/storage`
3. **Vérifiez les logs** Docker
4. **Assurez-vous** que les variables d'environnement sont correctes
5. **Redémarrez** les conteneurs après toute modification de `.env.production`

## 🎉 Améliorations apportées

### Modifications du code

1. ✅ `docker-compose.prod.yml` : Ajout des variables `MINIO_ENDPOINT`, `S3_ENDPOINT`, etc.
2. ✅ `StorageStatusBanner` : Nouveau composant de vérification du statut
3. ✅ `StorageConfigForm` : Validation intelligente et détection MinIO
4. ✅ Page `/settings/storage` : Interface dédiée de configuration
5. ✅ Page d'upload template : Intégration de la bannière de statut

### Validations ajoutées

- ✅ Détection automatique MinIO vs AWS S3
- ✅ Validation de l'endpoint (http/https)
- ✅ Avertissement si `forcePathStyle` manquant pour MinIO
- ✅ Vérification des champs requis (bucket, région)
- ✅ Messages d'aide contextuels

---

**Version du guide** : 1.0  
**Date** : 7 novembre 2024  
**Compatible avec** : Oxygen Document v1.x

