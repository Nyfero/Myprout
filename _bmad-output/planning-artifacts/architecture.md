---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
status: 'complete'
completedAt: '2026-06-08'
lastStep: 8
inputDocuments: ['prd-myprout-2026-06-08/prd.md', 'project-context.md', 'brainstorming-session-2026-06-08-1400.md']
workflowType: 'architecture'
project_name: 'myprout'
user_name: 'Gaetan'
date: '2026-06-08'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
31 FRs across 9 feature areas. Phase 0+1 (MVP) covers 18 FRs focused on authentication hardening, password vault, and admin panel. Phases 2-5 add browser extension, multi-platform apps, family features, and sovereign mail. The single most architecturally significant constraint: all password data must be encrypted client-side before transmission — the server stores ciphertext only.

**Non-Functional Requirements:**
- NFR-SEC-1 to NFR-SEC-8: Security is the primary quality attribute. JWT RS256, DB-backed token revocability, PBKDF2 310k iterations, AES-256-GCM, httpOnly cookies.
- NFR-REL-1 to NFR-REL-3: Stability for ~50 users, weekly backup via cron/mysqldump, Docker-enabled re-deployment in <30 minutes.
- NFR-PERF-1: <200ms API response time for vault operations on local network.
- NFR-UX-1: Self-service onboarding — non-technical family members must not need help.

**Scale & Complexity:**
- Primary domain: Full-stack web (brownfield), evolving to multi-platform
- Complexity level: Medium (Phase 0+1), High (full roadmap)
- Users: max ~50, low concurrency, household network

### Technical Constraints & Dependencies

- Existing stack: Express 5 + TypeScript (backend), Vue 3 + Vite (frontend), MySQL + Prisma
- All crypto parameters must match exactly between WebCrypto API (frontend) and Node.js crypto (backend): PBKDF2 310k / SHA-256 / 32-byte key
- JWT uses RS256 (asymmetric) — key files loaded from disk at runtime
- Port 3000 backend, port 5173 frontend dev — nginx reverse proxy needed for prod
- Docker packaging required for deployment and disaster recovery
- No existing test suite — must be established before adding features

### Cross-Cutting Concerns Identified

1. **E2E Encryption** — Every data write/read operation involves client-side crypto. All future clients (extension, Windows, mobile) must implement the same crypto layer.
2. **Token Revocability** — DB lookup on every authenticated request. Must be considered when designing caching, rate limiting, and any high-frequency operations.
3. **Self-Hosted Deployment** — nginx, TLS, Docker, process manager, cron backup. These are not afterthoughts; they are first-class architectural components.
4. **Offline-First (Phase 3+)** — Local encrypted storage + sync is a future architectural rupture. API design now should avoid patterns that make sync harder.
5. **Admin-Gated Multi-User** — Registration flow is intentionally controlled. Permission model must support future family sharing without redesigning auth.

## Starter Template Evaluation

### Primary Technology Domain
Full-stack web application (brownfield) — stack already established and running.

### Starter Options Considered
N/A — Brownfield project. No new initialization required. The existing codebase serves as the starting foundation.

### Existing Stack as Foundation

**Rationale:** Myprout has an operational codebase. The architecture builds on what exists, not on a fresh scaffold. All decisions below extend this foundation without replacing it.

**Language & Runtime:**
- Backend: TypeScript 5.9.3 via tsx (ESM, no compile step in dev)
- Frontend: JavaScript (ES modules) + TypeScript for router only
- Runtime: Node.js (LTS)

**Build Tooling:**
- Frontend: Vite 6.2.1 with @vitejs/plugin-vue
- Backend: tsx for dev (nodemon watch), no build step for production
- Root: concurrently to run both in parallel

**Database & ORM:**
- MySQL via Prisma 5.22.0 (driverAdapters preview feature enabled)
- Schema: snake_case columns, lowercase model names

**Code Organization:**
- Backend: `src/routes/`, `src/middlewares/`, `src/services/`, `src/utils/`
- Frontend: `src/views/`, `src/components/{feature}/`, `src/stores/`, `src/composables/`

**Development Experience:**
- Hot reload: nodemon (backend) + Vite HMR (frontend)
- Path alias: `@` → `frontend/src/`
- Dev proxy: `/api` → `http://localhost:3000`

**Note:** No test framework is configured. Establishing a test suite (Vitest recommended) is the first infrastructure story before any new features.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- SEC-1: Rate limiting sur endpoints auth
- SEC-2: nginx + TLS en prod
- INFRA-2: docker-compose 3 services
- INFRA-4: Vitest comme framework de test

**Important Decisions (Shape Architecture):**
- DA-1: Hard delete (suppression de is_deleted/deleted_time)
- API-2: Format d'erreur standardisé avec codes
- INFRA-3: Winston pour le logging

**Deferred Decisions (Post-MVP):**
- Offline sync strategy (Phase 3+ — apps Windows/mobile)
- API versioning si breaking changes nécessaires (Phase 3+)
- Mobile app technology — React Native vs Flutter (Phase 3)
- Browser extension manifest v2 vs v3 (Phase 2)

### Data Architecture

**DA-1: Hard Delete**
- Décision: Suppression directe (hard delete) pour les Password Entries
- Action: Retirer `is_deleted` et `deleted_time` du modèle Prisma `passwords`
- Rationale: Simplicité — pas de logique de cleanup, pas de vue filtrée à maintenir
- Impact: Migration Prisma requise, stories de suppression utilisent `prisma.passwords.delete()`

### Authentication & Security

**SEC-1: Rate Limiting**
- Décision: `express-rate-limit` sur tous les endpoints sensibles
- Seuils: 10 tentatives login / 15min / IP — 5 inscriptions / heure / IP — 100 req/min endpoints vault
- Rationale: Protection brute force sans bloquer l'usage normal (~50 users, faible concurrence)
- Implémentation: Middleware dédié dans `src/middlewares/rateLimiter.ts`

**SEC-2: Reverse Proxy TLS**
- Décision: nginx devant Express + Let's Encrypt via certbot avec auto-renouvellement
- Architecture: nginx termine TLS → forward vers Express port 3000
- nginx sert aussi le frontend Vue buildé (fichiers statiques)
- Rationale: Standard industrie, certbot gratuit et automatique

### API & Communication Patterns

**API-1: No Versioning**
- Décision: Préfixe `/api/` sans version — ex. `/api/auth/login`
- Rationale: Éviter la dette de maintenance du versioning pour un projet personnel à ~50 users
- Stratégie: Évolutions non-breaking en priorité; breaking changes gérés par migration coordonnée

**API-2: Standardized Error Format**
- Décision: `{ error: 'message', code: 'DOMAIN_NNN' }`
- Domaines de codes: `AUTH_`, `VAULT_`, `ADMIN_`, `CRYPTO_`, `SERVER_`
- Exemples: `AUTH_001` (credentials invalides), `AUTH_002` (token expiré), `VAULT_001` (entrée non trouvée)
- Rationale: Facilite le debugging côté client et la gestion d'erreurs dans les futures apps
- Action: Refactoring progressif des routes existantes + nouveau standard pour toutes nouvelles routes

### Frontend Architecture

**FE-1: CSS Vanilla**
- Décision: CSS vanilla uniquement — pas de framework CSS
- Rationale: Stack déjà maîtrisée, cohérence avec le code existant
- Organisation: Fichiers CSS thématiques (`main.css`, `modal.css`, futurs: `vault.css`, `auth.css`)

### Infrastructure & Deployment

**INFRA-1: Process Management**
- Décision: Docker `restart: always` — pas de PM2
- Rationale: Docker gère le cycle de vie; PM2 est redondant dans un contexte containerisé

**INFRA-2: Docker Compose**
- Décision: docker-compose avec 3 services
  - `backend`: Express + TypeScript (port 3000, interne)
  - `db`: MySQL (port 3306, interne)
  - `nginx`: Reverse proxy + TLS + frontend statique (ports 80/443, public)
- Volumes: DB data persisté, nginx certs persistés, .env monté
- Rationale: Isolation des services, déploiement reproductible, disaster recovery en <30min

**INFRA-3: Logging**
- Décision: Winston — logging structuré avec niveaux (error, warn, info, debug)
- Configuration: Console transport (capturé par Docker logs) + fichier rotatif optionnel
- Rationale: Plus structuré que morgan seul, niveaux permettent filtrage en prod

**INFRA-4: Test Framework**
- Décision: Vitest
- Rationale: ESM natif, API Jest-compatible, intégration Vite naturelle
- Périmètre initial: Routes auth + utils crypto

**INFRA-5: Secrets Management**
- Décision: Fichier `.env` non-commité, monté via `env_file` dans docker-compose
- Variables requises: `DATABASE_URL`, `JWT_PRIVATE_KEY_PATH`, `JWT_PUBLIC_KEY_PATH`, `NODE_ENV`
- `.env.example` commité comme référence sans valeurs sensibles

### Decision Impact Analysis

**Implementation Sequence:**
1. Supprimer is_deleted/deleted_time (migration Prisma) — DA-1
2. Configurer Vitest + premiers tests auth/crypto — INFRA-4
3. Implémenter rate limiting — SEC-1
4. Standardiser format d'erreur — API-2
5. Créer docker-compose + Dockerfile — INFRA-2
6. Configurer nginx + TLS — SEC-2
7. Intégrer Winston — INFRA-3

**Cross-Component Dependencies:**
- SEC-2 (nginx) dépend de INFRA-2 (docker-compose) — faire en même temps
- API-2 (error codes) doit être établi avant d'écrire de nouvelles routes
- INFRA-4 (Vitest) doit être en place avant toute nouvelle feature

## Implementation Patterns & Consistency Rules

> Note: Naming conventions, file organization, and crypto/token patterns are documented in `project-context.md` (67 rules). This section covers patterns introduced by architecture decisions in step 4.

### API Response Patterns

**Success responses** — direct object, no wrapper:
- Login: `{ "token": "...", "user": { ... } }`
- Mutations: `{ "message": "Opération réussie" }`
- Collections: `[ { "password_id": 1, ... } ]`

**Error responses** — always `{ error, code }`:
- `{ "error": "Email ou mot de passe incorrect", "code": "AUTH_001" }`
- `{ "error": "Token expiré", "code": "AUTH_002" }`
- `{ "error": "Champs manquants", "code": "VAULT_001" }`

**Error code registry:**

| Domain | Range | Key codes |
|--------|-------|-----------|
| `AUTH_` | 001–099 | 001 invalid credentials, 002 expired token, 003 missing token, 004 revoked token |
| `VAULT_` | 001–099 | 001 missing fields, 002 not found, 003 decrypt failed |
| `ADMIN_` | 001–099 | 001 insufficient permissions |
| `SERVER_` | 001–099 | 001 internal error |

### Test Patterns (Vitest)

**File location:** co-located with source — `src/routes/auth.test.ts`, `src/utils/crypto.test.ts`

**Structure:**
```typescript
describe('POST /api/auth/login', () => {
  it('returns 401 for unknown email', async () => { ... })
  it('returns 401 for wrong password', async () => { ... })
  it('returns 200 with tokens for valid credentials', async () => { ... })
})
```

**Coverage priority:** auth routes first (FR-1 to FR-8), then crypto utils, then vault routes.

### Rate Limiter Pattern

Middleware dédié `src/middlewares/rateLimiter.ts` — exports nommés par cas d'usage:
```typescript
export const loginLimiter    // 10 req / 15min / IP
export const registerLimiter // 5 req / 60min / IP
export const apiLimiter      // 100 req / 60s / IP
```

Application dans les routes:
```typescript
router.post('/login', loginLimiter, async (req, res) => { ... })
```

### Winston Logging Pattern

Instance partagée `src/utils/logger.ts` — jamais `console.log` en production:
```typescript
logger.info('User logged in', { user_id, email })
logger.warn('Failed login attempt', { email, ip })
logger.error('Database error', { error: err.message, route: '/api/auth/login' })
```

Règles absolues:
- Jamais logger de mot de passe, token, ou clé crypto
- Toujours inclure le contexte (user_id ou route)
- `logger.error` pour catch blocks, `logger.warn` pour rejets métier

### Docker Compose Pattern

Services référencent les autres par nom DNS interne Docker:
- Backend → DB: `mysql://db:3306/myprout`
- nginx → Backend: `proxy_pass http://backend:3000`
- Variables via `.env` à la racine, `env_file: .env` dans docker-compose

### Prisma Transaction Pattern

Toute opération multi-table utilise `prisma.$transaction()`:
```typescript
// ✅ Correct
await prisma.$transaction(async (tx) => {
  await tx.users.update({ ... })
  await tx.tokens.delete({ ... })
})
// ❌ Interdit — deux awaits séparés pour des opérations liées
```

### Enforcement — All Agents MUST

- Utiliser `{ error, code }` pour toutes les erreurs — jamais `{ message }` seul
- Logger via Winston — jamais `console.log/error` en production
- Appliquer le rate limiter approprié sur tous les nouveaux endpoints auth
- Utiliser `prisma.$transaction()` pour toutes les écritures multi-tables
- Écrire le test Vitest avec chaque nouvelle route

## Project Structure & Boundaries

### Complete Project Directory Structure

```
myprout/
├── .env                                    # 🔒 Non-commité — secrets
├── .env.example                            # ✨ NEW — référence des variables
├── .gitignore
├── package.json
├── start.js
├── docker-compose.yml                      # ✨ NEW
├── nginx/                                  # ✨ NEW
│   ├── nginx.conf
│   └── certbot/
├── scripts/                               # ✨ NEW
│   └── backup.sh                          # Cron backup MySQL
├── backend/
│   ├── package.json
│   ├── Dockerfile                         # ✨ NEW
│   ├── vitest.config.ts                   # ✨ NEW
│   ├── prisma/
│   │   ├── schema.prisma                  # ⚠️ MODIFY — retirer is_deleted/deleted_time
│   │   └── migrations/
│   └── src/
│       ├── index.ts
│       ├── prisma.ts
│       ├── middlewares/
│       │   ├── authMiddleware.ts
│       │   ├── isAdmin.ts
│       │   └── rateLimiter.ts             # ✨ NEW
│       ├── routes/
│       │   ├── auth.ts                    # ⚠️ MODIFY — error codes + rate limiter
│       │   ├── auth.test.ts               # ✨ NEW
│       │   ├── admin.ts
│       │   └── passwords.ts              # ⚠️ MODIFY — retirer is_deleted logic
│       ├── services/
│       │   └── email/
│       │       ├── email.ts
│       │       ├── utils/
│       │       └── template/
│       └── utils/
│           ├── crypto.ts
│           ├── crypto.test.ts             # ✨ NEW
│           ├── jwt.ts
│           └── logger.ts                  # ✨ NEW — Winston instance
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.vue
        ├── main.js
        ├── router/index.ts
        ├── stores/authStore.js
        ├── services/api.js                # ⚠️ MODIFY — baseURL via env
        ├── utils/crypto.js
        ├── composables/useInactivity.js
        ├── assets/
        │   ├── main.css
        │   └── modal.css
        ├── components/
        │   ├── ui/ (BaseModal, Navbar, Toast)
        │   ├── login/ (Login, Register, Password, Recovery, VerifyEmail)
        │   ├── passwords/                 # ⚠️ MODIFY — favorites filter
        │   ├── profile/
        │   ├── admin/
        │   ├── modals/
        │   └── background/
        └── views/
            ├── LoginView.vue
            ├── PasswordsView.vue
            ├── ProfileView.vue
            ├── AdminView.vue
            └── UnlockView.vue
```

## Architecture Validation Results

### Coherence Validation ✅
All technology choices are compatible. Express 5 + tsx (ESM) + Vitest (ESM-native) + Winston + express-rate-limit have no version conflicts. Docker + nginx is a proven production pattern. No contradictory decisions identified.

### Requirements Coverage Validation ✅
- FR-1 to FR-18 (Phase 0+1 MVP): fully covered by routes, middlewares, and frontend structure
- FR-16, FR-19 to FR-31 (Phases 2-5): explicitly deferred with documented rationale
- NFR-SEC-1 to SEC-8: covered by JWT RS256, DB-backed tokens, PBKDF2, AES-256-GCM, rate limiting, nginx TLS
- NFR-REL-1 to REL-3: covered by Docker restart policy, cron backup script, Docker re-deploy
- NFR-PERF-1: achievable — low concurrency (~50 users), direct Prisma queries, local network
- NFR-UX-1: frontend component structure supports self-service onboarding

### Gap Analysis Results
**Critical Gaps:** None

**Minor Gaps (story-level, not blocking):**
- `.env.example` exact variable list → defined at implementation time
- `nginx.conf` exact configuration → defined in infrastructure story
- `Dockerfile` multi-stage build content → defined in Docker story

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed (~50 users, low concurrency, household)
- [x] Technical constraints identified (E2E crypto, JWT RS256, ESM)
- [x] Cross-cutting concerns mapped (encryption, token revocability, deployment)

**Architectural Decisions**
- [x] Critical decisions documented (DA-1, SEC-1, SEC-2, API-1, API-2, FE-1, INFRA-1 to INFRA-5)
- [x] Technology stack fully specified (with existing versions)
- [x] Integration patterns defined (nginx→Express, Axios→API, Prisma→MySQL)
- [x] Performance considerations addressed (NFR-PERF-1, token DB lookup trade-off noted)

**Implementation Patterns**
- [x] Naming conventions established (project-context.md + architecture patterns)
- [x] Structure patterns defined (feature-based folders, co-located tests)
- [x] Communication patterns specified (API response format, error codes)
- [x] Process patterns documented (Winston logging, Prisma transactions, rate limiting)

**Project Structure**
- [x] Complete directory structure defined (with ✨ NEW and ⚠️ MODIFY markers)
- [x] Component boundaries established (views orchestrate, stores are source of truth)
- [x] Integration points mapped (nginx→backend, frontend→API service)
- [x] Requirements to structure mapping complete (FR groups → files table)

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
- E2E encryption architecture is solid and fully specified
- Brownfield foundation is well-understood — no unknowns
- Docker + nginx deployment is reproducible and disaster-recovery ready
- Test patterns established before feature work begins

**Areas for Future Enhancement:**
- Offline sync architecture (Phase 3 — apps Windows/mobile)
- Browser extension architecture (Phase 2 — manifest v3 decision pending)
- Family sharing key management (Phase 4 — public key infrastructure TBD)

### Implementation Handoff

**First Implementation Priority:**
1. Configure Vitest + first tests (auth routes + crypto utils)
2. Complete rework_mail_registration branch (FR-1 spam fix)
3. Fix favorites filter (FR-14) + logout button relocation
4. Remove is_deleted/deleted_time from Prisma schema (DA-1)

### Architectural Boundaries

**API Boundaries:**
- Tous les appels API passent par `frontend/src/services/api.js` — jamais de `fetch()` direct dans les composants
- L'intercepteur Axios gère le refresh token — aucun composant n'appelle `/auth/refresh` directement
- nginx est le seul point d'entrée public (80/443) — Express jamais exposé directement

**Data Boundaries:**
- Le backend ne stocke jamais de données déchiffrées — ciphertext uniquement en DB
- Le `crypto_key` ne quitte jamais la mémoire frontend — jamais sérialisé, jamais transmis
- Les tokens sont toujours hashés (SHA-256) avant écriture en DB

### Requirements to Structure Mapping

| FR Group | Backend | Frontend |
|----------|---------|----------|
| FR-1 to FR-8 (Auth) | `routes/auth.ts` + `middlewares/authMiddleware.ts` | `components/login/` + `stores/authStore.js` |
| FR-9 to FR-15 (Vault) | `routes/passwords.ts` | `components/passwords/` + `views/PasswordsView.vue` |
| FR-17 to FR-18 (Admin) | `routes/admin.ts` + `middlewares/isAdmin.ts` | `components/admin/` + `views/AdminView.vue` |
| SEC-1 (Rate limiting) | `middlewares/rateLimiter.ts` | — |
| INFRA-3 (Logging) | `utils/logger.ts` | — |
| INFRA-4 (Tests) | `routes/auth.test.ts` + `utils/crypto.test.ts` | — |

### Data Flow

```
User Browser
    │ HTTPS (443)
    ▼
nginx (TLS termination + static frontend files)
    │ HTTP internal (3000)
    ▼
Express Backend
    ├── rateLimiter middleware
    ├── authMiddleware (JWT verify + DB token check)
    └── Routes → Prisma ORM → MySQL
              ↕ ciphertext only
         Client-side crypto (WebCrypto API)
```
