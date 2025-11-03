# Configuration de l'authentification des certificats

## Variables d'environnement

### CERTIFICATE_SECRET_KEY (REQUIS)

Clé secrète utilisée pour signer et vérifier les certificats.

**Génération :**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Exemple de sortie :**
```
8f3a2c1b9e7d6f5a4c3b2a1f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9
```

**Configuration dans `.env` :**
```bash
CERTIFICATE_SECRET_KEY=8f3a2c1b9e7d6f5a4c3b2a1f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9
```

⚠️ **IMPORTANT** :
- Utiliser une clé de **minimum 256 bits** (32 bytes en hex = 64 caractères)
- **NE JAMAIS** committer cette clé dans Git
- Ajouter `.env` dans `.gitignore`
- Utiliser un gestionnaire de secrets en production (AWS Secrets Manager, Azure Key Vault, etc.)

### VERIFICATION_BASE_URL (OPTIONNEL)

URL de base pour la vérification des certificats.

**Exemple :**
```bash
VERIFICATION_BASE_URL=https://certificates.example.com/verify
```

**Utilisation dans le code :**
```typescript
const authConfig: CertificateAuthConfig = {
  secretKey: process.env['CERTIFICATE_SECRET_KEY']!,
  verificationBaseUrl: process.env['VERIFICATION_BASE_URL'] ?? 'https://default.com/verify',
  algorithm: 'sha256',
  expiresIn: 10 * 365 * 24 * 60 * 60,
}
```

## Rotation des clés

Il est recommandé de changer la clé secrète périodiquement (tous les 1-2 ans).

**Procédure de rotation :**

1. **Générer une nouvelle clé**
```bash
NEW_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "Nouvelle clé: $NEW_KEY"
```

2. **Supporter les deux clés temporairement**
```typescript
const SECRET_KEYS = [
  process.env['CERTIFICATE_SECRET_KEY']!, // Ancienne clé
  process.env['CERTIFICATE_SECRET_KEY_NEW']!, // Nouvelle clé
]

function verifyCertificateWithMultipleKeys(qrCodeData: string): boolean {
  for (const key of SECRET_KEYS) {
    if (verifyCertificateSignature(qrCodeData, key)) {
      return true
    }
  }
  return false
}
```

3. **Période de transition** (1-3 mois)
   - Les nouveaux certificats utilisent la nouvelle clé
   - Les anciens certificats sont encore valides avec l'ancienne clé

4. **Décommissionnement de l'ancienne clé**
   - Après la période de transition, supprimer l'ancienne clé
   - Révoquer les certificats critiques émis avec l'ancienne clé

## Environnements

### Développement

```bash
# .env.development
CERTIFICATE_SECRET_KEY=dev-key-not-secure-8f3a2c1b9e7d6f5a4c3b2a1f8e7d6c5b
VERIFICATION_BASE_URL=http://localhost:3000/api/certificates/verify
```

### Staging

```bash
# .env.staging
CERTIFICATE_SECRET_KEY=${STAGING_SECRET_FROM_VAULT}
VERIFICATION_BASE_URL=https://staging.certificates.example.com/verify
```

### Production

```bash
# .env.production (ou gestionnaire de secrets)
CERTIFICATE_SECRET_KEY=${PRODUCTION_SECRET_FROM_VAULT}
VERIFICATION_BASE_URL=https://certificates.example.com/verify
```

## Sécurité

### ✅ À FAIRE

- Utiliser un gestionnaire de secrets en production
- Limiter l'accès à la clé (principe du moindre privilège)
- Logger tous les accès à la clé
- Chiffrer les backups contenant la clé
- Utiliser HTTPS pour toutes les communications
- Implémenter rate limiting sur l'API de vérification

### ❌ À NE PAS FAIRE

- Coder la clé en dur dans le code
- Envoyer la clé par email ou chat
- Utiliser la même clé pour dev/staging/production
- Partager la clé avec des tiers
- Stocker la clé en clair dans un fichier versionné

## Vérification de la configuration

Script de vérification :

```typescript
import crypto from 'crypto'

function verifyConfiguration() {
  const secretKey = process.env['CERTIFICATE_SECRET_KEY']
  
  if (!secretKey) {
    console.error('❌ CERTIFICATE_SECRET_KEY non définie')
    process.exit(1)
  }
  
  if (secretKey.length < 64) {
    console.error('❌ CERTIFICATE_SECRET_KEY trop courte (minimum 64 caractères)')
    console.error(`   Longueur actuelle: ${secretKey.length}`)
    process.exit(1)
  }
  
  if (secretKey.includes('demo') || secretKey.includes('test')) {
    console.warn('⚠️  CERTIFICATE_SECRET_KEY semble être une clé de test')
  }
  
  // Vérifier que la clé est en hexadécimal
  if (!/^[0-9a-f]+$/i.test(secretKey)) {
    console.warn('⚠️  CERTIFICATE_SECRET_KEY n\'est pas en hexadécimal')
  }
  
  console.log('✅ Configuration valide')
  console.log(`   Longueur de la clé: ${secretKey.length} caractères`)
  console.log(`   Entropie: ${secretKey.length * 4} bits`)
}

verifyConfiguration()
```

## Gestionnaires de secrets recommandés

### AWS Secrets Manager

```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'

const client = new SecretsManagerClient({ region: 'us-east-1' })

async function getSecretKey(): Promise<string> {
  const command = new GetSecretValueCommand({
    SecretId: 'certificate-secret-key',
  })
  
  const response = await client.send(command)
  return response.SecretString!
}
```

### Azure Key Vault

```typescript
import { SecretClient } from '@azure/keyvault-secrets'
import { DefaultAzureCredential } from '@azure/identity'

const credential = new DefaultAzureCredential()
const vaultUrl = 'https://your-vault.vault.azure.net'
const client = new SecretClient(vaultUrl, credential)

async function getSecretKey(): Promise<string> {
  const secret = await client.getSecret('certificate-secret-key')
  return secret.value!
}
```

### HashiCorp Vault

```typescript
import vault from 'node-vault'

const client = vault({
  endpoint: 'https://vault.example.com',
  token: process.env['VAULT_TOKEN'],
})

async function getSecretKey(): Promise<string> {
  const result = await client.read('secret/data/certificate-secret-key')
  return result.data.data.value
}
```

## Audit et monitoring

Implémenter un audit trail pour toutes les opérations impliquant la clé :

```typescript
interface SecretKeyAudit {
  timestamp: Date
  operation: 'read' | 'rotate' | 'verify'
  userId?: string
  ipAddress?: string
  success: boolean
  error?: string
}

async function logSecretKeyAccess(audit: SecretKeyAudit) {
  await db.auditLogs.create({
    ...audit,
    type: 'secret_key_access',
  })
  
  // Alerter en cas d'échec
  if (!audit.success) {
    await alerting.sendAlert({
      severity: 'high',
      message: `Tentative d'accès à la clé secrète échouée: ${audit.error}`,
      metadata: audit,
    })
  }
}
```

## Troubleshooting

### Erreur : "secretKey est requis"

**Cause** : Variable d'environnement non définie

**Solution** :
```bash
# Vérifier la variable
echo $CERTIFICATE_SECRET_KEY

# Si vide, définir
export CERTIFICATE_SECRET_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

### Erreur : "Signature invalide"

**Causes possibles** :
1. Mauvaise clé utilisée
2. Clé modifiée entre génération et vérification
3. Données du certificat modifiées

**Solution** :
```typescript
// Vérifier quelle clé a été utilisée
console.log('Clé génération:', process.env['CERTIFICATE_SECRET_KEY']?.substring(0, 8) + '...')
console.log('Clé vérification:', secretKey.substring(0, 8) + '...')
```

### Erreur : "Token expiré"

**Cause** : `expiresIn` trop court ou horloge système désynchronisée

**Solution** :
1. Vérifier l'horloge système
2. Augmenter `expiresIn`
3. Utiliser NTP pour synchroniser les horloges

## Ressources

- [OWASP Secret Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [NIST Key Management Guidelines](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)
- [Guide complet d'authentification](./GUIDE_AUTHENTIFICATION_CERTIFICATS.md)

