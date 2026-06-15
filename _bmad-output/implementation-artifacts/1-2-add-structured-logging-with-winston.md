# Story 1.2: Add Structured Logging with Winston

Status: ready-for-dev

## Story

As a developer,
I want all backend logs going through Winston,
so that production logs are structured, leveled, and never expose secrets.

## Acceptance Criteria

1. `backend/src/utils/logger.ts` exists and exports a default Winston logger with levels: error, warn, info, debug.
2. Logs are written to Console transport (captured by Docker via stdout).
3. The only `console.log` in `backend/src/index.ts` is replaced with `logger.info`.
4. Catch blocks in `backend/src/routes/auth.ts` call `logger.error` with route context.
5. No password, token, or crypto key value appears in any log call.
6. `npx vitest run` still passes after changes (no regression on Story 1.1 tests).

## Tasks / Subtasks

- [ ] Install Winston (AC: 1)
  - [ ] Run `npm install winston` inside `backend/`
- [ ] Create `backend/src/utils/logger.ts` (AC: 1, 2)
  - [ ] Winston logger with Console transport, JSON + timestamp format
  - [ ] Level: `'info'` in production, `'debug'` in development
- [ ] Update `backend/src/index.ts` (AC: 3)
  - [ ] Import logger from `./utils/logger`
  - [ ] Replace `console.log(...)` in `app.listen` callback with `logger.info(...)`
- [ ] Update `backend/src/routes/auth.ts` (AC: 4, 5)
  - [ ] Import logger at top of file
  - [ ] Add `logger.error(...)` to each outer catch block (not inner token-verification try/catch)
  - [ ] Add `logger.warn(...)` for failed login attempts (wrong password)
  - [ ] Never log: passwords, token values, crypto keys, kek_salt
- [ ] Verify Vitest still passes (AC: 6)
  - [ ] Run `npx vitest run` from `backend/` — must exit 0

## Dev Notes

### Previous Story Context (Story 1.1)

Story 1.1 added Vitest infrastructure and `.env.example`. No source files were modified. The test setup from Story 1.1 must still pass after this story — run `npx vitest run` to verify before marking done.

### Install Command

Run from `backend/` directory:
```bash
npm install winston
```

This adds `winston` to `backend/package.json` dependencies (NOT devDependencies — it runs in production).

**Do NOT install `@types/winston`** — Winston v3 ships its own TypeScript types.

### logger.ts — Exact Content

Create `backend/src/utils/logger.ts`:

```typescript
import winston from 'winston'

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
  ],
})

export default logger
```

**Why Console transport only:** Docker captures stdout/stderr from containers. This is the intended deployment target (see architecture INFRA-2). No file transport in this story.

**Anti-patterns:**
- ❌ Do NOT add file transports (`winston.transports.File`) — this story is Console only
- ❌ Do NOT use `winston.format.colorize()` — JSON format is required for structured logging
- ❌ Do NOT use `require('winston')` — ESM project, use `import`
- ❌ Do NOT `import { createLogger } from 'winston'` and create multiple instances — use a single shared default export

### index.ts Changes

Current state of `backend/src/index.ts` (line 38):
```typescript
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
```

After change:
```typescript
import logger from './utils/logger'
// ... (add this import at the top of the file, after other imports)

app.listen(PORT, () => {
  logger.info('Server started', { port: PORT })
})
```

**What to preserve:** All existing middleware, CORS config, route registrations, `cookieParser` — do NOT touch anything else in index.ts.

### auth.ts Changes

`backend/src/routes/auth.ts` has no `console.log` calls currently. The work here is:

**1. Add import at top:**
```typescript
import logger from '../utils/logger'
```

**2. Add `logger.error` to each outer catch block.** There are 10+ routes in auth.ts. For each outer catch:

```typescript
// BEFORE:
} catch (error) {
  res.status(500).json({ error: 'Erreur serveur lors de la création du compte' })
}

// AFTER:
} catch (error) {
  logger.error('POST /api/auth/register failed', { error: (error as Error).message })
  res.status(500).json({ error: 'Erreur serveur lors de la création du compte' })
}
```

Route names for context (use these exact strings):
- `/register` → `'POST /api/auth/register failed'`
- `/verify-email` → `'POST /api/auth/verify-email failed'`
- `/activate` → `'POST /api/auth/activate failed'`
- `/login` → `'POST /api/auth/login failed'`
- `/logout` (no try/catch needed — no async DB operations that throw)
- `/refresh` → `'POST /api/auth/refresh failed'`
- `PUT /password` → `'PUT /api/auth/password failed'`
- `POST /password/forgot` → `'POST /api/auth/password/forgot failed'`
- `PUT /password/reset` → `'PUT /api/auth/password/reset failed'`
- `GET /recovery` → `'GET /api/auth/recovery failed'`
- `POST /recovery/verify` → `'POST /api/auth/recovery/verify failed'`
- `DELETE /account` → `'DELETE /api/auth/account failed'`

**3. Add `logger.warn` for failed login (wrong password only):**

In `POST /login`, after the `isPasswordValid` check:
```typescript
if (!isPasswordValid) {
  logger.warn('Failed login attempt', { email, route: '/api/auth/login' })
  return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
}
```

**CRITICAL — What NEVER to log:**
- ❌ `password` or `newPassword` or `oldPassword` fields from `req.body`
- ❌ `token` values (raw tokens from req.body or cookies)
- ❌ `encrypted_crypto_key`, `kek_salt`, `recovery_encrypted_crypto_key`
- ❌ `password_hash` values
- ✅ Safe to log: `email`, `user_id`, route names, `(error as Error).message`

**Inner try/catch blocks — DO NOT TOUCH:**
`auth.ts` has nested try/catch blocks specifically for JWT verification (e.g., in `/activate`, `/password/reset`, `/recovery`). These look like:
```typescript
try {
  verifyToken(token)
} catch (err) {
  return res.status(401).json({ error: 'Token invalide ou expiré' })
}
```
These are control-flow try/catch (not error conditions), not outer server errors. Do NOT add logger.error to these inner blocks.

### Project Structure Notes

- `backend/src/utils/logger.ts` — NEW file
- `backend/src/index.ts` — MODIFY: add import + replace console.log
- `backend/src/routes/auth.ts` — MODIFY: add import + logger.error in catch blocks + logger.warn in login

**Do NOT touch:**
- `backend/src/routes/passwords.ts` — vault logging is Epic 2's scope
- `backend/src/routes/admin.ts` — admin logging deferred
- `backend/src/middlewares/` — no changes needed
- Any frontend files
- `backend/src/utils/crypto.ts` — must not be changed (Story 1.1 tests depend on it)

### Regression Prevention

After all changes, run from `backend/`:
```bash
npx vitest run
```

The `crypto.test.ts` tests from Story 1.1 must still pass. The logger import in auth.ts and index.ts does not affect crypto.ts — no regression expected, but verify.

### References

- [Source: architecture.md#INFRA-3] Winston — Console transport, JSON format, no file transport in MVP
- [Source: architecture.md#Winston Logging Pattern] `logger.ts` singleton, never console.log in production, never log secrets
- [Source: architecture.md#Enforcement] "Logger via Winston — jamais console.log/error en production"
- [Source: project-context.md#Critical Don't-Miss Rules] "Never log passwords, tokens, or crypto keys"
- [Source: backend/src/index.ts:38] `console.log(\`Server is running on http://localhost:${PORT}\`)` — the only console.log to replace
- [Source: backend/src/routes/auth.ts] catch blocks have no logging — adding logger.error to all outer catches

## Dev Agent Record

### Agent Model Used

_to be filled by dev agent_

### Debug Log References

### Completion Notes List

### File List

- `backend/src/utils/logger.ts` (NEW)
- `backend/src/index.ts` (MODIFY — add logger import, replace console.log)
- `backend/src/routes/auth.ts` (MODIFY — add logger import, logger.error in catch blocks, logger.warn in login)
- `backend/package.json` (MODIFY — add winston dependency)
