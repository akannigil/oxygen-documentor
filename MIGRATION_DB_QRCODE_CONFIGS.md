# Migration Base de Données : qrcodeConfigs

## ⚠️ Action requise

Le schéma Prisma a été modifié pour ajouter le support des configurations QR Code DOCX.

## 🔄 Étapes de migration

### 1. Arrêter le serveur de développement

```bash
# Dans votre terminal où tourne le serveur
Ctrl + C
```

### 2. Générer le client Prisma

```bash
npx prisma generate
```

### 3. Créer la migration

```bash
npx prisma migrate dev --name add_qrcode_configs
```

Cette commande va :
- ✅ Créer un fichier de migration SQL
- ✅ Ajouter la colonne `qrcodeConfigs` à la table `templates`
- ✅ Appliquer la migration à votre base de données

### 4. Redémarrer le serveur

```bash
npm run dev
```

## 📊 Changements dans le schéma

### Avant

```prisma
model Template {
  id          String    @id @default(cuid())
  // ... autres champs
  fields      Json      @default("[]")
  variables   Json?
  // ...
}
```

### Après

```prisma
model Template {
  id          String    @id @default(cuid())
  // ... autres champs
  fields        Json    @default("[]")
  variables     Json?
  qrcodeConfigs Json?   // ← NOUVEAU CHAMP
  // ...
}
```

## 🔍 Vérification

Pour vérifier que la migration a fonctionné :

```bash
npx prisma studio
```

Ouvrez un template de type DOCX et vérifiez que le champ `qrcodeConfigs` est présent.

## 🐛 En cas d'erreur

### Erreur : "Prisma Client is already generating"

Solution :
```bash
# Supprimer le dossier généré
rm -rf node_modules/.prisma
# Régénérer
npx prisma generate
```

### Erreur : "Database connection failed"

Solution :
1. Vérifiez votre fichier `.env`
2. Vérifiez que `DATABASE_URL` est défini
3. Vérifiez que la base de données est accessible

### Erreur de migration

Solution :
```bash
# Reset la base de données (ATTENTION : perte de données)
npx prisma migrate reset

# Ou push le schéma sans migration
npx prisma db push
```

## ✅ C'est fait !

Une fois la migration effectuée, vous pouvez utiliser la nouvelle fonctionnalité de configuration des QR Codes DOCX.

Voir [GUIDE_QRCODE_DOCX_WORKFLOW.md](./GUIDE_QRCODE_DOCX_WORKFLOW.md) pour plus d'informations.

