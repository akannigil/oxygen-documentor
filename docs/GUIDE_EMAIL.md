# Guide d'Utilisation du Système d'Email

## Vue d'ensemble

Le système d'email d'Oxygen Document permet d'envoyer automatiquement les documents générés aux destinataires avec support du publipostage (variables personnalisées) et de multiples providers email (SMTP, Resend).

## 🚀 Configuration

### Variables d'environnement

#### Option 1 : Resend (Recommandé pour production)

```env
# Provider email
EMAIL_PROVIDER="resend"

# Resend API Key (obtenu depuis https://resend.com/api-keys)
RESEND_API_KEY="re_xxxxxxxxxxxxx"

# Email expéditeur (doit être vérifié dans Resend)
RESEND_FROM_EMAIL="noreply@votredomaine.com"
# OU utiliser EMAIL_FROM pour compatibilité
EMAIL_FROM="noreply@votredomaine.com"
```

#### Option 2 : SMTP (Gmail, Outlook, serveur personnalisé)

```env
# Provider email
EMAIL_PROVIDER="smtp"

# Configuration SMTP
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"  # true pour port 465 (SSL)
SMTP_USER="votre-email@gmail.com"
SMTP_PASSWORD="votre-mot-de-passe-app"  # Pour Gmail: mot de passe d'application
EMAIL_FROM="votre-email@gmail.com"
```

#### Variables optionnelles

```env
# Informations de l'organisation
EMAIL_ORGANIZATION_NAME="Votre Organisation"
EMAIL_APP_NAME="Oxygen Document"
EMAIL_CONTACT="contact@votredomaine.com"
EMAIL_REPLY_TO="contact@votredomaine.com"
```

### Configuration Resend

1. Créer un compte sur [resend.com](https://resend.com)
2. Ajouter et vérifier votre domaine (ou utiliser le domaine de test)
3. Créer une API Key dans les paramètres
4. Ajouter `RESEND_API_KEY` et `RESEND_FROM_EMAIL` dans votre `.env.local`

### Configuration SMTP

#### Gmail

1. Activer l'authentification à deux facteurs
2. Générer un [mot de passe d'application](https://myaccount.google.com/apppasswords)
3. Utiliser ce mot de passe dans `SMTP_PASSWORD`

#### Autres providers

- **Outlook/Hotmail** : `smtp.office365.com:587`
- **SendGrid** : `smtp.sendgrid.net:587` (utiliser `apikey` comme user et l'API key comme password)
- **Mailgun** : `smtp.mailgun.org:587`

## 📧 Utilisation

### Envoi via API

#### Endpoint : `POST /api/documents/[id]/send`

**Requête :**

```json
{
  "recipientEmail": "destinataire@example.com",
  "subject": "Votre document est prêt",
  "htmlTemplate": "Template HTML personnalisé (optionnel)",
  "variables": {
    "recipient_name": "Jean Dupont",
    "message": "Votre attestation est prête.",
    "additional_info": "Merci de votre confiance."
  },
  "attachDocument": true,
  "from": "custom@example.com",
  "replyTo": "support@example.com"
}
```

**Réponse :**

```json
{
  "success": true,
  "messageId": "msg_xxxxxxxxxxxxx",
  "message": "Email envoyé avec succès"
}
```

#### Exemple avec cURL

```bash
curl -X POST http://localhost:3000/api/documents/DOCUMENT_ID/send \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{
    "recipientEmail": "destinataire@example.com",
    "subject": "Votre document",
    "attachDocument": true
  }'
```

### Envoi programmatique

```typescript
import { sendDocumentEmail } from '@/lib/email/service'

const result = await sendDocumentEmail({
  documentId: 'doc_123',
  recipientEmail: 'destinataire@example.com',
  subject: 'Votre document est prêt',
  variables: {
    recipient_name: 'Jean Dupont',
    message: 'Votre attestation est prête pour téléchargement.',
  },
  attachDocument: true,
})

if (result.success) {
  console.log('Email envoyé:', result.messageId)
} else {
  console.error('Erreur:', result.error)
}
```

### Envoi en batch

```typescript
import { sendDocumentEmailsBatch } from '@/lib/email/service'

const results = await sendDocumentEmailsBatch([
  {
    documentId: 'doc_1',
    recipientEmail: 'email1@example.com',
    variables: { recipient_name: 'Jean' },
  },
  {
    documentId: 'doc_2',
    recipientEmail: 'email2@example.com',
    variables: { recipient_name: 'Marie' },
  },
])

results.forEach((result) => {
  if (result.success) {
    console.log(`Document ${result.documentId} envoyé`)
  } else {
    console.error(`Erreur pour ${result.documentId}:`, result.error)
  }
})
```

## 🎨 Templates et Publipostage

### Variables disponibles

Le système de templates supporte les variables suivantes :

| Variable                | Description                                    | Exemple                   |
| ----------------------- | ---------------------------------------------- | ------------------------- |
| `{{recipient_name}}`    | Nom du destinataire                            | "Jean Dupont"             |
| `{{recipient_email}}`   | Email du destinataire                          | "jean@example.com"        |
| `{{document_id}}`       | ID du document                                 | "doc_123"                 |
| `{{template_name}}`     | Nom du template                                | "Attestation"             |
| `{{project_name}}`      | Nom du projet                                  | "Projet 2024"             |
| `{{download_url}}`      | URL de téléchargement (signée, valide 7 jours) | "https://..."             |
| `{{organization_name}}` | Nom de l'organisation                          | "Mon Entreprise"          |
| `{{app_name}}`          | Nom de l'application                           | "Oxygen Document"         |
| `{{contact_email}}`     | Email de contact                               | "contact@example.com"     |
| `{{created_at}}`        | Date de création (format français)             | "01/01/2024"              |
| `{{created_at_full}}`   | Date complète de création                      | "01/01/2024, 10:30:00"    |
| `{{message}}`           | Message personnalisé                           | "Votre document est prêt" |
| `{{additional_info}}`   | Informations supplémentaires                   | "..."                     |

### Variables personnalisées

Vous pouvez ajouter vos propres variables depuis les données du document :

```json
{
  "recipientEmail": "jean@example.com",
  "variables": {
    "recipient_name": "Jean Dupont",
    "document_number": "CERT-2024-001",
    "expiry_date": "2024-12-31",
    "custom_field": "Valeur personnalisée"
  }
}
```

### Formats de variables

#### Variables imbriquées

```html
Bonjour {{recipient.name}}, votre document {{document.title}} est prêt.
```

#### Formats de date

```html
Date de création : {{created_at|date:DD/MM/YYYY}} Date complète : {{created_at|date:DD MMMM YYYY}}
```

#### Formats de texte

```html
{{text|uppercase}}
<!-- MAJUSCULES -->
{{text|lowercase}}
<!-- minuscules -->
{{text|capitalize}}
<!-- Première lettre majuscule -->
```

### Template HTML personnalisé

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <style>
      body {
        font-family: Arial, sans-serif;
      }
      .button {
        display: inline-block;
        padding: 12px 24px;
        background-color: #4caf50;
        color: white;
        text-decoration: none;
        border-radius: 4px;
      }
    </style>
  </head>
  <body>
    <h1>Bonjour {{recipient_name}}</h1>
    <p>{{message}}</p>

    {{download_url}}

    <p>{{additional_info}}</p>

    <footer>
      <p>{{app_name}} - {{contact_email}}</p>
    </footer>
  </body>
</html>
```

> **Note** : La variable `{{download_url}}` sera automatiquement remplacée par un bouton HTML si une URL est disponible.

### Template texte brut

Le système génère automatiquement une version texte brut à partir du template HTML. Vous pouvez également fournir un template texte personnalisé :

```typescript
await sendDocumentEmail({
  documentId: 'doc_123',
  recipientEmail: 'destinataire@example.com',
  htmlTemplate: '<p>HTML version</p>',
  textTemplate: 'Version texte brut',
})
```

## 📎 Pièces jointes

### Attacher le document en PDF

```typescript
await sendDocumentEmail({
  documentId: 'doc_123',
  recipientEmail: 'destinataire@example.com',
  attachDocument: true, // Attache le PDF généré
})
```

### Lien de téléchargement uniquement

Par défaut, si `attachDocument` est `false`, seul un lien de téléchargement (URL signée valide 7 jours) est inclus dans l'email.

## 🔒 Sécurité et Permissions

- Seul le propriétaire du projet peut envoyer des emails pour les documents de son projet
- Les URLs de téléchargement sont signées et expirent après 7 jours
- Les variables sont échappées pour éviter les injections XSS
- Les emails nécessitent une authentification (session NextAuth)

## ⚠️ Gestion des erreurs

Le système met automatiquement à jour le statut du document :

- **`sent`** : Email envoyé avec succès
- **`failed`** : Échec lors de l'envoi (message d'erreur stocké dans `errorMessage`)

```typescript
const document = await prisma.document.findUnique({
  where: { id: 'doc_123' },
})

if (document.status === 'sent') {
  console.log('Email envoyé le:', document.emailSentAt)
} else if (document.status === 'failed') {
  console.error('Erreur:', document.errorMessage)
}
```

## 🧪 Tests

### Vérifier la configuration

```typescript
import { emailAdapter } from '@/lib/email'

if (!emailAdapter) {
  console.error('Service email non configuré')
} else {
  console.log('Service email configuré')
}
```

### Test d'envoi

```typescript
import { emailAdapter } from '@/lib/email'

const result = await emailAdapter.send({
  to: 'test@example.com',
  subject: 'Test',
  html: '<p>Test email</p>',
})

console.log('Résultat:', result)
```

## 📚 Références

- [Documentation Resend](https://resend.com/docs)
- [Documentation Nodemailer](https://nodemailer.com/about/)
- [Guide API Documents](./README.md#api-documents)
