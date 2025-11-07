# Guide de Test et Configuration MinIO

## 🚀 Fonctionnalités de Test Automatique

Votre application dispose maintenant d'un système complet de test et configuration automatique MinIO :

### ✨ Nouvelles fonctionnalités

1. **Test de connexion** : Vérifie que votre endpoint MinIO est accessible
2. **Création automatique de bucket** : Crée le bucket s'il n'existe pas
3. **Validation des identifiants** : Vérifie que vos Access Key sont valides
4. **Configuration CORS** : Configure automatiquement les règles CORS
5. **Détection intelligente** : Active automatiquement `forcePathStyle` pour MinIO

## 📝 Configuration via l'Interface

### Étape 1 : Accéder à la configuration

1. Allez sur votre projet
2. Cliquez sur `/projects/{projectId}/settings/storage`
3. Ou cliquez sur le lien dans la bannière lors de l'upload de template

### Étape 2 : Remplir les informations MinIO

```
Type de stockage: AWS S3 / MinIO / Cloudflare R2

Nom du bucket: certificates  (ou votre nom de bucket)
Région: us-east-1  (ou votre région MinIO)
Access Key ID: votre_access_key
Secret Access Key: votre_secret_key
Endpoint: https://s3.sa-sp.org  (votre URL MinIO)
☑ Forcer le style de chemin: COCHÉ (important pour MinIO!)
```

### Étape 3 : Tester la connexion

1. Cliquez sur le bouton **"Tester la connexion"**
2. Attendez quelques secondes
3. Vous verrez un message de résultat :

#### ✅ Succès

```
✓ Connexion réussie !
✓ Bucket existant et accessible
ou
✓ Bucket créé automatiquement

Endpoint: https://s3.sa-sp.org
Région: us-east-1
```

#### ❌ Échec

Le système vous indiquera exactement le problème :

- **Identifiants invalides** → Vérifiez votre Access Key et Secret Key
- **Endpoint non trouvé** → Vérifiez l'URL de votre MinIO
- **Connexion refusée** → Vérifiez que le serveur MinIO est démarré
- **Bucket existe déjà** → Le bucket appartient à un autre utilisateur

### Étape 4 : Sauvegarder

Une fois le test réussi, cliquez sur **"Sauvegarder la configuration"**.

## 🔧 Résolution de l'erreur actuelle

Votre erreur actuelle :
```
Error: getaddrinfo ENOTFOUND certificates.s3.sa-sp.org
```

**Cause** : Le SDK S3 essaie d'utiliser le style "virtual-hosted" au lieu du style "path".

**Solution appliquée** :

1. ✅ **Correction du constructeur S3** : `forcePathStyle` est maintenant toujours défini explicitement
2. ✅ **Détection automatique** : Pour les endpoints non-AWS, `forcePathStyle` est activé par défaut
3. ✅ **Configuration persistante** : La valeur est correctement passée au client S3

## 🎯 Actions à effectuer maintenant

### Option 1 : Configuration via l'interface (Recommandé)

1. Allez sur `/projects/{projectId}/settings/storage`
2. Configurez votre MinIO avec les paramètres corrects
3. Testez la connexion
4. Sauvegardez

### Option 2 : Configuration globale (Variables d'environnement)

Modifiez votre `.env.production` :

```bash
STORAGE_TYPE=s3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=votre_access_key
AWS_SECRET_ACCESS_KEY=votre_secret_key
S3_BUCKET_NAME=certificates
MINIO_ENDPOINT=https://s3.sa-sp.org
# S3_FORCE_PATH_STYLE=true  # Optionnel, sera automatiquement activé
```

Puis redémarrez Docker :

```bash
docker-compose -f docker-compose.prod.yml restart app
```

## 🔍 Vérification de la configuration

### Dans les logs

Après configuration, vérifiez les logs :

```bash
docker-compose -f docker-compose.prod.yml logs -f app
```

Vous devriez voir :
```
[Worker] Configuration de stockage: s3
```

Et non plus :
```
Error: getaddrinfo ENOTFOUND certificates.s3.sa-sp.org
```

### Test rapide via l'interface

1. Allez sur "Nouveau template"
2. La bannière de statut indiquera :
   - ✅ Vert = Configuration correcte
   - ⚠️ Jaune = Configuration incomplète
   - ℹ️ Bleu = Configuration par défaut

## 📊 Comprendre les configurations

### Configuration globale vs Configuration de projet

| Type | Utilisation | Priorité |
|------|-------------|----------|
| **Configuration globale** | Variables d'environnement | Basse |
| **Configuration projet** | Base de données | **Haute** |

**Important** : Si votre projet a une configuration spécifique en base de données, elle sera utilisée à la place de la configuration globale.

### Vérifier la configuration actuelle d'un projet

Via l'API :
```bash
curl https://votre-domaine.com/api/projects/{projectId}/storage-config
```

Résultat :
```json
{
  "config": {
    "type": "s3",
    "bucket": "certificates",
    "region": "us-east-1",
    "endpoint": "https://s3.sa-sp.org",
    "forcePathStyle": true
  }
}
```

## 🛠️ Dépannage

### Problème : Le bucket n'est pas créé automatiquement

**Cause** : Permissions insuffisantes

**Solution** : Vérifiez que votre utilisateur MinIO a les permissions :
- `s3:CreateBucket`
- `s3:ListBucket`
- `s3:PutObject`
- `s3:GetObject`

### Problème : Erreur CORS

**Cause** : Le service MinIO ne supporte pas la configuration CORS via API

**Solution** : Configurez CORS manuellement dans MinIO :

```bash
mc alias set myminio https://s3.sa-sp.org ACCESS_KEY SECRET_KEY
mc cors set /path/to/cors.json myminio/certificates
```

Fichier `cors.json` :
```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedHeaders": ["*"]
    }
  ]
}
```

### Problème : L'endpoint n'est pas accessible

**Vérifications** :

1. **DNS** : Vérifiez que le domaine est résolvable
   ```bash
   nslookup s3.sa-sp.org
   ```

2. **Firewall** : Vérifiez que le port est ouvert (généralement 9000 ou 443)
   ```bash
   telnet s3.sa-sp.org 443
   ```

3. **Certificat SSL** : Vérifiez la validité du certificat HTTPS
   ```bash
   openssl s_client -connect s3.sa-sp.org:443
   ```

## 📚 Exemples de configuration

### MinIO local (développement)

```bash
MINIO_ENDPOINT=http://localhost:9000
S3_BUCKET_NAME=dev-bucket
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_REGION=us-east-1
```

### MinIO production avec domaine personnalisé

```bash
MINIO_ENDPOINT=https://s3.monentreprise.com
S3_BUCKET_NAME=production-documents
AWS_ACCESS_KEY_ID=prod_access_key
AWS_SECRET_ACCESS_KEY=prod_secret_key
AWS_REGION=us-east-1
```

### Cloudflare R2

```bash
S3_ENDPOINT=https://[account_id].r2.cloudflarestorage.com
S3_BUCKET_NAME=my-r2-bucket
AWS_ACCESS_KEY_ID=r2_access_key
AWS_SECRET_ACCESS_KEY=r2_secret_key
AWS_REGION=auto
S3_FORCE_PATH_STYLE=true
```

### DigitalOcean Spaces

```bash
S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
S3_BUCKET_NAME=my-space
AWS_ACCESS_KEY_ID=spaces_key
AWS_SECRET_ACCESS_KEY=spaces_secret
AWS_REGION=us-east-1
S3_FORCE_PATH_STYLE=true
```

## ✅ Checklist de configuration MinIO

- [ ] Endpoint MinIO accessible (ping, telnet)
- [ ] Certificat SSL valide (si HTTPS)
- [ ] Access Key et Secret Key valides
- [ ] Région configurée (généralement `us-east-1` pour MinIO)
- [ ] `forcePathStyle` activé (automatique maintenant)
- [ ] Bucket existe ou sera créé automatiquement
- [ ] Permissions utilisateur suffisantes
- [ ] Configuration sauvegardée
- [ ] Test de connexion réussi ✓
- [ ] Upload de template fonctionne ✓

---

**Prochaines étapes** : Une fois la configuration testée et sauvegardée, essayez d'uploader un template pour vérifier que tout fonctionne correctement !

