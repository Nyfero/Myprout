---
project_name: 'myprout'
user_name: 'Gaetan'
date: '2026-06-08'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'quality_rules', 'workflow_rules', 'anti_patterns']
status: 'complete'
rule_count: 67
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

### Frontend
- Vue 3.5.13 + Vite 6.2.1 (ESM modules, `"type": "module"`)
- Pinia 3.0.2 (state management)
- Vue Router 4.5.0
- Axios 1.12.2 (HTTP client)
- FontAwesome Vue 3.0.8
- Path alias: `@` → `./src/`
- Dev proxy: `/api` → `http://localhost:3000`

### Backend
- Express 5.1.0 (Node.js, ESM, TypeScript)
- TypeScript 5.9.3 via tsx (runtime) + ts-node (seed only)
- Prisma ORM 5.22.0 (MySQL, driverAdapters preview feature)
- jsonwebtoken 9.0.2 (JWT RS256 asymmetric)
- bcrypt 6.0.0 (password hashing, cost factor 12)
- Nodemailer 8.0.4 + Resend 6.9.4 (email)
- cookie-parser 1.4.7

### Database
- MySQL via Prisma ORM
- `DATABASE_URL` env variable required
- JWT keys: `JWT_PRIVATE_KEY_PATH` and `JWT_PUBLIC_KEY_PATH` env vars (file paths)

## Critical Implementation Rules

### Language-Specific Rules

#### TypeScript / JavaScript Mix
- Backend: TypeScript strict, run via `tsx` (not `ts-node` for dev, not compiled to JS)
- Frontend: Mix — mostly `.js` files, except `router/index.ts`. Do not force `.ts` on frontend files that are already `.js`
- Backend uses ESM (`"type": "module"`) — use `import/export`, never `require()`
- Frontend also ESM — same rule

#### Import conventions
- Frontend: always use `@/` alias for src-relative imports (e.g. `@/stores/authStore`)
- Backend: relative imports with extension omitted (TypeScript resolves them)
- Prisma client imported from a shared singleton: `import prisma from '../prisma'` — never instantiate `new PrismaClient()` directly in a route

#### Async / Error handling
- All Prisma calls and bcrypt ops are async/await — no `.then()` chaining
- Route handlers use try/catch; always return `res.status(XXX).json({ error: '...' })` on failure
- Backend error messages are in French (user-facing API errors)
- Never expose internal error details in API responses — only generic messages

### Framework-Specific Rules

#### Vue 3 — Component structure
- Components organized by feature: `components/{feature}/ComponentName.vue`
- UI generics in `components/ui/` (BaseModal, Navbar, Toast)
- Views in `views/` — one view per route, named `{Name}View.vue`
- Composables in `composables/` (global) or `components/{feature}/composables/` (local)
- PascalCase for component filenames and Vue Router route names
- Lowercase for modal subcomponents: `changePasswordModal.vue`, `deleteAccountModal.vue`

#### Pinia
- One store per domain in `stores/` (e.g. `authStore.js`)
- Use Options API style (`defineStore` with `state/getters/actions`)
- `authStore.isLocked` = user is authenticated but `crypto_key` is null (session locked)
- `crypto_key` is a WebCrypto `CryptoKey` object in memory — never serialized to localStorage

#### Vue Router
- Route guards in `router/index.ts` via `beforeEach`
- `authInitialized` flag prevents double auth init on first load
- Protected routes use `meta: { requiresAuth: true }` and optionally `meta: { requiresAdmin: true }`
- Unauthenticated → redirect to `Login`; authenticated but locked → redirect to `Unlock`
- Catch-all `/:pathMatch(.*)*` redirects to `/login`

#### Express 5 (Backend)
- Routes mounted at `/api/{resource}/` prefix
- All routes in `src/routes/` — one file per resource
- Middleware in `src/middlewares/`
- `authMiddleware` must be passed as argument to protected routes: `router.get('/path', authMiddleware, handler)`
- `req.user` is typed via global Express namespace augmentation in `authMiddleware.ts`
- Port hardcoded to `3000` — do not change without updating Vite proxy and CORS allowlist

### Testing Rules

- No test framework is currently configured in this project
- No test files exist — do not add test infrastructure unless explicitly requested
- When tests are added in future, prefer Vitest (compatible with Vite ecosystem) for frontend
  and Vitest or Jest for backend (ESM-compatible config required)
- Crypto functions (both frontend WebCrypto and backend Node crypto) require
  integration-level tests — WebCrypto is not available in Node test environments without polyfill
- Auth flows require a real database or a Prisma mock — do not assume SQLite can replace MySQL
  (Prisma driverAdapters preview feature may behave differently)

### Code Quality & Style Rules

#### Linting / Formatting
- No ESLint or Prettier config found — no enforced formatter, follow existing style per file
- Backend: TypeScript with no `strict` flag found in tsconfig — match existing looseness (some `any`-adjacent patterns in crypto utils)
- Frontend JS files use no type annotations — keep them plain JS, do not add JSDoc unless existing pattern does

#### Naming conventions
- Vue components: PascalCase filenames (`PasswordsCard.vue`, `BaseModal.vue`)
- Modal subcomponents: camelCase filenames (`changePasswordModal.vue`)
- Composables: `use` prefix, camelCase (`usePasswords.js`, `useProfile.js`, `useInactivity.js`)
- Backend route files: camelCase (`auth.ts`, `passwords.ts`, `admin.ts`)
- Prisma models: lowercase plural (`users`, `passwords`, `tokens`, `roles`, `userRoles`)
- DB columns: snake_case (`user_id`, `password_hash`, `is_active`, `kek_salt`)
- JS/TS variables: camelCase throughout

#### Code organization
- No barrel files (`index.ts`) — import directly from the source file
- Commented-out code blocks are acceptable (existing pattern in `api.js`, schema)
- Route sections separated by ASCII banner comments: `// ─── SECTION ──────`

### Development Workflow Rules

#### Running the project
- `npm run dev` at root starts both frontend (port 5173) and backend (port 3000) via `concurrently`
- Backend dev: `nodemon src/index.js` (note: runs the JS entry, tsx handles TS internally)
- Frontend dev: `vite` (auto-reloads)
- Prisma migrations: `npm run prisma:migrate` from backend directory
- Prisma studio: `npm run prisma:studio` from backend directory

#### Environment variables (backend)
- `DATABASE_URL` — MySQL connection string
- `JWT_PRIVATE_KEY_PATH` — absolute path to RS256 private key file
- `JWT_PUBLIC_KEY_PATH` — absolute path to RS256 public key file
- `NODE_ENV` — controls `secure` flag on cookies (`production` = secure only)

#### Git
- Branch naming: descriptive snake_case (e.g. `rework_mail_registration`)
- Commit messages: lowercase, imperative, English or French mixed (e.g. `fixed jwt done`, `add CLAUDE.md`)
- No CI/CD pipeline configured

#### CORS allowlist
- `http://localhost:5173` (Vite dev)
- `http://localhost:3000` (backend direct)
- `https://myprout.fr` (production)
- Adding a new origin requires editing `allowedOrigins` array in `backend/src/index.ts`

### Critical Don't-Miss Rules

#### Cryptography — règles absolues
- JWT uses **RS256** (asymmetric), NOT HS256 — keys are PEM files loaded from disk at runtime
- PBKDF2 parameters must match exactly between frontend and backend:
  - iterations: `310000`, keyLen: `32`, digest: `sha256`
  - Same `kek_salt` (stored in DB as hex string) used on both sides
- Encrypted data format is always `iv:tag:encrypted` (hex, colon-separated) — never change this format
- Frontend uses **WebCrypto API** (async, browser-native) — backend uses **Node.js `crypto`** module (sync/callback)
- `crypto_key` in authStore is a WebCrypto `CryptoKey` object, NOT a raw hex string — use `importCryptoKey()` to convert hex → CryptoKey
- Passwords encrypted with user's `crypto_key` (AES-256-GCM); the crypto_key itself is encrypted with KEK (derived from user password)
- Recovery flow uses a separate KEK derived from concatenated security question answers (lowercased, stripped of spaces)

#### Tokens — stored in DB, always hashed
- ALL tokens (access, refresh, email_verification, password_reset, activate) are stored as SHA-256 hashes in the `tokens` table
- Access tokens are JWT **and** stored in DB — the auth middleware verifies both signature AND DB presence
- Refresh token rotation: on each `/auth/refresh` call, the old refresh token hash is updated in-place (not deleted + recreated)
- On login, ALL existing access/refresh/password_reset tokens for the user are deleted before new ones are created
- On logout, ALL tokens for the user are deleted (not just the refresh token)

#### Registration flow (multi-step, admin-gated)
1. User registers → `is_email_verified: false`, `is_active: false`, email_verification token created
2. User clicks email link → `is_email_verified: true`, token deleted, admin notified
3. Admin activates → `activate` token (JWT, expiring) sent to user
4. User sets password via activate token → `is_active: true`, password_hash + crypto_key + KEK + recovery stored
- Do NOT conflate `is_email_verified` and `is_active` — they are separate gates

#### Prisma
- Always use `prisma.$transaction()` for multi-table writes — never two separate awaits for related mutations
- Model name is lowercase: `prisma.users`, `prisma.tokens`, `prisma.passwords` (NOT `prisma.User`)
- `users.recovery_questions` is a `Json?` field — when reading, always handle both string and object: `typeof val === 'string' ? JSON.parse(val) : val`

#### API / Axios
- `api.js` has a token refresh queue — never manually call `/auth/refresh` from a component; the interceptor handles it
- `withCredentials: true` is set globally — required for the httpOnly refresh token cookie
- The base URL in `api.js` is hardcoded to `http://localhost:3000/api` — production URL is commented out; update both when deploying

#### Security anti-patterns to avoid
- Never return the same error for "user not found" vs "wrong password" on non-security-sensitive endpoints
  (exception: `/auth/password/forgot` intentionally returns 200 even if user doesn't exist — keep it)
- Never store `crypto_key` in localStorage or any persistent storage — memory only
- Never log passwords, tokens, or crypto keys
- `bcrypt` cost factor is `12` — do not lower it

---

## Usage Guidelines

**For AI Agents:**
- Read this file before implementing any code in this project
- Follow ALL rules exactly as documented — especially crypto and token rules
- When in doubt, prefer the more restrictive/secure option
- Update this file if new patterns emerge during implementation

**For Humans:**
- Keep this file lean and focused on agent needs
- Update when technology stack changes (versions, new deps)
- Remove rules that become obvious over time

Last Updated: 2026-06-08
