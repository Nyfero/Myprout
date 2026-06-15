# Story 1.4: Add Rate Limiting to Auth Endpoints

Status: ready-for-dev

## Story

As a system administrator,
I want rate limiting on authentication endpoints,
so that brute force and spam attacks are automatically blocked.

## Acceptance Criteria

1. `backend/src/middlewares/rateLimiter.ts` exists and exports `loginLimiter`, `registerLimiter`, and `apiLimiter` as named exports.
2. `POST /api/auth/login` called 11 times from the same IP within 15 minutes returns HTTP 429 on the 11th request, with a `Retry-After` header.
3. `POST /api/auth/register` called 6 times from the same IP within 60 minutes returns HTTP 429 on the 6th request.
4. `POST /api/auth/password/forgot` is protected by `loginLimiter`.
5. All rate limit error responses follow the format `{ error: string, code: string }`.
6. `npx vitest run` passes after all changes.

## Tasks / Subtasks

- [ ] Install express-rate-limit (AC: 1)
  - [ ] Run `npm install express-rate-limit` inside `backend/`
- [ ] Create `backend/src/middlewares/rateLimiter.ts` (AC: 1, 2, 3, 5)
  - [ ] Export `loginLimiter`: 10 req / 15min / IP
  - [ ] Export `registerLimiter`: 5 req / 60min / IP
  - [ ] Export `apiLimiter`: 100 req / 60s / IP
  - [ ] All `message` objects use `{ error, code }` format
- [ ] Apply limiters in `backend/src/routes/auth.ts` (AC: 2, 3, 4)
  - [ ] Add `loginLimiter` to `POST /login`
  - [ ] Add `registerLimiter` to `POST /register`
  - [ ] Add `loginLimiter` to `POST /password/forgot`
- [ ] Verify no regression (AC: 6)
  - [ ] Run `npx vitest run` from `backend/`

## Dev Notes

### Install Command

Run from `backend/` directory:
```bash
npm install express-rate-limit
```

This adds `express-rate-limit` to production dependencies (NOT devDependencies — it runs in production).

**Version note:** Use latest stable (v7+). Express-rate-limit v7+ supports ESM natively. Do NOT use v6 or older — they had CommonJS-only builds.

---

### rateLimiter.ts — Exact Content

Create `backend/src/middlewares/rateLimiter.ts`:

```typescript
import rateLimit from 'express-rate-limit'

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Trop de tentatives. Réessayez dans 15 minutes.', code: 'AUTH_007' },
  standardHeaders: true,
  legacyHeaders: false,
})

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: "Trop de tentatives d'inscription. Réessayez dans 1 heure.", code: 'AUTH_008' },
  standardHeaders: true,
  legacyHeaders: false,
})

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: { error: 'Trop de requêtes. Réessayez dans un instant.', code: 'SERVER_002' },
  standardHeaders: true,
  legacyHeaders: false,
})
```

**Why `standardHeaders: true, legacyHeaders: false`:**
- `standardHeaders: true` sends the `RateLimit-*` headers (IETF standard draft), including `Retry-After`
- `legacyHeaders: false` suppresses the old `X-RateLimit-*` headers — keeps responses clean

**Why `message` as an object:** `express-rate-limit` accepts a string or object as the `message`. Using an object with `{ error, code }` matches the architecture API-2 error format used across the project.

---

### Applying Limiters in auth.ts

Add import at top of `backend/src/routes/auth.ts`:
```typescript
import { loginLimiter, registerLimiter } from '../middlewares/rateLimiter'
```

Apply to specific routes (middleware is the second argument, before the async handler):

```typescript
// POST /register
router.post('/register', registerLimiter, async (req, res) => {

// POST /login
router.post('/login', loginLimiter, async (req, res) => {

// POST /password/forgot
router.post('/password/forgot', loginLimiter, async (req, res) => {
```

**Routes that do NOT get rate limiting in this story:**
- `/verify-email` — token-gated, not brute-forceable
- `/activate` — token-gated (JWT), not brute-forceable
- `/logout` — safe idempotent operation
- `/refresh` — already protected by httpOnly cookie + DB lookup
- `/password/reset` — token-gated (JWT), not brute-forceable
- `/recovery` — token-gated, not brute-forceable
- `/recovery/verify` — could benefit but deferred
- Authenticated routes (`PUT /password`, `POST /password/verify`, `DELETE /account`) — protected by `authMiddleware`

`apiLimiter` is available for future use on vault routes (Epic 2 scope). Do NOT apply it globally to all routes in this story.

---

### How express-rate-limit Works with Express 5

Express 5 changes how async errors are handled compared to Express 4. express-rate-limit v7 is compatible with both. No special configuration needed.

The middleware signature is: `(req, res, next) => void` — standard Express middleware, works exactly the same in v5.

**IP detection:** By default, express-rate-limit uses `req.ip` which Express derives from `req.socket.remoteAddress`. When behind nginx (production), nginx will set `X-Forwarded-For`. In that case, you'd need `app.set('trust proxy', 1)` in `index.ts`. **However, for this story (dev/test context), this is NOT required.** Add a comment noting this is needed for production nginx setup (Story 3.2 scope).

---

### What Must Be Preserved

All existing behavior in `auth.ts` must remain unchanged:
- The `findUnique` email check from Story 1.3 must stay in `/register`
- The `authMiddleware` on authenticated routes must stay
- Logger calls from Story 1.2 (if applied) must stay
- The transaction patterns in all routes must stay

The rate limiter middleware runs BEFORE the route handler — it only adds a pre-check. It does not modify route logic.

---

### Previous Stories Context

- Story 1.1: Vitest infrastructure — `npx vitest run` must still pass
- Story 1.2: Winston logger — `logger.ts` import in auth.ts must be preserved
- Story 1.3: Registration spam fix — `findUnique` in `/register` must be preserved

---

### Testing Note

Vitest tests for rate limiting behavior (verifying HTTP 429 after threshold) are in Story 1.6 scope. This story only implements the middleware and applies it. The existing crypto tests from Story 1.1 are the regression check — they don't test rate limiting.

---

### References

- [Source: architecture.md#SEC-1] express-rate-limit, loginLimiter 10/15min, registerLimiter 5/60min, apiLimiter 100/60s
- [Source: architecture.md#Rate Limiter Pattern] `src/middlewares/rateLimiter.ts`, named exports, applied per-route
- [Source: architecture.md#API-2] Error format `{ error, code }` — must be used in rate limit `message`
- [Source: backend/src/routes/auth.ts] 13 routes total — only 3 get limiters in this story

## Dev Agent Record

### Agent Model Used

_to be filled by dev agent_

### Debug Log References

### Completion Notes List

### File List

- `backend/src/middlewares/rateLimiter.ts` (NEW)
- `backend/src/routes/auth.ts` (MODIFY — add import + apply limiters to 3 routes)
- `backend/package.json` (MODIFY — add express-rate-limit dependency)
