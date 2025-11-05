# Migration Base de Données : mailDefaults

## ⚠️ Action requise

Le schéma Prisma a été modifié pour ajouter le support des configurations email par défaut (`mailDefaults`).

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
npx prisma migrate dev --name add_mail_defaults
```

Cette commande va :
- ✅ Créer un fichier de migration SQL
- ✅ Ajouter la colonne `mailDefaults` à la table `templates`
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
  qrcodeConfigs Json?
  // ...
}
```

### Après

```prisma
model Template {
  id          String    @id @default(cuid())
  // ... autres champs
  qrcodeConfigs Json?
  mailDefaults Json?    // ← NOUVEAU CHAMP
  // ...
}
```

## 🔍 Vérification

Pour vérifier que la migration a fonctionné :

```bash
npx prisma studio
```

Ouvrez un template et vérifiez que le champ `mailDefaults` est présent.

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
# Push le schéma sans migration (dev uniquement)
npx prisma db push
```

## ✅ Note importante

Le code a été modifié pour utiliser un cast `as any` temporaire sur le champ `mailDefaults` afin de contourner l'erreur Prisma. Une fois la migration appliquée et le client Prisma régénéré, vous pouvez retirer ce cast si vous le souhaitez (bien que ce ne soit pas obligatoire).

## ✅ C'est fait !

Une fois la migration appliquée, le champ `mailDefaults` sera disponible et vous pourrez sauvegarder les configurations email par défaut pour vos templates.

