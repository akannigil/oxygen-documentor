# Dépannage de la génération de PDF

## Problème : Le document PDF n'est plus généré

Ce guide vous aide à identifier et résoudre les problèmes de génération de PDF.

## ✅ Vérifications préliminaires

### 1. Vérifier que l'utilisateur existe dans la base de données

Le problème le plus courant est qu'un utilisateur n'existe pas dans la base de données alors que la session est active.

**Solution :**
```bash
npm run user:create
```

Créez un utilisateur avec l'email utilisé pour vous connecter.

### 2. Vérifier les logs du serveur

Les erreurs sont maintenant mieux loggées. Vérifiez la console du serveur pour voir :
- `Session user ID is missing` - L'ID utilisateur n'est pas dans la session
- `User does not exist in database` - L'utilisateur n'existe pas en base
- `Doc generation failed` - Erreur lors de la génération d'un document spécifique

### 3. Vérifier les erreurs dans la console du navigateur

Ouvrez les outils de développement (F12) et vérifiez l'onglet Network pour voir les erreurs HTTP et les messages d'erreur retournés par l'API.

## 🔍 Diagnostic étape par étape

### Étape 1 : Vérifier l'authentification

1. Vérifiez que vous êtes bien connecté
2. Vérifiez que votre session contient un `user.id`
3. Vérifiez que cet utilisateur existe dans la base de données

**Test rapide :**
```bash
npm run db:studio
```

Ouvrez la table `User` et vérifiez que votre utilisateur existe.

### Étape 2 : Vérifier le projet

1. Vérifiez que le projet existe
2. Vérifiez que vous êtes le propriétaire du projet (`project.ownerId === session.user.id`)

**Erreurs possibles :**
- `Projet non trouvé` - Le projet n'existe pas ou l'ID est incorrect
- `Non autorisé` - Vous n'êtes pas le propriétaire du projet

### Étape 3 : Vérifier le template

1. Vérifiez que le template existe
2. Vérifiez que le template appartient au projet
3. Vérifiez que le fichier template existe dans le stockage

**Erreurs possibles :**
- `Template non trouvé` - Le template n'existe pas ou n'appartient pas au projet
- Erreur lors du chargement du template depuis le stockage

### Étape 4 : Vérifier les données

1. Vérifiez que les `rows` contiennent des données
2. Vérifiez que les données sont bien formatées (JSON valide)
3. Vérifiez que les champs du template correspondent aux clés des données

**Erreurs possibles :**
- `rows requis` - Aucune donnée n'a été fournie
- `Taille maximale 100 lignes par requête` - Trop de lignes dans une seule requête

### Étape 5 : Vérifier la génération

Les erreurs de génération sont maintenant mieux gérées :

1. **Erreurs de génération PDF/Image :**
   - Vérifiez que le template peut être chargé
   - Vérifiez que les champs sont bien définis
   - Vérifiez que les données correspondent aux champs

2. **Erreurs de génération DOCX :**
   - Vérifiez que le template DOCX est valide
   - Vérifiez que les variables sont bien formatées
   - Vérifiez que la conversion PDF fonctionne (si demandée)

3. **Erreurs de stockage :**
   - Vérifiez que le stockage est configuré (S3, FTP, ou local)
   - Vérifiez les permissions d'écriture
   - Vérifiez les variables d'environnement

## 🛠️ Solutions communes

### Problème : "Utilisateur non trouvé. Veuillez vous reconnecter."

**Cause :** L'utilisateur de la session n'existe pas dans la base de données.

**Solution :**
1. Créez l'utilisateur avec `npm run user:create`
2. Déconnectez-vous et reconnectez-vous
3. Essayez à nouveau de générer le PDF

### Problème : "Aucun document n'a pu être généré"

**Cause :** Tous les documents ont échoué lors de la génération.

**Solution :**
1. Vérifiez les logs du serveur pour voir l'erreur exacte
2. Vérifiez que le template est valide
3. Vérifiez que les données sont correctes
4. Vérifiez que le stockage est configuré

### Problème : Erreur silencieuse (aucune erreur mais pas de PDF)

**Cause :** L'erreur est capturée mais pas remontée.

**Solution :**
1. Vérifiez les logs du serveur (console)
2. Vérifiez les documents dans la base de données avec `status: 'failed'`
3. Vérifiez le champ `errorMessage` des documents

### Problème : Erreur de contrainte de clé étrangère

**Cause :** Une référence à une entité inexistante (projet, template, utilisateur).

**Solution :**
1. Vérifiez que tous les entités existent (User, Project, Template)
2. Vérifiez que les IDs sont corrects
3. Vérifiez que les relations sont cohérentes

## 📊 Vérification des documents générés

### Avec Prisma Studio

```bash
npm run db:studio
```

Ouvrez la table `Document` et vérifiez :
- `status` : `'generated'` (succès) ou `'failed'` (échec)
- `errorMessage` : Message d'erreur si le statut est `'failed'`
- `filePath` : Chemin du fichier généré
- `mimeType` : Type MIME du document

### Avec la base de données

```sql
SELECT 
  id, 
  status, 
  "errorMessage", 
  "filePath", 
  "mimeType",
  "createdAt"
FROM documents
WHERE "projectId" = 'YOUR_PROJECT_ID'
ORDER BY "createdAt" DESC
LIMIT 10;
```

## 🔧 Améliorations apportées

1. **Vérification de l'utilisateur** : Vérifie que l'utilisateur existe avant de générer
2. **Gestion d'erreur améliorée** : Marque les documents comme `failed` avec un message d'erreur
3. **Logs détaillés** : Log tous les détails des erreurs pour faciliter le débogage
4. **Messages d'erreur clairs** : Retourne des messages d'erreur explicites

## 📝 Prochaines étapes si le problème persiste

1. **Vérifiez les logs complets** du serveur
2. **Vérifiez les documents échoués** dans la base de données
3. **Testez avec un template simple** pour isoler le problème
4. **Vérifiez la configuration du stockage**
5. **Vérifiez les variables d'environnement**

## 🆘 Support

Si le problème persiste après avoir suivi ces étapes :

1. Collectez les logs du serveur
2. Notez les erreurs exactes (messages d'erreur complets)
3. Notez les étapes pour reproduire le problème
4. Vérifiez la configuration de votre environnement

