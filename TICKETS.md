# Tickets de Développement — Application de Gestion d'Attestations

## Légende des Statuts

- 🔴 **À faire** : Ticket non commencé
- 🟡 **En cours** : Ticket en développement
- 🟢 **En revue** : Code prêt pour review
- ✅ **Terminé** : Ticket complété et validé
- ⏸️ **Bloqué** : Ticket en attente de dépendances

## Priorité Must-Have (Avant Mise en Production)

### TICKET-001 : Rate Limiting sur Routes Sensibles

**Statut** : 🔴 À faire  
**Priorité** : 🔴 Critique  
**Estimation** : 2-3 jours  
**Assigné** : -  

#### Description
Implémenter un système de rate limiting pour protéger les routes API sensibles contre les abus et les attaques par déni de service (DoS).

#### Routes concernées
- `POST /api/projects/[id]/generate` — Génération de documents
- `POST /api/projects/[id]/templates` — Upload de templates
- `POST /api/documents/[id]/send` — Envoi d'emails
- `POST /api/projects/[id]/templates/[id]/fields` — Sauvegarde des champs

#### Critères d'acceptation
- [ ] Rate limiting configuré avec `@upstash/ratelimit` ou `express-rate-limit`
- [ ] Limites différenciées par route :
  - `/generate` : 10 requêtes/minute par utilisateur
  - `/templates` (upload) : 5 requêtes/minute par utilisateur
  - `/send` : 20 requêtes/minute par utilisateur
- [ ] Headers HTTP `X-RateLimit-*` retournés dans les réponses
- [ ] Gestion des erreurs 429 (Too Many Requests) avec message clair
- [ ] Configuration via variables d'environnement
- [ ] Tests unitaires pour vérifier le rate limiting

#### Notes techniques
- Utiliser Redis (déjà disponible pour BullMQ) pour le stockage des compteurs
- Considérer `@upstash/ratelimit` pour compatibilité serverless (Vercel)
- Alternative : `express-rate-limit` avec store Redis

#### Fichiers à modifier/créer
- `src/lib/rate-limit.ts` — Configuration du rate limiter
- `src/middleware.ts` — Middleware Next.js pour appliquer le rate limiting
- `src/app/api/**/route.ts` — Ajout du middleware sur les routes concernées
- `tests/rate-limit.test.ts` — Tests unitaires

---

### TICKET-002 : RBAC Complet — Restrictions Viewer et Droits Editor

**Statut** : 🔴 À faire  
**Priorité** : 🔴 Critique  
**Estimation** : 3-4 jours  
**Assigné** : -  

#### Description
Finaliser le système de contrôle d'accès basé sur les rôles (RBAC) pour interdire toute modification/génération aux utilisateurs avec le rôle `viewer`, et définir clairement les droits du rôle `editor`.

#### Rôles et permissions

**Owner** (propriétaire du projet)
- ✅ Tous les droits (création, modification, suppression, génération, envoi)

**Editor** (éditeur)
- ✅ Peut modifier les templates et les champs
- ✅ Peut importer des données et mapper les colonnes
- ❌ Ne peut pas créer/supprimer des projets
- ❌ Ne peut pas générer des documents (ou optionnel avec validation owner)
- ❌ Ne peut pas envoyer d'emails

**Viewer** (lecteur)
- ✅ Peut consulter les projets, templates, documents
- ✅ Peut télécharger les documents générés
- ❌ Ne peut pas modifier quoi que ce soit
- ❌ Ne peut pas générer de documents
- ❌ Ne peut pas envoyer d'emails
- ❌ Ne peut pas uploader de templates

#### Critères d'acceptation
- [ ] Middleware/helper `checkPermission()` pour vérifier les permissions
- [ ] Restrictions `viewer` appliquées sur toutes les routes de modification :
  - `POST /api/projects/[id]/templates`
  - `PUT /api/templates/[id]/fields`
  - `POST /api/projects/[id]/generate`
  - `POST /api/documents/[id]/send`
  - `DELETE /api/projects/[id]`
- [ ] Restrictions `editor` appliquées sur création/suppression de projets
- [ ] UI frontend masque les boutons/actions selon les permissions
- [ ] Messages d'erreur clairs (403 Forbidden) avec explication
- [ ] Tests unitaires pour chaque niveau de permission

#### Notes techniques
- Utiliser le middleware Next.js existant
- Créer un helper `src/lib/permissions.ts` avec fonctions `canEdit()`, `canGenerate()`, etc.
- Vérifier le `ownerId` du projet dans la base de données
- Considérer un système de "collaborateurs" avec rôles par projet (futur)

#### Fichiers à modifier/créer
- `src/lib/permissions.ts` — Helpers de vérification des permissions
- `src/middleware.ts` — Vérification des permissions dans le middleware
- `src/app/api/**/route.ts` — Ajout des vérifications sur chaque route
- `src/components/**/*.tsx` — Masquage conditionnel des actions UI
- `tests/permissions.test.ts` — Tests unitaires

---

### TICKET-003 : Sanitization des Inputs

**Statut** : 🔴 À faire  
**Priorité** : 🔴 Critique  
**Estimation** : 1-2 jours  
**Assigné** : -  

#### Description
Ajouter une sanitization des inputs utilisateur pour compléter la validation Zod et protéger contre les injections XSS et autres attaques.

#### Zones concernées
- Champs texte dans les templates (noms de champs, valeurs)
- Contenu des emails (sujet, corps HTML)
- Noms de projets, descriptions
- Données CSV/Excel importées

#### Critères d'acceptation
- [ ] Sanitization HTML pour les champs texte (utiliser `dompurify` ou `sanitize-html`)
- [ ] Échappement des caractères spéciaux dans les noms de fichiers
- [ ] Validation stricte des URLs (pour les liens dans les emails)
- [ ] Sanitization des données CSV avant traitement
- [ ] Tests unitaires pour vérifier la sanitization

#### Notes techniques
- Utiliser `dompurify` pour le HTML côté serveur
- Utiliser `sanitize-html` comme alternative
- Complémentaire à Zod (validation de structure + sanitization de contenu)

#### Fichiers à modifier/créer
- `src/lib/sanitize.ts` — Fonctions de sanitization
- `src/app/api/**/route.ts` — Application de la sanitization sur les inputs
- `tests/sanitize.test.ts` — Tests unitaires

---

### TICKET-004 : Cache Redis des Templates et Métadonnées

**Statut** : 🔴 À faire  
**Priorité** : 🟡 Haute  
**Estimation** : 2-3 jours  
**Assigné** : -  

#### Description
Implémenter un système de cache Redis pour les templates et leurs métadonnées afin d'améliorer les performances et réduire la charge sur la base de données et le stockage.

#### Données à mettre en cache
- Métadonnées des templates (champs `fields`, `mimeType`, `filePath`)
- Contenu des templates (optionnel, selon taille)
- Liste des projets d'un utilisateur
- Statistiques du dashboard

#### Critères d'acceptation
- [ ] Service de cache `src/lib/cache.ts` avec fonctions `get()`, `set()`, `del()`
- [ ] Cache des métadonnées template avec TTL de 1 heure
- [ ] Invalidation du cache lors de modifications (update template, ajout de champs)
- [ ] Cache des listes de projets avec TTL de 5 minutes
- [ ] Gestion des erreurs Redis (fallback sur DB si Redis indisponible)
- [ ] Tests unitaires pour le cache

#### Notes techniques
- Utiliser `ioredis` ou `@upstash/redis` (compatible serverless)
- Clés de cache : `template:{id}:metadata`, `project:{id}:list`, etc.
- Pattern d'invalidation : supprimer les clés concernées lors des updates

#### Fichiers à modifier/créer
- `src/lib/cache.ts` — Service de cache Redis
- `src/app/api/templates/[id]/route.ts` — Utilisation du cache
- `src/app/api/projects/route.ts` — Cache des listes
- `tests/cache.test.ts` — Tests unitaires

---

### TICKET-005 : Tests Unitaires et d'Intégration

**Statut** : 🔴 À faire  
**Priorité** : 🟡 Haute  
**Estimation** : 5-7 jours  
**Assigné** : -  

#### Description
Écrire une suite complète de tests unitaires et d'intégration pour garantir la qualité et la stabilité de l'application.

#### Tests unitaires à créer

**Services PDF**
- [ ] Génération PDF depuis template PDF
- [ ] Génération PDF depuis template image
- [ ] Génération PDF depuis template DOCX
- [ ] Placement de texte avec différents alignements
- [ ] Génération et placement de QR codes
- [ ] Formattage des dates et textes

**Services QR Code**
- [ ] Génération QR code avec différentes tailles
- [ ] Génération QR code avec données structurées
- [ ] Validation des données QR code

**Adaptateurs Stockage**
- [ ] Upload fichier S3
- [ ] Upload fichier Local
- [ ] Upload fichier FTP
- [ ] Génération signed URLs
- [ ] Récupération de fichiers

**Services Email**
- [ ] Envoi email SMTP
- [ ] Envoi email Resend
- [ ] Remplissage de templates email avec variables
- [ ] Gestion des erreurs d'envoi

**Utilitaires**
- [ ] Parsing CSV avec papaparse
- [ ] Parsing Excel avec xlsx
- [ ] Formattage de dates
- [ ] Validation de données

#### Tests d'intégration à créer

**Flux API**
- [ ] `POST /api/projects` — Création de projet
- [ ] `POST /api/projects/[id]/templates` — Upload template
- [ ] `PUT /api/templates/[id]/fields` — Sauvegarde champs
- [ ] `POST /api/projects/[id]/generate` — Génération batch
- [ ] `POST /api/documents/[id]/send` — Envoi email
- [ ] `GET /api/jobs/[id]` — Statut job

**Flux complet**
- [ ] Import CSV → Mapping → Génération → Envoi email
- [ ] Upload template → Édition zones → Génération → Téléchargement
- [ ] Génération batch avec BullMQ → Suivi progression

#### Critères d'acceptation
- [ ] Configuration Vitest avec coverage
- [ ] Coverage minimum de 70% pour les services critiques
- [ ] Tests d'intégration avec base de données de test
- [ ] Tests d'intégration avec Redis mocké
- [ ] CI/CD configuré pour exécuter les tests automatiquement

#### Notes techniques
- Utiliser Vitest pour les tests unitaires
- Utiliser Playwright ou Supertest pour les tests d'intégration API
- Mock des services externes (S3, SMTP, Redis)
- Base de données de test avec migrations Prisma

#### Fichiers à modifier/créer
- `vitest.config.ts` — Configuration Vitest
- `tests/unit/**/*.test.ts` — Tests unitaires
- `tests/integration/**/*.test.ts` — Tests d'intégration
- `.github/workflows/test.yml` — CI/CD pour tests

---

### TICKET-006 : Monitoring (Sentry) et Logs Structurés

**Statut** : 🔴 À faire  
**Priorité** : 🟡 Haute  
**Estimation** : 2-3 jours  
**Assigné** : -  

#### Description
Mettre en place un système de monitoring des erreurs avec Sentry et des logs structurés pour faciliter le débogage et le suivi en production.

#### Monitoring Sentry
- [ ] Configuration Sentry pour Next.js
- [ ] Capture des erreurs serveur (API routes)
- [ ] Capture des erreurs client (React Error Boundary)
- [ ] Capture des erreurs BullMQ workers
- [ ] Tags contextuels (userId, projectId, templateId)
- [ ] Filtrage des erreurs non critiques (404, etc.)

#### Logs structurés
- [ ] Configuration Pino ou Winston
- [ ] Format JSON pour les logs
- [ ] Niveaux de log (error, warn, info, debug)
- [ ] Logs des opérations critiques :
  - Génération de documents
  - Envoi d'emails
  - Upload de templates
  - Erreurs de jobs BullMQ
- [ ] Intégration avec services de logs (Datadog, Logtail, etc.)

#### Critères d'acceptation
- [ ] Sentry configuré et fonctionnel en production
- [ ] Logs structurés avec contexte (userId, requestId, etc.)
- [ ] Dashboard Sentry avec alertes configurées
- [ ] Documentation pour l'équipe sur l'utilisation des logs

#### Notes techniques
- Utiliser `@sentry/nextjs` pour l'intégration Next.js
- Utiliser Pino pour les logs (plus performant que Winston)
- Considérer `pino-pretty` pour le développement local
- Variables d'environnement : `SENTRY_DSN`, `LOG_LEVEL`

#### Fichiers à modifier/créer
- `sentry.client.config.ts` — Configuration Sentry client
- `sentry.server.config.ts` — Configuration Sentry serveur
- `src/lib/logger.ts` — Service de logging structuré
- `src/app/api/**/route.ts` — Ajout des logs sur les routes
- `src/workers/**/*.ts` — Logs dans les workers

---

## Priorité Should-Have

### TICKET-007 : Export/Import JSON de Configuration Éditeur

**Statut** : 🔴 À faire  
**Priorité** : 🟢 Moyenne  
**Estimation** : 1-2 jours  
**Assigné** : -  

#### Description
Permettre l'export et l'import de la configuration JSON des zones de l'éditeur pour faciliter le partage et la sauvegarde de configurations de templates.

#### Critères d'acceptation
- [ ] Bouton "Exporter" dans l'éditeur qui télécharge un fichier JSON
- [ ] Bouton "Importer" qui permet de charger un fichier JSON
- [ ] Validation du format JSON importé
- [ ] Aperçu des zones avant import
- [ ] Gestion des erreurs (format invalide, clés manquantes)

---

### TICKET-008 : Lazy Loading des Listes Volumineuses

**Statut** : 🔴 À faire  
**Priorité** : 🟢 Moyenne  
**Estimation** : 1-2 jours  
**Assigné** : -  

#### Description
Implémenter le lazy loading (chargement paresseux) pour les listes de documents et projets afin d'améliorer les performances avec de grandes quantités de données.

#### Critères d'acceptation
- [ ] Pagination infinie (infinite scroll) ou pagination classique
- [ ] Chargement progressif des documents
- [ ] Indicateur de chargement
- [ ] Performance acceptable avec 1000+ documents

---

### TICKET-009 : Documentation API (Swagger/OpenAPI)

**Statut** : 🔴 À faire  
**Priorité** : 🟢 Moyenne  
**Estimation** : 2-3 jours  
**Assigné** : -  

#### Description
Créer une documentation API interactive avec Swagger/OpenAPI pour faciliter l'intégration et la compréhension des endpoints.

#### Critères d'acceptation
- [ ] Configuration Swagger/OpenAPI
- [ ] Documentation de tous les endpoints API
- [ ] Exemples de requêtes/réponses
- [ ] Interface web accessible sur `/api-docs`

---

### TICKET-010 : Compression des PDFs Générés

**Statut** : 🔴 À faire  
**Priorité** : 🟢 Moyenne  
**Estimation** : 1 jour  
**Assigné** : -  

#### Description
Ajouter une compression des PDFs générés pour réduire la taille des fichiers et améliorer les temps de téléchargement.

#### Critères d'acceptation
- [ ] Compression optionnelle (paramètre dans la génération)
- [ ] Réduction de taille significative sans perte de qualité visible
- [ ] Configuration du niveau de compression

---

### TICKET-011 : Optimisation d'Images avant Upload

**Statut** : 🔴 À faire  
**Priorité** : 🟢 Moyenne  
**Estimation** : 1-2 jours  
**Assigné** : -  

#### Description
Optimiser automatiquement les images uploadées (redimensionnement, compression) pour réduire l'espace de stockage et améliorer les performances.

#### Critères d'acceptation
- [ ] Redimensionnement automatique si image > 2000px
- [ ] Compression JPEG/PNG avec qualité optimale
- [ ] Conservation des métadonnées essentielles
- [ ] Configuration des seuils de taille

---

## Priorité Nice-to-Have / Optionnels

### TICKET-012 : Adapters Email Supplémentaires

**Statut** : 🔴 À faire  
**Priorité** : 🔵 Basse  
**Estimation** : 2-3 jours par adapter  
**Assigné** : -  

#### Description
Ajouter des adapters pour d'autres providers email transactionnels (SendGrid, AWS SES, Mailgun).

#### Adapters à implémenter
- [ ] SendGrid API
- [ ] AWS SES
- [ ] Mailgun

---

### TICKET-013 : Audit Log

**Statut** : 🔴 À faire  
**Priorité** : 🔵 Basse  
**Estimation** : 3-4 jours  
**Assigné** : -  

#### Description
Implémenter un système d'audit log pour tracer toutes les actions importantes (qui a fait quoi, quand).

#### Critères d'acceptation
- [ ] Table `AuditLog` dans Prisma
- [ ] Logging des actions : création/modification/suppression projets, génération, envoi emails
- [ ] Interface de consultation des logs
- [ ] Filtres par utilisateur, date, action

---

### TICKET-014 : Améliorations Avancées DOCX/QR

**Statut** : 🔴 À faire  
**Priorité** : 🔵 Basse  
**Estimation** : 3-4 jours  
**Assigné** : -  

#### Description
Améliorer le positionnement des QR codes dans les templates DOCX avec options avancées d'alignement, wrapping et z-order.

#### Fonctionnalités
- [ ] Options d'ancrage (left/center/right)
- [ ] Offsets X/Y configurables
- [ ] Gestion du wrapping (wrapNone, wrapSquare, wrapTopAndBottom)
- [ ] Z-order configurable
- [ ] Fallback pour versions Word anciennes

---

### TICKET-015 : Configuration Vercel/Production Finalisée

**Statut** : 🔴 À faire  
**Priorité** : 🔵 Basse  
**Estimation** : 1-2 jours  
**Assigné** : -  

#### Description
Finaliser la configuration de déploiement sur Vercel avec toutes les variables d'environnement et optimisations nécessaires.

#### Critères d'acceptation
- [ ] Configuration Vercel complète
- [ ] Variables d'environnement documentées
- [ ] Optimisations de build
- [ ] Documentation de déploiement

---

## Suivi des Tickets

### Statistiques Globales

- **Total tickets** : 15
- **Must-have** : 6 tickets
- **Should-have** : 5 tickets
- **Nice-to-have** : 4 tickets

### Estimation Totale

- **Must-have** : ~15-22 jours
- **Should-have** : ~6-10 jours
- **Nice-to-have** : ~9-13 jours
- **Total** : ~30-45 jours (6-9 semaines)

---

## Notes

- Les estimations sont données à titre indicatif et peuvent varier selon la complexité réelle.
- Les tickets peuvent être réorganisés selon les priorités business.
- Les tickets "Nice-to-have" peuvent être reportés après la mise en production.

