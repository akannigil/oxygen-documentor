# Implémentation du Layout Global

## Vue d'ensemble

Un système de layout complet a été ajouté à l'application Oxygen Document avec un header, footer et navigation contextuelle, tout en préservant les workflows existants.

## Architecture

### Structure des fichiers

```
components/layout/
├── Header.tsx              # En-tête principal avec navigation et menu utilisateur
├── Footer.tsx              # Pied de page avec liens et informations
├── MainLayout.tsx          # Layout principal qui enveloppe l'application
├── ProjectNav.tsx          # Navigation contextuelle pour les pages projet
└── ContextualNav.tsx       # Détection automatique du contexte et affichage de la navigation

app/
├── layout.tsx              # Layout root (inchangé)
├── (main)/                 # Groupe de routes avec layout authentifié
│   ├── layout.tsx          # Layout du groupe (authentification requise)
│   ├── dashboard/
│   ├── projects/
│   ├── documents/
│   └── docs/
├── page.tsx                # Page d'accueil (sans layout)
├── login/                  # Pages publiques (sans layout)
└── signup/
```

## Composants créés

### 1. Header (`components/layout/Header.tsx`)

**Fonctionnalités :**
- Logo et nom de l'application
- Navigation principale (Dashboard, Projets, Documents)
- Bouton "Nouveau projet" en accès rapide
- Menu utilisateur avec avatar et informations
- Bouton de déconnexion
- Menu mobile responsive

**Props :**
- `userEmail?: string` - Email de l'utilisateur connecté
- `userName?: string | null` - Nom de l'utilisateur

### 2. Footer (`components/layout/Footer.tsx`)

**Fonctionnalités :**
- Logo et description de l'application
- Liens vers les ressources (Documentation, Guides, API)
- Liens vers la configuration (Projets, Profil)
- Liens de support (Aide, Contact)
- Statut de l'API
- Copyright et liens légaux

**Props :**
- `userEmail?: string` - Email de l'utilisateur connecté

### 3. MainLayout (`components/layout/MainLayout.tsx`)

**Fonctionnalités :**
- Wrapper principal qui combine Header, ContextualNav, contenu et Footer
- Structure flex pour garder le footer en bas
- Background gradient cohérent

**Props :**
- `children: ReactNode` - Contenu de la page
- `userEmail?: string` - Email de l'utilisateur
- `userName?: string | null` - Nom de l'utilisateur

### 4. ProjectNav (`components/layout/ProjectNav.tsx`)

**Fonctionnalités :**
- Navigation contextuelle pour les pages de projet
- Fil d'Ariane avec nom du projet
- Liens rapides : Aperçu, Templates, Générer, Documents, Stockage
- Indicateur visuel de la page active

**Props :**
- `projectId: string` - ID du projet
- `projectName?: string` - Nom du projet

### 5. ContextualNav (`components/layout/ContextualNav.tsx`)

**Fonctionnalités :**
- Détection automatique si on est dans un contexte de projet
- Chargement des informations du projet via l'API
- Affichage conditionnel de la ProjectNav

## Groupe de routes (main)

### app/(main)/layout.tsx

- **Authentification automatique** : Redirige vers `/login` si non connecté
- **Injection des props** : Passe les informations utilisateur au MainLayout
- **Wrapper transparent** : Englobe toutes les routes authentifiées

### Pages migrées dans (main)/

- ✅ `/dashboard` - Dashboard principal
- ✅ `/projects/*` - Toutes les routes de projets
- ✅ `/documents/*` - Pages de documents
- ✅ `/docs` - Documentation (nouvelle)

### Pages restées à la racine

- ✅ `/` - Page d'accueil (sans layout)
- ✅ `/login` - Page de connexion (sans layout)
- ✅ `/signup` - Page d'inscription (sans layout)

## Modifications des pages existantes

### Simplification des styles

Les pages suivantes ont été simplifiées en retirant les classes redondantes :
- Suppression de `min-h-screen` (géré par le layout)
- Suppression de `bg-gradient-to-br from-gray-50 via-white to-gray-50` (géré par le layout)
- Conservation uniquement de `mx-auto max-w-*xl px-4 py-8`

**Pages modifiées :**
- `app/(main)/dashboard/page.tsx`
- `app/(main)/projects/[id]/page.tsx`
- `app/(main)/projects/[id]/generate/page.tsx`
- `app/(main)/projects/[id]/documents/page.tsx`

## Workflows préservés

### ✅ GenerationWorkflow

Le composant `GenerationWorkflow` utilisé dans `/projects/[id]/generate` fonctionne sans modification :
- Étapes (Import, Aperçu, Confirmation, Génération) intactes
- Interface utilisateur préservée
- Intégration seamless avec le nouveau layout

### ✅ WorkflowSteps

Le composant `WorkflowSteps` utilisé dans diverses pages reste pleinement fonctionnel :
- Navigation entre les étapes
- Indicateurs visuels
- Actions personnalisées

## Navigation améliorée

### Accès rapide aux ressources

**Dans le Header :**
- Dashboard
- Projets
- Mes documents
- Nouveau projet (bouton d'action)

**Dans le Footer :**
- Documentation
- Guides
- API
- Configuration

### Navigation contextuelle

Quand on navigue dans un projet, une barre de navigation secondaire apparaît automatiquement avec :
- Fil d'Ariane (Projets > Nom du projet)
- Onglets : Aperçu, Templates, Générer, Documents, Stockage

## Responsive Design

### Mobile
- Menu hamburger dans le header
- Navigation empilée verticalement
- Footer adapté avec colonnes réorganisées

### Desktop
- Navigation horizontale complète
- Menu utilisateur avec avatar
- Footer multi-colonnes

## TypeScript & Linting

- ✅ **Tous les types sont stricts** : Utilisation de `| undefined` pour les props optionnelles
- ✅ **Aucune erreur de linting** : Code conforme aux règles TypeScript strictes
- ✅ **Typage complet** : Toutes les interfaces et props sont typées

## Configuration requise

### tsconfig.json

Le projet utilise déjà une configuration stricte :
```json
{
  "compilerOptions": {
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    ...
  }
}
```

## Tests recommandés

### Flux à tester

1. **Navigation principale**
   - [ ] Accès au dashboard depuis le header
   - [ ] Création d'un nouveau projet depuis le header
   - [ ] Navigation vers la documentation depuis le footer

2. **Navigation contextuelle**
   - [ ] Vérifier que ProjectNav apparaît dans les pages projet
   - [ ] Tester tous les onglets (Aperçu, Templates, etc.)
   - [ ] Vérifier l'indicateur de page active

3. **Workflows**
   - [ ] GenerationWorkflow fonctionne correctement
   - [ ] Import de données CSV/Excel
   - [ ] Génération de documents
   - [ ] Monitoring du job

4. **Authentification**
   - [ ] Redirection vers /login si non connecté
   - [ ] Déconnexion depuis le header
   - [ ] Persistence de la session

5. **Responsive**
   - [ ] Menu mobile fonctionnel
   - [ ] Navigation mobile accessible
   - [ ] Footer lisible sur mobile

## Améliorations futures possibles

- [ ] Ajouter un menu dropdown pour les configurations avancées
- [ ] Implémenter des notifications/toasts dans le header
- [ ] Ajouter un fil d'Ariane global (breadcrumb)
- [ ] Créer une page de profil utilisateur
- [ ] Ajouter des raccourcis clavier pour la navigation
- [ ] Implémenter un mode sombre (dark mode)
- [ ] Ajouter une barre de recherche globale dans le header

## Notes techniques

### Détection de contexte

Le composant `ContextualNav` utilise `usePathname()` et une regex pour détecter si on est dans un projet :
```typescript
const projectMatch = pathname?.match(/^\/projects\/([^/]+)/)
```

### Chargement des données projet

L'API est appelée côté client pour récupérer le nom du projet :
```typescript
fetch(`/api/projects/${projectId}`)
```

### Performance

- Les composants utilisent des hooks appropriés (`useCallback`, `useMemo` où nécessaire)
- Le chargement des données projet est mis en cache par React
- Pas de re-render inutile grâce à la structure optimisée

## Support

Pour toute question ou problème lié au layout :
1. Vérifier que les routes sont dans le bon groupe `(main)` ou à la racine
2. Confirmer que l'authentification fonctionne
3. Vérifier les props passées au MainLayout
4. Consulter les logs de la console pour les erreurs d'API

---

**Date de création** : 7 novembre 2025  
**Version** : 1.0  
**Auteur** : Assistant IA

