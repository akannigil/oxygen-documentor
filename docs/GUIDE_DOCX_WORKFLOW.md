# Guide : Workflow DOCX avec publipostage

## 📋 Processus complet pour DOCX

### 1. Upload du template DOCX

1. **Créer un document Word** avec des variables entre accolades :
   ```
   Nom : {{nom}}
   Prénom : {{prenom}}
   Date de naissance : {{date_naissance}}
   Lieu : {{lieu}}
   ```

2. **Uploader le fichier** `.docx` dans l'application
   - Les variables sont **automatiquement détectées** lors de l'upload
   - Le parser extrait uniquement le **texte visible** (ignore le XML)
   - Seules les vraies variables sont détectées (pas les balises XML)

3. **Vérification** : Après l'upload, vous devriez voir :
   - ✅ Variables détectées : `{{nom}}`, `{{prenom}}`, etc.
   - ✅ Nombre d'occurrences pour chaque variable

### 2. Génération de documents

1. **Aller sur la page "Génération de documents"**
   - Les templates DOCX sont identifiés automatiquement
   - Affichage : "X variables détectées" au lieu de "X champs définis"

2. **Sélectionner le template DOCX**
   - Le template DOCX s'affiche dans la grille
   - Indication claire du nombre de variables

3. **Importer des données CSV/Excel**
   - Colonnes : `nom`, `prenom`, `date_naissance`, `lieu`

4. **Mapper les colonnes → variables DOCX**
   - Exemple :
     - Colonne `nom` → Variable `{{nom}}`
     - Colonne `prenom` → Variable `{{prenom}}`
     - Colonne `date_naissance` → Variable `{{date_naissance}}`

5. **Aperçu et génération**
   - Aperçu des variables et leurs valeurs
   - Génération des documents Word avec les variables remplacées

## 🔧 Résolution des problèmes

### Problème : "Template incomplet" alors que le DOCX a des variables

**Causes possibles :**

1. **Client Prisma non régénéré** :
   - Arrêter le serveur de développement
   - Exécuter : `npx prisma generate`
   - Redémarrer : `npm run dev`

2. **Variables non détectées** :
   - Vérifier que les variables sont bien écrites : `{{nom}}` (pas `{nom}` ou `[nom]`)
   - Vérifier qu'elles sont dans le texte visible du document (pas dans les headers/footers complexes)
   - Ré-uploader le fichier DOCX pour re-détecter les variables

3. **TemplateType non défini** :
   - Le système utilise un fallback basé sur le MIME type
   - Si le MIME type est correct (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`), le type sera détecté automatiquement

### Problème : Variables non trouvées dans la génération

**Solutions :**

1. **Vérifier le mapping** :
   - Les noms des colonnes CSV doivent correspondre aux noms des variables
   - Exemple : si la variable est `{{nom}}`, la colonne CSV doit s'appeler `nom`

2. **Vérifier le format des données** :
   - Les dates doivent être au format ISO (YYYY-MM-DD) ou format lisible
   - Les nombres doivent être des nombres, pas du texte

## ✅ Checklist

Avant de générer des documents DOCX :

- [ ] Template DOCX uploadé avec succès
- [ ] Variables détectées (affichées dans la page de détails du template)
- [ ] Au moins une variable détectée
- [ ] Fichier CSV/Excel avec les colonnes correspondantes
- [ ] Mapping correct : colonnes CSV → variables DOCX
- [ ] Aperçu des données correct

## 📝 Exemple complet

**Template Word** (`attestation.docx`) :
```
ATTESTATION

Nom : {{nom}}
Prénom : {{prenom}}
Date : {{date}}
Lieu : {{lieu}}
```

**Fichier CSV** (`data.csv`) :
```csv
nom,prenom,date,lieu
Dupont,Jean,2024-01-15,Paris
Martin,Marie,2024-02-20,Lyon
```

**Mapping** :
- `nom` → `{{nom}}`
- `prenom` → `{{prenom}}`
- `date` → `{{date}}`
- `lieu` → `{{lieu}}`

**Résultat** : 2 documents Word générés avec les variables remplacées.

