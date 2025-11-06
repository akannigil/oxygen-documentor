# 📋 Guide : Configuration des QR Codes DOCX

## 🎯 Objectif

Ce guide explique comment ajouter et configurer des QR Codes **dynamiques** dans vos templates DOCX, avec un contenu qui varie selon les données de chaque document généré.

---

## 🆕 Nouveauté : QR Codes avec variables

### Avant

```typescript
// Ancien système : contenu statique uniquement
qrcodes: {
  '{{qrcode_url}}': 'https://example.com/static-url'
}
```

### Maintenant

```typescript
// Nouveau système : contenu dynamique avec variables !
qrcodeConfigs: [
  {
    placeholder: '{{qrcode_verification}}',
    contentPattern: 'https://verify.example.com/{{id}}/{{code}}',
    options: {
      width: 200,
      errorCorrectionLevel: 'M'
    }
  }
]
```

**Chaque document généré aura un QR Code unique basé sur ses données !**

---

## 🚀 Workflow complet

### 📝 Étape 1 : Créer le template Word

1. Ouvrez Word
2. Créez votre document avec des variables :

```
Certificat de formation

Nom : {{nom}}
Prénom : {{prenom}}
Date : {{date_formation}}

QR Code de vérification :
{{qrcode_verification}}
```

3. Sauvegardez en `.docx`

### 📤 Étape 2 : Uploader le template

1. Allez dans votre projet
2. Cliquez sur "Nouveau template"
3. Uploadez le fichier `.docx`
4. Les variables sont automatiquement détectées

### ⚙️ Étape 3 : Configurer les QR Codes

**C'est LA nouvelle étape !**

1. **Sur la page du template**, cliquez sur "Configurer les QR Codes"
2. Cliquez sur "+ Ajouter un QR Code"
3. Configurez votre QR Code :

#### Configuration de base

| Champ | Description | Exemple |
|-------|-------------|---------|
| **Placeholder** | Variable dans le template | `{{qrcode_verification}}` |
| **Type de contenu** | Type de données | URL, vCard, Texte, etc. |
| **Pattern de contenu** | Contenu avec variables | `https://verify.com/{{id}}/{{code}}` |

#### Exemple concret

```
Placeholder : {{qrcode_verification}}
Type : URL
Pattern : https://verify.example.com/cert/{{certificat_id}}?name={{nom}}
```

**Résultat** : Chaque document aura un QR Code différent :
- Document 1 : `https://verify.example.com/cert/CERT001?name=Dupont`
- Document 2 : `https://verify.example.com/cert/CERT002?name=Martin`
- Document 3 : `https://verify.example.com/cert/CERT003?name=Bernard`

#### Options visuelles

| Option | Description | Valeurs |
|--------|-------------|---------|
| **Largeur** | Taille du QR Code | 50-500 pixels (défaut: 200) |
| **Marge** | Espacement autour | 0-10 modules (défaut: 1) |
| **Niveau d'erreur** | Résistance aux dommages | L (7%), M (15%), Q (25%), H (30%) |
| **Couleur sombre** | Couleur des modules | Hex (défaut: #000000) |
| **Couleur claire** | Couleur du fond | Hex (défaut: #FFFFFF) |

4. **Sauvegardez** la configuration

### 📊 Étape 4 : Générer les documents

1. Allez dans "Génération de documents"
2. Sélectionnez votre template
3. Importez votre fichier CSV :

```csv
nom,prenom,certificat_id,date_formation
Dupont,Jean,CERT001,2025-01-15
Martin,Marie,CERT002,2025-01-16
Bernard,Paul,CERT003,2025-01-17
```

4. Mappez les colonnes aux variables
5. **Générez** !

---

## 📚 Exemples de patterns

### 1. URL de vérification

```
Pattern : https://verify.example.com/certificate/{{certificat_id}}
Résultat : https://verify.example.com/certificate/CERT001
```

### 2. URL avec plusieurs paramètres

```
Pattern : https://verify.example.com/cert?id={{certificat_id}}&name={{nom}}&date={{date}}
Résultat : https://verify.example.com/cert?id=CERT001&name=Dupont&date=2025-01-15
```

### 3. vCard (Carte de visite)

```
Pattern : 
BEGIN:VCARD
VERSION:3.0
FN:{{nom}} {{prenom}}
TEL:{{telephone}}
EMAIL:{{email}}
ORG:{{entreprise}}
END:VCARD
```

### 4. Email avec sujet

```
Pattern : mailto:{{email}}?subject=Certificat {{certificat_id}}
Résultat : mailto:jean.dupont@example.com?subject=Certificat CERT001
```

### 5. SMS

```
Pattern : sms:{{telephone}}?body=Votre code de vérification: {{code}}
Résultat : sms:+33612345678?body=Votre code de vérification: ABC123
```

### 6. WiFi

```
Pattern : WIFI:T:WPA;S:{{ssid}};P:{{password}};;
Résultat : WIFI:T:WPA;S:MonReseau;P:MotDePasse123;;
```

---

## 🎨 Cas d'usage

### Cas 1 : Certificats de formation

**Besoin** : Chaque certificat doit avoir un QR Code unique pour vérification

```
Variables CSV : certificat_id, nom, prenom, formation
Pattern : https://verify-training.com/cert/{{certificat_id}}
```

### Cas 2 : Badges événement

**Besoin** : QR Code pour enregistrement avec infos participant

```
Variables CSV : badge_id, nom, email, event_id
Pattern : https://event-checkin.com/{{event_id}}/{{badge_id}}?email={{email}}
```

### Cas 3 : Cartes de visite

**Besoin** : QR Code vCard pour ajouter aux contacts

```
Variables CSV : nom, prenom, telephone, email, poste
Pattern : (vCard complet - voir exemple ci-dessus)
```

### Cas 4 : Documents légaux

**Besoin** : Vérification d'authenticité avec hash du document

```
Variables CSV : document_id, date, hash
Pattern : https://legal-verify.com/doc/{{document_id}}/{{hash}}
```

---

## 🔧 Migration depuis l'ancien système

### Si vous utilisez déjà `qrcodes`

**Ancien code :**

```typescript
const docxBuffer = await generateDOCX(templateBuffer, {
  variables: data,
  qrcodes: {
    '{{qrcode_url}}': 'https://static-url.com'
  }
})
```

**Nouveau code (optionnel mais recommandé) :**

```typescript
const docxBuffer = await generateDOCX(templateBuffer, {
  variables: data,
  qrcodeConfigs: [
    {
      placeholder: '{{qrcode_url}}',
      contentPattern: 'https://verify.com/{{user_id}}', // Maintenant avec variables !
      options: {
        width: 200,
        errorCorrectionLevel: 'M'
      }
    }
  ]
})
```

**Note** : Les deux méthodes fonctionnent ! L'ancien système est maintenu pour rétrocompatibilité.

---

## 🛠️ API de configuration

### Sauvegarder les configurations

```typescript
PUT /api/projects/[id]/templates/[templateId]/qrcode-configs

Body:
{
  "qrcodeConfigs": [
    {
      "placeholder": "{{qrcode_verification}}",
      "contentPattern": "https://verify.com/{{id}}",
      "contentType": "url",
      "options": {
        "width": 200,
        "margin": 1,
        "errorCorrectionLevel": "M",
        "color": {
          "dark": "#000000",
          "light": "#FFFFFF"
        }
      }
    }
  ]
}
```

### Récupérer les configurations

```typescript
GET /api/projects/[id]/templates/[templateId]/qrcode-configs

Response:
{
  "qrcodeConfigs": [...]
}
```

---

## ✅ Checklist

- [ ] Template DOCX créé avec variables et placeholders QR Code
- [ ] Template uploadé dans l'application
- [ ] Configuration QR Code effectuée (pattern + options)
- [ ] Configuration sauvegardée
- [ ] Fichier CSV préparé avec toutes les colonnes nécessaires
- [ ] Test de génération sur un document
- [ ] Vérification : QR Code est bien unique par document
- [ ] Validation : Scanner le QR Code fonctionne correctement

---

## 🐛 Résolution de problèmes

### Le QR Code ne s'affiche pas

1. **Vérifiez le placeholder** : Il doit correspondre exactement (case-sensitive)
2. **Vérifiez le pattern** : Les variables doivent exister dans vos données CSV
3. **Regardez la console** : Des erreurs peuvent s'afficher

### Le QR Code est identique pour tous les documents

1. **Vérifiez que vous utilisez bien `qrcodeConfigs`** (pas `qrcodes`)
2. **Vérifiez le pattern** : Il doit contenir des variables (`{{xxx}}`)
3. **Vérifiez les données CSV** : Les colonnes doivent avoir des valeurs différentes

### Le QR Code ne peut pas être scanné

1. **Augmentez le niveau d'erreur** : Passez de M à Q ou H
2. **Augmentez la taille** : width > 200px
3. **Augmentez la marge** : margin = 2 ou 3
4. **Vérifiez le contenu** : Certains scanners n'acceptent que les URLs

---

## 📖 Documentation complète

- [Guide QR Codes général](./docs/GUIDE_QR_CODES.md)
- [Authentification certificats](./docs/GUIDE_AUTHENTIFICATION_CERTIFICATS.md)
- [Types et schémas](./shared/types/index.ts)
- [Référence API](./docs/INDEX_QRCODE.md)

---

## 🎉 Prêt !

Vous pouvez maintenant créer des documents avec des QR Codes **uniques** et **dynamiques** pour chaque génération !

**Questions ?** Consultez la documentation ou créez une issue sur GitHub.

