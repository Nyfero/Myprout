# Story 2.4: UX Polish and Vault Error Codes

Status: ready-for-dev

## Story

As a user,
I want the logout button in an intuitive location and clear error messages in the vault,
so that I can navigate myprout confidently without confusion.

## Acceptance Criteria

1. The logout button is visible in the navbar, accessible without navigating to the Profile page first. It is visible without scrolling on both desktop and mobile.
2. Every error response from `/api/passwords/*` routes contains both `error` (string) and `code` (string in format `VAULT_NNN` or `SERVER_NNN`).
3. The `PATCH /:id/is_stared` error response uses `{ error, code }` format — not `{ message }`.
4. `npx vitest run` passes after all changes.

## Tasks / Subtasks

- [ ] Add logout button to Navbar (AC: 1)
  - [ ] Import `useAuthStore` and `useRouter` in `Navbar.vue` (already imports useAuthStore)
  - [ ] Add logout icon button to the right side of the navbar
  - [ ] Wire it to `authStore.logout()` + `router.push({ name: 'Login' })`
- [ ] Add VAULT error codes to `backend/src/routes/passwords.ts` (AC: 2, 3)
  - [ ] Add `logger` import (if not already added in Story 2.2)
  - [ ] `GET /` — add error code to catch block
  - [ ] `POST /` — add error codes to catch block
  - [ ] `PUT /:id` — add error codes to catch block
  - [ ] `PATCH /:id/is_stared` — fix format (`message` → `error`) + add code
  - [ ] `GET /logo` — no error code needed (proxied binary response, not JSON)
- [ ] Verify no regression (AC: 4)
  - [ ] Run `npx vitest run` from `backend/`

## Dev Notes

### Part 1 — Logout Button in Navbar

**Current state:** Logout is in `frontend/src/components/profile/profile.vue` — a "Déconnexion" button at the bottom of the Profile page. Accessible only after navigating to `/profile`. The navbar has 3 links (Passwords, Admin, Profile) but no logout.

**Where to add:** Add a logout button to the **right side of `Navbar.vue`**, outside the `.container` div. This places it at the nav edge, visible at all times.

**Logout logic:** Import `useRouter` and use `authStore.logout()` + `router.push({ name: 'Login' })`. This is the same pattern as `useProfile.js`'s `logout()` function — duplicate it inline in Navbar.vue rather than importing from useProfile (avoid cross-component composable coupling in a simple navbar).

**Template change to `Navbar.vue`** — add a logout button after the closing `</div>` of `.container`:

```html
<template>
  <nav class="themed-card navbar">
    <div class="container">
      <!-- existing links unchanged -->
    </div>
    <button class="btn-logout-nav" @click="handleLogout" title="Déconnexion">
      <span class="material-icons">power_settings_new</span>
    </button>
  </nav>
</template>
```

**Script change to `Navbar.vue`:**

```javascript
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

const handleLogout = async () => {
  await auth.logout()
  router.push({ name: 'Login' })
}
```

**CSS to add to `Navbar.vue` scoped styles:**

```css
.btn-logout-nav {
  background: none;
  border: none;
  color: #aaa;
  cursor: pointer;
  padding: 0.4rem;
  display: flex;
  align-items: center;
  transition: color 0.2s;
  flex-shrink: 0;
}

.btn-logout-nav:hover {
  color: #ff6b6b;
}

.btn-logout-nav .material-icons {
  font-size: 1.6rem;
}
```

**Keep logout button in `profile.vue`:** Do NOT remove the logout button from `profile.vue`. Having it in both the navbar AND the profile page is acceptable and expected (many apps do this). Do not touch `profile.vue` or `useProfile.js`.

---

### Part 2 — Vault Error Codes in passwords.ts

**Dependency:** Story 2.2 already added `logger` import to `passwords.ts` and introduced VAULT_001, VAULT_002, VAULT_003 for the DELETE route. This story adds codes to the remaining 4 routes.

#### Complete VAULT_ Registry for passwords.ts

| Code | HTTP | Meaning |
|------|------|---------|
| VAULT_001 | 400 | Invalid ID format or missing required fields |
| VAULT_002 | 404 | Entry not found |
| VAULT_003 | 403 | Unauthorized — entry belongs to another user |
| VAULT_004 | 400 | Validation error (invalid data on create/update) |
| SERVER_001 | 500 | Internal server error |

#### GET / — add error code

Current (lines 9-18):
```typescript
} catch (error) {
  res.status(500).json({ error: 'Erreur lors de la récupération des mots de passe' })
}
```

Change to:
```typescript
} catch (error) {
  logger.error('GET /api/passwords failed', { error: (error as Error).message })
  res.status(500).json({ error: 'Erreur lors de la récupération des mots de passe', code: 'SERVER_001' })
}
```

#### POST / — add error code

Current (lines 34-38):
```typescript
} catch (error) {
  res.status(400).json({ error: 'Erreur lors de la création du mot de passe' })
}
```

Change to:
```typescript
} catch (error) {
  logger.error('POST /api/passwords failed', { error: (error as Error).message })
  res.status(400).json({ error: 'Erreur lors de la création du mot de passe', code: 'VAULT_004' })
}
```

**Note:** This route's 400 status is used for Prisma validation failures — VAULT_004 is appropriate.

#### PUT /:id — add error code

Current (lines 50-52):
```typescript
} catch (error) {
  res.status(400).json({ error: 'Erreur lors de la mise à jour' })
}
```

Change to:
```typescript
} catch (error) {
  logger.error('PUT /api/passwords/:id failed', { error: (error as Error).message })
  res.status(400).json({ error: 'Erreur lors de la mise à jour', code: 'VAULT_004' })
}
```

#### PATCH /:id/is_stared — fix format + add code

**Critical:** This route currently uses `{ message: '...' }` instead of `{ error: '...' }` — this is the wrong format per API-2 architecture decision.

Current (lines 77-79):
```typescript
} catch (error) {
  res.status(500).json({ message: 'Erreur serveur' })
}
```

Change to:
```typescript
} catch (error) {
  logger.error('PATCH /api/passwords/:id/is_stared failed', { error: (error as Error).message })
  res.status(500).json({ error: 'Erreur serveur', code: 'SERVER_001' })
}
```

#### GET /logo — no change needed

This route returns binary image data (not JSON) on success, and calls `res.status(404).end()` or `res.status(500).end()` on failure — no JSON body. Adding error codes to a non-JSON response would break the content type contract. Leave this route unchanged.

---

### Frontend: Handle Vault Errors (No Change Required)

The frontend in `usePasswords.js` uses `catch` blocks without inspecting error details (just re-throws or reverts state). Adding `code` to server responses is additive — it won't break existing error handling. No frontend changes needed for the error code part.

However, for the `PATCH /:id/is_stared` format change (`message` → `error`): the frontend's `toggleFavorite()` in `usePasswords.js` (lines 141-152) catches errors silently and reverts `is_stared` — it doesn't read the error message. So this format change is transparent to the frontend.

---

### What Must NOT Change

- The existing routes' happy-path behavior (GET, POST, PUT, PATCH) — only catch blocks change
- `GET /logo` — leave entirely unchanged
- `profile.vue` logout button — keep it (additive change, not a replacement)
- `PasswordsCard.vue`, `PasswordsAlphabet.vue` — no changes
- Story 2.2's DELETE route implementation — already has VAULT codes, do not modify

---

### References

- [Source: frontend/src/components/ui/Navbar.vue] No logout button currently
- [Source: frontend/src/components/profile/profile.vue:30-37] Current logout button in Profile page
- [Source: frontend/src/components/profile/composables/useProfile.js:9-12] `logout` pattern — `authStore.logout()` + `router.push({ name: 'Login' })`
- [Source: backend/src/routes/passwords.ts:77-79] PATCH uses `{ message }` not `{ error }` — wrong format
- [Source: architecture.md#API-2] Error format `{ error, code }` — enforced on all routes
- [Source: story-2.2] DELETE route already has VAULT_001, VAULT_002, VAULT_003 and logger import

## Dev Agent Record

### Agent Model Used

_to be filled by dev agent_

### Debug Log References

### Completion Notes List

### File List

- `frontend/src/components/ui/Navbar.vue` (MODIFY — add logout button + script + CSS)
- `backend/src/routes/passwords.ts` (MODIFY — add error codes to 4 routes, fix PATCH format)
