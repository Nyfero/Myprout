# Story 1.5: Standardize Auth Error Response Codes

Status: ready-for-dev

## Story

As a developer,
I want all auth route errors to include a machine-readable error code,
so that frontend clients can handle specific error cases programmatically.

## Acceptance Criteria

1. Every error response in `backend/src/routes/auth.ts` and `backend/src/middlewares/authMiddleware.ts` contains both `error` (string) and `code` (string in format `DOMAIN_NNN`).
2. Successful responses do NOT contain an `error` or `code` field.
3. The error codes defined in this story are documented as the canonical registry for the project.
4. `npx vitest run` passes after all changes.

## Tasks / Subtasks

- [ ] Update `backend/src/middlewares/authMiddleware.ts` (AC: 1)
  - [ ] Add `code` to all 4 error responses (see mapping table below)
- [ ] Update `backend/src/routes/auth.ts` (AC: 1)
  - [ ] Add `code` to all 55 error responses (see complete mapping table below)
  - [ ] Preserve all existing `error` message strings (French, unchanged)
  - [ ] Preserve all existing HTTP status codes (unchanged)
- [ ] Verify Vitest still passes (AC: 4)
  - [ ] Run `npx vitest run` from `backend/`

## Dev Notes

### Transformation Pattern

Every error response changes from:
```typescript
res.status(NNN).json({ error: 'message' })
```
to:
```typescript
res.status(NNN).json({ error: 'message', code: 'DOMAIN_NNN' })
```

Multi-line format (e.g. in login route) changes from:
```typescript
return res.status(403).json({
  error: "Votre adresse mail n'est pas vérifié",
})
```
to:
```typescript
return res.status(403).json({
  error: "Votre adresse mail n'est pas vérifié",
  code: 'AUTH_011',
})
```

**Do NOT change:** HTTP status codes, French error message strings, response structure of successful responses.

---

### Complete Error Code Registry

#### AUTH_ codes

| Code | Meaning |
|------|---------|
| AUTH_001 | Invalid credentials (wrong password or email/password) |
| AUTH_002 | Token expired (JWT or time-limited one-time token) |
| AUTH_003 | Missing token (Authorization header, cookie, or body field) |
| AUTH_004 | Revoked, invalid, or non-existent token (not in DB) |
| AUTH_005 | Missing required request fields |
| AUTH_006 | Email already registered |
| AUTH_007 | Rate limit exceeded — login/password-forgot (from rateLimiter.ts Story 1.4) |
| AUTH_008 | Rate limit exceeded — registration (from rateLimiter.ts Story 1.4) |
| AUTH_009 | One-time token invalid or already used |
| AUTH_010 | Email already verified |
| AUTH_011 | Email not yet verified (cannot log in) |
| AUTH_012 | Account pending admin activation |
| AUTH_013 | Password not set (must use activation email) |
| AUTH_014 | User not found |
| AUTH_015 | No security questions configured |
| AUTH_016 | Incorrect security question answers |

#### CRYPTO_ codes

| Code | Meaning |
|------|---------|
| CRYPTO_001 | Cannot decrypt crypto key |

#### SERVER_ codes

| Code | Meaning |
|------|---------|
| SERVER_001 | Internal server error |
| SERVER_002 | General rate limit exceeded (from rateLimiter.ts Story 1.4) |

---

### Complete Mapping Table — authMiddleware.ts

File: `backend/src/middlewares/authMiddleware.ts`

| Line | Current error message | Code to add |
|------|-----------------------|-------------|
| 26 | `'Token manquant ou invalide'` | `AUTH_003` |
| 39 | `'Token invalide'` | `AUTH_004` |
| 52 | `'Token révoqué ou inexistant'` | `AUTH_004` |
| 58 | `'Token invalide ou expiré'` | `AUTH_002` |

---

### Complete Mapping Table — auth.ts

File: `backend/src/routes/auth.ts`

| Line | Route | Current error message | Code |
|------|-------|-----------------------|------|
| 32 | POST /register | `'Champs manquants'` | `AUTH_005` |
| 41 | POST /register | `'Cet email est déjà utilisé'` | `AUTH_006` |
| 78 | POST /register | `'Erreur serveur lors de la création du compte'` | `SERVER_001` |
| 87 | POST /verify-email | `'Token manquant'` | `AUTH_003` |
| 102 | POST /verify-email | `'Token invalide'` | `AUTH_009` |
| 108 | POST /verify-email | `'Email déjà vérifié'` | `AUTH_010` |
| 128 | POST /verify-email | `'Erreur serveur'` | `SERVER_001` |
| 137 | POST /activate | `'Champs manquants'` | `AUTH_005` |
| 143 | POST /activate | `'Token invalide ou expiré'` (inner catch) | `AUTH_002` |
| 157 | POST /activate | `'Token invalide ou déjà utilisé'` | `AUTH_009` |
| 161 | POST /activate | `'Token expiré'` | `AUTH_002` |
| 220 | POST /activate | `'Erreur serveur lors de la définition du mot de passe'` | `SERVER_001` |
| 230 | POST /login | `'Champs manquants'` | `AUTH_005` |
| 244 | POST /login | `'Email ou mot de passe incorrect'` (user not found) | `AUTH_001` |
| 249 | POST /login | `"Votre adresse mail n'est pas vérifié"` | `AUTH_011` |
| 255-256 | POST /login | `'Votre compte est en attente de validation...'` | `AUTH_012` |
| 262 | POST /login | `"Vous devez d'abord définir votre mot de passe..."` | `AUTH_013` |
| 268 | POST /login | `'Email ou mot de passe incorrect'` (wrong password) | `AUTH_001` |
| 325 | POST /login | `'Erreur serveur lors de la connexion'` | `SERVER_001` |
| 352 | POST /refresh | `'Refresh token manquant'` | `AUTH_003` |
| 366 | POST /refresh | `'Refresh token invalide'` | `AUTH_004` |
| 371 | POST /refresh | `'Refresh token expiré'` | `AUTH_002` |
| 426 | POST /refresh | `'Erreur serveur'` | `SERVER_001` |
| 436 | PUT /password | `'Champs manquants'` | `AUTH_005` |
| 443 | PUT /password | `'Utilisateur introuvable'` | `AUTH_014` |
| 448 | PUT /password | `'Ancien mot de passe incorrect'` | `AUTH_001` |
| 459 | PUT /password | `'Impossible de déchiffrer la clé'` | `CRYPTO_001` |
| 482 | PUT /password | `'Erreur serveur'` | `SERVER_001` |
| 491 | POST /password/verify | `'Champs manquants'` | `AUTH_005` |
| 499 | POST /password/verify | `'Mot de passe incorrect'` (user not found) | `AUTH_001` |
| 504 | POST /password/verify | `'Mot de passe incorrect'` (wrong password) | `AUTH_001` |
| 515 | POST /password/forgot | `'Champ manquant'` | `AUTH_005` |
| 550 | POST /password/forgot | `'Erreur serveur.'` | `SERVER_001` |
| 559 | PUT /password/reset | `'Champs manquants'` | `AUTH_005` |
| 565 | PUT /password/reset | `'Token invalide ou expiré'` (inner catch) | `AUTH_002` |
| 579 | PUT /password/reset | `'Token invalide ou déjà utilisé'` | `AUTH_009` |
| 583 | PUT /password/reset | `'Token expiré'` | `AUTH_002` |
| 608 | PUT /password/reset | `'Erreur serveur lors de la modification du mot de passe'` | `SERVER_001` |
| 615 | GET /recovery | `'Token manquant'` (query param) | `AUTH_003` |
| 621 | GET /recovery | `'Token invalide ou expiré'` (inner catch) | `AUTH_002` |
| 635 | GET /recovery | `'Token invalide ou déjà utilisé'` | `AUTH_009` |
| 639 | GET /recovery | `'Token expiré'` | `AUTH_002` |
| 645 | GET /recovery | `'Aucune question de sécurité'` | `AUTH_015` |
| ~655 | GET /recovery | `'Erreur serveur lors de...'` | `SERVER_001` |
| 667 | POST /recovery/verify | `'Champs manquants'` | `AUTH_005` |
| 674 | POST /recovery/verify | `'Token invalide ou expiré'` (inner catch) | `AUTH_002` |
| 688 | POST /recovery/verify | `'Token invalide ou déjà utilisé'` | `AUTH_009` |
| 692 | POST /recovery/verify | `'Token expiré'` | `AUTH_002` |
| 698 | POST /recovery/verify | `'Aucune question de sécurité'` | `AUTH_015` |
| 724 | POST /recovery/verify | `'Réponses incorrectes'` | `AUTH_016` |
| 733 | POST /recovery/verify | `'Erreur serveur lors de la vérification'` | `SERVER_001` |
| 743 | DELETE /account | `'Champs manquants'` | `AUTH_005` |
| 750 | DELETE /account | `'Utilisateur introuvable'` | `AUTH_014` |
| 755 | DELETE /account | `'Mot de passe incorrect'` | `AUTH_001` |
| ~770 | DELETE /account | `'Erreur serveur'` | `SERVER_001` |

**Note on line numbers:** Line numbers are approximate from the current state of auth.ts on this branch (after Stories 1.2, 1.3, 1.4 modifications). If previous stories added lines, the actual line numbers may differ by a few. Use the error message string to locate each response, not the line number alone.

---

### Important: POST /password/forgot Anti-Enumeration Pattern

Line ~521 in auth.ts:
```typescript
if (!user || !user.is_active) {
  return res.status(200).json({ success: true })
}
```
This **intentionally** returns 200 even when the user doesn't exist (prevents email enumeration). **Do NOT add an error code here — it is a success response, not an error.** This is a deliberate security decision.

---

### What Must Be Preserved

1. All HTTP status codes must stay the same (400, 401, 403, 404, 409, 500)
2. All French error message strings must stay unchanged
3. The `{ success: true }` response in `/password/forgot` must not get a code
4. The `authMiddleware` structure must not change — only add `code` to the 4 error responses
5. Logger calls from Story 1.2 must be preserved in catch blocks
6. Rate limiter middleware from Story 1.4 must be preserved on `/login`, `/register`, `/password/forgot`
7. The `findUnique` email check from Story 1.3 must be preserved in `/register`

---

### No New File Needed

This story adds only the `code` field to existing `res.json()` calls. No new files, no new imports, no new logic.

---

### References

- [Source: architecture.md#API-2] Error format `{ error, code: 'DOMAIN_NNN' }`, domains: AUTH_, VAULT_, ADMIN_, SERVER_
- [Source: architecture.md#Error code registry] AUTH_001-004 defined, others extended here
- [Source: backend/src/routes/auth.ts] 55 error responses across 13 routes
- [Source: backend/src/middlewares/authMiddleware.ts] 4 error responses

## Dev Agent Record

### Agent Model Used

_to be filled by dev agent_

### Debug Log References

### Completion Notes List

### File List

- `backend/src/routes/auth.ts` (MODIFY — add `code` to all error responses)
- `backend/src/middlewares/authMiddleware.ts` (MODIFY — add `code` to 4 error responses)
