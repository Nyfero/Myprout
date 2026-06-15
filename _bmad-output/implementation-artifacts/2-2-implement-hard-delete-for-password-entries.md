# Story 2.2: Implement Hard Delete for Password Entries

Status: ready-for-dev

## Story

As a user,
I want to permanently delete a password entry,
so that removed entries are fully gone and not just hidden.

## Acceptance Criteria

1. `DELETE /api/passwords/:id` returns HTTP 200 with `{ message: 'Mot de passe supprimé avec succès' }` on success.
2. `DELETE /api/passwords/:id` for a password_id that does not belong to the authenticated user returns HTTP 403 with `{ error: 'Accès non autorisé', code: 'VAULT_003' }`.
3. `DELETE /api/passwords/:id` for a non-existent password_id returns HTTP 404 with `{ error: 'Mot de passe non trouvé', code: 'VAULT_002' }`.
4. The deletion uses `prisma.passwords.delete()` (hard delete — DA-1 confirmed in Story 2.1).
5. `npx vitest run` passes after all changes.

## Tasks / Subtasks

- [ ] Update `DELETE /:id` in `backend/src/routes/passwords.ts` (AC: 1, 2, 3, 4)
  - [ ] Add `logger` import from `'../utils/logger'`
  - [ ] Replace the route implementation with explicit ownership check
  - [ ] Return 200 + message on success (not 204)
  - [ ] Return 404 + VAULT_002 if entry not found
  - [ ] Return 403 + VAULT_003 if entry belongs to another user
  - [ ] Return 500 + SERVER_001 on unexpected errors
- [ ] Verify tests pass (AC: 5)
  - [ ] Run `npx vitest run` from `backend/`

## Dev Notes

### Current State vs Required State

**Current `DELETE /:id` (lines 55-65 of passwords.ts):**
```typescript
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params
  try {
    await prisma.passwords.delete({
      where: { password_id: parseInt(id), user_id: req.user.user_id },
    })
    res.status(204).send()
  } catch (error) {
    res.status(400).json({ error: 'Erreur lors de la suppression' })
  }
})
```

**Problems with current implementation:**
1. Returns `204 No Content` — AC requires `200` with a message
2. Prisma `where: { password_id, user_id }` — if either doesn't match, Prisma throws `PrismaClientKnownRequestError P2025` ("Record to delete does not exist"), which lands in the catch as a generic 400. Cannot distinguish "not found" from "belongs to another user" from "invalid ID".
3. No error codes, no logger
4. Returns 400 for what is actually a server error (should be 404 or 403)

---

### Required Implementation

Replace the entire `DELETE /:id` handler with:

```typescript
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params
  const passwordId = parseInt(id)

  if (isNaN(passwordId)) {
    return res.status(400).json({ error: 'ID invalide', code: 'VAULT_001' })
  }

  try {
    const entry = await prisma.passwords.findUnique({
      where: { password_id: passwordId },
      select: { user_id: true },
    })

    if (!entry) {
      return res.status(404).json({ error: 'Mot de passe non trouvé', code: 'VAULT_002' })
    }

    if (entry.user_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Accès non autorisé', code: 'VAULT_003' })
    }

    await prisma.passwords.delete({
      where: { password_id: passwordId },
    })

    res.json({ message: 'Mot de passe supprimé avec succès' })
  } catch (error) {
    logger.error('DELETE /api/passwords/:id failed', { error: (error as Error).message })
    res.status(500).json({ error: 'Erreur lors de la suppression', code: 'SERVER_001' })
  }
})
```

**Why two DB calls instead of one:** The `findUnique` + `delete` pattern allows proper error discrimination (not found vs. unauthorized) rather than relying on Prisma exception parsing. The overhead of one extra query is negligible for this use case (~50 users).

**Why `select: { user_id: true }`:** Only fetches the user_id column — minimal DB overhead for the ownership check.

---

### Add Logger Import to passwords.ts

At the top of `backend/src/routes/passwords.ts`, add:
```typescript
import logger from '../utils/logger'
```

This follows the pattern established in Story 1.2. The logger is only used in the catch block of DELETE for now — Story 2.4 will add it to remaining routes.

---

### VAULT Error Codes Introduced in This Story

| Code | HTTP | Meaning |
|------|------|---------|
| VAULT_001 | 400 | Invalid ID format (non-numeric) |
| VAULT_002 | 404 | Entry not found |
| VAULT_003 | 403 | Unauthorized — entry belongs to another user |

These codes are part of the VAULT_ registry defined in Story 1.5 (architecture decision API-2). Story 2.4 will apply VAULT_ codes to all remaining vault routes.

---

### Dependency: Story 2.1 Must Complete First

Story 2.1 removes `is_deleted` and `deleted_time` from the Prisma schema and regenerates the Prisma client. If Story 2.1 is not yet done, the Prisma client still includes these fields — this doesn't block Story 2.2's implementation, but `npx vitest run` must be run after Story 2.1's migration to avoid stale client issues.

---

### What Must NOT Change in passwords.ts

These routes are NOT touched by this story:
- `GET /` — returns all user passwords (touched in Story 2.3)
- `POST /` — creates password entry (Story 2.4 scope for error codes)
- `PUT /:id` — updates password entry (Story 2.4 scope)
- `PATCH /:id/is_stared` — toggles favorite (Story 2.3 scope)
- `GET /logo` — logo proxy (no changes needed)

---

### Frontend Impact

The frontend currently calls `DELETE /api/passwords/:id` and likely handles:
- Success: removes the entry from the vault list
- Error: shows an error toast

Changing 204 → 200 with a JSON body may require a frontend update if the frontend checks for 204 specifically. Check `frontend/src/components/passwords/composables/usePasswords.js` for how DELETE is handled. If it uses `response.ok` (Axios checks 2xx), the change from 204 to 200 is transparent. If it checks `response.status === 204` explicitly, update it to accept 200.

---

### References

- [Source: architecture.md#DA-1] Hard delete only, no soft delete
- [Source: epics.md#Story 2.2 AC] HTTP 200 + message on success, HTTP 403 + VAULT_003 on unauthorized
- [Source: backend/src/routes/passwords.ts:55-65] Current DELETE implementation
- [Source: architecture.md#API-2] `{ error, code }` format for all errors
- [Source: story-1.2] Winston logger pattern — `logger.error('route failed', { error: err.message })`
- [Source: story-2.1] is_deleted/deleted_time removed from schema (no references in code)

## Dev Agent Record

### Agent Model Used

_to be filled by dev agent_

### Debug Log References

### Completion Notes List

### File List

- `backend/src/routes/passwords.ts` (MODIFY — replace DELETE /:id handler, add logger import)
