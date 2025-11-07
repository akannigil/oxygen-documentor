# Résolution du problème de contrainte de clé étrangère `projects_ownerId_fkey`

## Problème

Vous rencontrez l'erreur suivante lors de la création d'un projet :

```
Foreign key constraint violated: `projects_ownerId_fkey (index)`
```

## Cause

Cette erreur se produit lorsque l'ID utilisateur (`ownerId`) référencé dans la session n'existe pas dans la table `users` de la base de données. Cela peut arriver dans les situations suivantes :

1. **Aucun utilisateur n'a été créé dans la base de données**
2. **L'utilisateur de la session a été supprimé de la base de données**
3. **Incohérence entre la session et la base de données**

## Solution

### Étape 1 : Installer les dépendances

Si ce n'est pas déjà fait, installez les nouvelles dépendances :

```bash
npm install
```

### Étape 2 : Créer un utilisateur

Utilisez le script interactif pour créer un utilisateur :

```bash
npm run user:create
```

Le script vous demandera :

- **Email** : L'adresse email de l'utilisateur
- **Mot de passe** : Au moins 6 caractères
- **Nom** (optionnel) : Le nom complet de l'utilisateur
- **Rôle** (optionnel) : `user` (par défaut) ou `owner`

Exemple d'exécution :

```
🚀 Création d'un nouvel utilisateur

Email: admin@example.com
Mot de passe (min. 6 caractères): ••••••
Nom (optionnel): Admin User
Rôle (user/owner, par défaut: user): owner

✅ Utilisateur créé avec succès !

Détails:
  ID: clx1234567890abcdefghij
  Email: admin@example.com
  Nom: Admin User
  Rôle: owner
```

### Étape 3 : Se connecter avec le nouvel utilisateur

1. Déconnectez-vous si vous êtes connecté
2. Allez sur la page de connexion : `/login`
3. Utilisez l'email et le mot de passe que vous venez de créer
4. Essayez à nouveau de créer un projet

## Vérifications supplémentaires

### Vérifier les utilisateurs existants

Vous pouvez vérifier les utilisateurs dans votre base de données avec Prisma Studio :

```bash
npm run db:studio
```

Ouvrez votre navigateur à l'adresse indiquée (généralement `http://localhost:5555`) et naviguez vers la table `User`.

### Vérifier la base de données

Assurez-vous que votre base de données est à jour :

```bash
npm run db:push
```

## Améliorations apportées

Le code a été amélioré pour mieux gérer ce type d'erreur :

1. **Vérification de l'existence de l'utilisateur** avant de créer un projet
2. **Messages d'erreur plus explicites** pour faciliter le débogage
3. **Validation de l'ID de session** pour s'assurer qu'il n'est pas vide

Ces changements dans `app/api/projects/route.ts` permettent de :

- Détecter plus tôt les problèmes d'utilisateur manquant
- Fournir des messages d'erreur clairs à l'utilisateur
- Faciliter le débogage avec des logs détaillés

## Script de création d'utilisateur

Le script `scripts/create-user.ts` permet de :

- Créer un nouvel utilisateur avec un mot de passe hashé
- Mettre à jour le mot de passe d'un utilisateur existant
- Vérifier l'unicité de l'email
- Définir le rôle de l'utilisateur

## Problèmes persistants

Si le problème persiste après avoir créé un utilisateur :

1. **Vérifiez les logs de la console** pour voir l'ID utilisateur utilisé
2. **Effacez les cookies/session** de votre navigateur
3. **Reconnectez-vous** avec le compte nouvellement créé
4. **Vérifiez la configuration de NextAuth** dans `lib/auth/config.ts`

Si vous avez besoin d'aide supplémentaire, vérifiez les logs détaillés dans la console du serveur.
