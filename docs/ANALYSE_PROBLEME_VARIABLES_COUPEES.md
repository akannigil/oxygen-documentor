# Analyse du problème : Variables coupées au premier mot

## Problème identifié

Lors de la génération de documents DOCX, certaines variables sont coupées au premier mot au lieu d'afficher la valeur complète.

### Exemples de problèmes

- **Variable** : `fullname_author` avec valeur `DÉSIRÉ KETEHOUNDJE`
  - **Résultat attendu** : `DÉSIRÉ KETEHOUNDJE`
  - **Résultat observé** : `DÉSIRÉ` (seulement le premier mot)

- **Variable** : `intitule` avec valeur `Evaluation de la mise en œuvre de l'approche « 5S-Kaizen-Total Quality Management » en 2024`
  - **Résultat attendu** : `Evaluation de la mise en œuvre de l'approche « 5S-Kaizen-Total Quality Management » en 2024`
  - **Résultat observé** : `Evaluation` (seulement le premier mot)

## Cause racine

Le problème est causé par la façon dont Microsoft Word stocke le texte dans le format DOCX (XML). Quand Word divise une variable en plusieurs nœuds XML `<w:t>` (souvent à cause d'espaces ou de formatage), la bibliothèque `docxtemplater` peut ne remplacer que le premier nœud, laissant le reste intact.

**Cas particulier : Zones de texte (TextBox)**

Quand une variable est insérée dans une **zone de texte** (TextBox) dans Word, le problème est encore plus fréquent car :
1. Les zones de texte ont une largeur fixe
2. Word ajuste automatiquement le texte à la largeur de la zone (word-wrap)
3. Le texte est divisé en plusieurs nœuds `<w:t>` à chaque retour à la ligne automatique
4. `docxtemplater` peut ne remplacer que le premier nœud, laissant le reste intact

Les zones de texte sont stockées dans des éléments `<w:txbxContent>` dans le XML DOCX.

### Structure XML DOCX

Dans un document DOCX, le texte est stocké dans une structure XML hiérarchique :

```xml
<w:p>  <!-- Paragraphe -->
  <w:r>  <!-- Run (portion de texte avec formatage) -->
    <w:t>Premier mot</w:t>  <!-- Texte -->
  </w:r>
  <w:r>
    <w:t> </w:t>  <!-- Espace -->
  </w:r>
  <w:r>
    <w:t>Deuxième mot</w:t>
  </w:r>
</w:p>
```

Quand une variable comme `{{fullname_author}}` est insérée dans Word, elle peut être divisée en plusieurs nœuds `<w:t>` :

```xml
<w:p>
  <w:r>
    <w:t>{{fullname_author}}</w:t>  <!-- Variable complète -->
  </w:r>
</w:p>
```

Mais si Word a appliqué un formatage ou si l'utilisateur a modifié le texte, la variable peut être divisée :

```xml
<w:p>
  <w:r>
    <w:t>{{fullname</w:t>  <!-- Première partie -->
  </w:r>
  <w:r>
    <w:t>_author}}</w:t>  <!-- Deuxième partie -->
  </w:r>
</w:p>
```

Quand `docxtemplater` remplace la variable, il peut ne remplacer que le premier nœud :

```xml
<w:p>
  <w:r>
    <w:t>DÉSIRÉ</w:t>  <!-- Seulement le premier mot remplacé -->
  </w:r>
  <w:r>
    <w:t>_author}}</w:t>  <!-- Reste de la variable non remplacée -->
  </w:r>
</w:p>
```

## Solution implémentée

Une fonction de post-traitement `fixSplitVariables()` a été ajoutée dans `lib/generators/docx-style-module.ts` pour corriger ce problème.

### Fonctionnement

1. **Détection** : Après le rendu par `docxtemplater`, la fonction analyse le XML DOCX pour identifier les variables partiellement remplacées.

2. **Identification** : Pour chaque variable remplacée, la fonction cherche les nœuds `<w:t>` qui contiennent seulement le premier mot de la valeur.

3. **Correction** : 
   - Remplace le contenu du premier nœud par la valeur complète
   - Supprime les nœuds suivants qui contiennent le reste de la valeur

4. **Support des zones de texte** : La fonction traite aussi les zones de texte (`<w:txbxContent>`) où les variables peuvent être divisées, ainsi que les en-têtes et pieds de page.

### Intégration

La fonction est appelée immédiatement après `doc.render()` dans `lib/generators/docx.ts` :

```typescript
// Rendre le template avec les données
doc.render(formattedData)

// Corriger les variables qui ont été partiellement remplacées
const { fixSplitVariables } = await import('./docx-style-module')
fixSplitVariables(doc.getZip(), formattedData)
```

## Limitations

- La fonction ne peut corriger que les variables qui ont été partiellement remplacées (premier mot visible)
- Elle ne peut pas corriger les variables qui n'ont pas été remplacées du tout
- Elle peut avoir des difficultés avec des variables très complexes (formatage multiple, tableaux, etc.)

## Recommandations

1. **Prévention** : Lors de la création du template DOCX dans Word, éviter de modifier manuellement les variables après leur insertion.

2. **Vérification** : Après la génération, vérifier que toutes les variables sont correctement remplacées.

3. **Diagnostic** : Utiliser la fonction `diagnoseVariableInDOCX()` dans `lib/generators/docx-diagnostic.ts` pour analyser les problèmes de variables dans un template.

## Tests recommandés

1. Tester avec des variables contenant plusieurs mots séparés par des espaces
2. Tester avec des variables contenant des caractères spéciaux
3. Tester avec des variables dans différents contextes (paragraphes, tableaux, en-têtes, pieds de page)

