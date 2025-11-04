# Scripts d'administration

Ce dossier contient des scripts utilitaires pour gérer votre application Oxygen Document.

## Scripts disponibles

### create-user.ts

Script interactif pour créer ou mettre à jour des utilisateurs dans la base de données.

#### Utilisation

```bash
npm run user:create
```

#### Fonctionnalités

- ✅ Création d'un nouvel utilisateur
- ✅ Mise à jour du mot de passe d'un utilisateur existant
- ✅ Hashage sécurisé des mots de passe avec bcrypt
- ✅ Validation des données (email, longueur du mot de passe)
- ✅ Gestion des rôles utilisateur

#### Exemple

```
npm run user:create

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

#### Rôles disponibles

- **user** : Utilisateur standard (par défaut)
- **owner** : Propriétaire avec tous les droits

#### Cas d'utilisation

1. **Premier démarrage** : Créez votre premier utilisateur administrateur
2. **Mot de passe oublié** : Réinitialisez le mot de passe d'un utilisateur
3. **Nouveaux utilisateurs** : Ajoutez des utilisateurs sans passer par l'interface
4. **Tests** : Créez rapidement des utilisateurs de test

#### Sécurité

- Les mots de passe sont hashés avec bcrypt (10 rounds de salage)
- Les mots de passe en clair ne sont jamais stockés dans la base de données
- Validation de la longueur minimale du mot de passe (6 caractères)

## Prérequis

Avant d'exécuter les scripts, assurez-vous que :

1. La base de données est configurée et accessible
2. Les dépendances sont installées : `npm install`
3. Prisma est à jour : `npm run db:generate`
4. Les variables d'environnement sont configurées (`.env`)

## Développement

Pour ajouter de nouveaux scripts :

1. Créez un fichier `.ts` dans ce dossier
2. Ajoutez un script npm dans `package.json`
3. Documentez-le dans ce README
4. Utilisez TypeScript pour la sécurité des types

