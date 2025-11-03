# Authentification de Certificats via QR Code 🔐

## Résumé rapide

Ce module permet de générer des certificats **infalsifiables** avec signature cryptographique HMAC. Le QR code contient les données du certificat + une signature qui ne peut être générée que par le serveur possédant la clé secrète.

## Utilisation en 3 étapes

### 1. Configuration

```typescript
import { CertificateAuthConfig } from '@/lib/qrcode/certificate-auth'

const authConfig: CertificateAuthConfig = {
  secretKey: process.env.CERTIFICATE_SECRET_KEY!, // ⚠️ À protéger !
  verificationBaseUrl: 'https://certificates.example.com/verify',
  algorithm: 'sha256',
  expiresIn: 10 * 365 * 24 * 60 * 60, // 10 ans
}
```

### 2. Génération

```typescript
import { generateAuthenticatedCertificate } from '@/lib/qrcode'

const certificateData = {
  certificateId: 'CERT-2024-001',
  holderName: 'Jean Dupont',
  title: 'Formation TypeScript',
  issueDate: '2024-11-02T10:00:00Z',
  issuer: 'Académie Tech',
  grade: 'Excellent',
}

const authenticated = generateAuthenticatedCertificate(
  certificateData,
  authConfig
)

// authenticated.qrCodeData contient le JSON signé à encoder dans le QR code
```

### 3. Vérification

```typescript
import { verifyCertificateSignature } from '@/lib/qrcode'

// Données scannées depuis le QR code
const scannedData = '{"type":"certificate_verification",...}'

const isValid = verifyCertificateSignature(
  scannedData,
  process.env.CERTIFICATE_SECRET_KEY!
)

if (isValid) {
  console.log('✓ Certificat authentique')
} else {
  console.log('✗ Certificat falsifié ou invalide')
}
```

## Fonctionnalités

✅ **Signature HMAC SHA-256/512** : Impossible à falsifier  
✅ **Horodatage** : Chaque certificat a un timestamp unique  
✅ **Expiration configurable** : Certificats temporaires possibles  
✅ **Hash du document** : Vérifier que le PDF/DOCX n'a pas été modifié  
✅ **Métadonnées extensibles** : Ajouter des données personnalisées  
✅ **URL simple** : Option pour QR codes plus légers  

## Cas d'usage

- 🎓 **Diplômes & Certificats de formation**
- 🔧 **Habilitations professionnelles** (électrique, sécurité, etc.)
- 🏥 **Certificats médicaux** (formation continue)
- 🎟️ **Badges événement** avec accès contrôlé
- 📜 **Attestations officielles**
- 🏆 **Certificats de compétences**

## Architecture de sécurité

```
┌─────────────────┐
│  Génération     │
│  (Serveur)      │
│                 │
│  Données        │
│  + Clé secrète  │
│  ↓ HMAC         │
│  Signature      │
└────────┬────────┘
         │
         ↓ QR Code inséré dans document
         │
┌────────┴────────┐
│  Vérification   │
│  (API)          │
│                 │
│  Recalcul       │
│  signature      │
│  ↓ Compare      │
│  ✓ ou ✗         │
└─────────────────┘
```

## Protection contre les attaques

| Attaque | Protection |
|---------|------------|
| Modification données | Signature invalide |
| Faux certificat | Impossible sans la clé |
| Rejeu | Timestamp + DB check |
| Timing attack | `crypto.timingSafeEqual()` |
| Expiration | `expiresIn` + vérification |

## Fichiers importants

- **Module** : `lib/qrcode/certificate-auth.ts`
- **Exemples** : `examples/certificate-auth-usage.ts`
- **Guide complet** : `docs/GUIDE_AUTHENTIFICATION_CERTIFICATS.md`
- **Export** : `lib/qrcode/index.ts`

## API Backend (Express.js)

```typescript
app.post('/api/certificates/verify', async (req, res) => {
  const { qrCodeData } = req.body
  
  // 1. Vérifier la signature
  const isValid = verifyCertificateSignature(
    qrCodeData,
    process.env.CERTIFICATE_SECRET_KEY!
  )
  
  if (!isValid) {
    return res.status(401).json({ valid: false, error: 'Invalide' })
  }
  
  // 2. Parser les données
  const payload = JSON.parse(qrCodeData)
  
  // 3. Vérifier en base de données (révocation, etc.)
  const dbCert = await db.certificates.findOne({ id: payload.certificate.id })
  
  if (!dbCert || dbCert.revoked) {
    return res.status(403).json({ valid: false, error: 'Révoqué' })
  }
  
  return res.json({ valid: true, certificate: payload.certificate })
})
```

## Avantages vs autres solutions

| Solution | Avantages | Inconvénients |
|----------|-----------|---------------|
| **QR Code simple** | Facile | Falsifiable, pas de sécurité |
| **Blockchain** | Immuable | Complexe, coûteux, lent |
| **PKI (certificats X.509)** | Très sécurisé | Infrastructure lourde |
| **HMAC (cette solution)** | ✅ Sécurisé<br>✅ Simple<br>✅ Rapide<br>✅ Pas cher | Nécessite API backend |

## Démarrage rapide

1. **Générer une clé secrète** :
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

2. **Ajouter dans `.env`** :
```bash
CERTIFICATE_SECRET_KEY=votre_cle_generee
```

3. **Utiliser dans votre code** :
```typescript
import { generateAuthenticatedCertificate } from '@/lib/qrcode'
// Voir exemples ci-dessus
```

4. **Créer l'API de vérification** :
- Voir `docs/GUIDE_AUTHENTIFICATION_CERTIFICATS.md` section "Backend"

## ⚠️ IMPORTANT - Sécurité

🔴 **NE JAMAIS** committer la clé secrète dans Git  
🔴 **NE JAMAIS** exposer la clé dans le code client  
🔴 **TOUJOURS** utiliser HTTPS pour l'API  
🟢 **TOUJOURS** logger les vérifications  
🟢 **TOUJOURS** implémenter la révocation  

## Exemples de code

Voir les exemples complets dans :
- `examples/certificate-auth-usage.ts` (8 exemples détaillés)
- `examples/qrcode-usage.ts` (exemple 5B)

## Documentation complète

📖 **[Guide complet d'authentification](./GUIDE_AUTHENTIFICATION_CERTIFICATS.md)**

Contient :
- Explications détaillées du fonctionnement
- Configuration avancée
- Intégration backend complète
- Cas d'usage avancés
- Bonnes pratiques de sécurité
- Dépannage

## Support

Pour toute question ou problème, consulter :
1. Le guide complet (lien ci-dessus)
2. Les exemples de code
3. Les tests de sécurité dans `certificate-auth-usage.ts`

---

**Version** : 1.0  
**Dernière mise à jour** : 2 novembre 2024

