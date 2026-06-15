# Story 2.1: Remove Soft Delete from Password Schema

Status: ready-for-dev

## Story

As a developer,
I want the passwords table schema cleaned up,
so that the codebase does not carry unused complexity.

## Acceptance Criteria

1. The `passwords` Prisma model no longer contains `is_deleted` or `deleted_time` fields.
2. A Prisma migration file exists documenting this change.
3. The backend compiles without TypeScript errors after the schema change.
4. `npx vitest run` passes after all changes.

## Tasks / Subtasks

- [ ] Update `backend/prisma/schema.prisma` (AC: 1)
  - [ ] Remove `is_deleted Boolean @default(false)` from `passwords` model
  - [ ] Remove `deleted_time DateTime?` from `passwords` model
- [ ] Run Prisma migration (AC: 2)
  - [ ] Run `npx prisma migrate dev --name remove-soft-delete` from `backend/`
- [ ] Verify no TypeScript errors (AC: 3)
  - [ ] Run `npx tsc --noEmit` from `backend/` (or start the dev server briefly)
- [ ] Verify tests still pass (AC: 4)
  - [ ] Run `npx vitest run` from `backend/`

## Dev Notes

### Critical Context: Zero Code References

**`is_deleted` and `deleted_time` are NOT referenced anywhere in the codebase.** Grep across the entire `backend/src/` and `frontend/src/` confirms zero usages. The soft-delete feature was planned but never implemented.

Evidence:
- `backend/src/routes/passwords.ts` `DELETE /:id` already uses `prisma.passwords.delete()` — hard delete
- `backend/src/routes/passwords.ts` `GET /` does NOT filter by `is_deleted` — all passwords returned regardless
- No frontend component references `is_deleted` or `deleted_time`

This means the schema change is purely mechanical — no code changes required beyond the migration.

---

### Schema Change — Exact Diff

File: `backend/prisma/schema.prisma`

Remove these two lines from the `passwords` model:
```prisma
// REMOVE THESE:
is_deleted      Boolean   @default(false)
deleted_time    DateTime?
```

Current `passwords` model (lines 66-79):
```prisma
model passwords {
  password_id     Int       @id @default(autoincrement())
  user_id         Int
  user            users     @relation(fields: [user_id], references: [user_id])
  title           String?
  username        String?
  password        String?
  email           String?
  note            String?   @db.Text
  is_compromised  Boolean   @default(false)
  is_stared       Boolean   @default(false)
  is_deleted      Boolean   @default(false)   ← REMOVE
  deleted_time    DateTime?                   ← REMOVE
}
```

After change:
```prisma
model passwords {
  password_id     Int       @id @default(autoincrement())
  user_id         Int
  user            users     @relation(fields: [user_id], references: [user_id])
  title           String?
  username        String?
  password        String?
  email           String?
  note            String?   @db.Text
  is_compromised  Boolean   @default(false)
  is_stared       Boolean   @default(false)
}
```

---

### Do NOT Remove: is_compromised

`is_compromised Boolean @default(false)` — also currently unreferenced in code but **intentionally kept**. It is reserved for the breach monitoring feature (FR-16, Phase 2 of the roadmap). Do NOT remove it.

---

### Migration Command

Run from `backend/` directory:
```bash
npx prisma migrate dev --name remove-soft-delete
```

This will:
1. Generate a migration file in `backend/prisma/migrations/TIMESTAMP_remove-soft-delete/migration.sql`
2. Execute the SQL: `ALTER TABLE passwords DROP COLUMN is_deleted; ALTER TABLE passwords DROP COLUMN deleted_time;`
3. Regenerate the Prisma client

**⚠️ Data loss note:** Any data in `is_deleted` or `deleted_time` columns will be permanently lost. This is acceptable — the fields were never set by application code, so all values are the defaults (`false` and `NULL`).

**⚠️ If migration fails:** If there are foreign key constraints or triggers referencing these columns (unlikely), investigate before forcing. Do NOT use `--force` without understanding the reason for failure.

---

### Prisma Client Regeneration

After running `prisma migrate dev`, Prisma auto-regenerates the client. The TypeScript types for `passwords` will no longer include `is_deleted` or `deleted_time`. Since no code references these fields, there will be no TypeScript errors.

Verify with:
```bash
cd backend && npx tsc --noEmit
```

---

### What Must NOT Change

- `is_stared Boolean @default(false)` — used in Story 2.3 (favorites filter) — keep
- `is_compromised Boolean @default(false)` — reserved for Phase 2 — keep
- All other fields in `passwords` model — keep
- The `users` model email `@unique` change from Story 1.3 — must be preserved
- The `@@index` removal from Story 1.3 — must be preserved

---

### Relationship to Story 2.2

Story 2.2 (Implement Hard Delete) builds on this story. After Story 2.1, the `DELETE /:id` route in `passwords.ts` already performs a hard delete — Story 2.2 will verify and improve it (adding ownership check + error codes). No dependency issue: Story 2.1 is a schema-only change.

---

### References

- [Source: architecture.md#DA-1] "Remove is_deleted and deleted_time fields from Prisma passwords model. Hard delete only."
- [Source: backend/prisma/schema.prisma:77-78] Current location of is_deleted and deleted_time
- [Source: backend/src/routes/passwords.ts:55-65] DELETE route already uses prisma.passwords.delete() — hard delete
- [Source: grep result] Zero code references to is_deleted or deleted_time anywhere in project

## Dev Agent Record

### Agent Model Used

_to be filled by dev agent_

### Debug Log References

### Completion Notes List

### File List

- `backend/prisma/schema.prisma` (MODIFY — remove 2 lines)
- `backend/prisma/migrations/TIMESTAMP_remove-soft-delete/migration.sql` (NEW — generated by prisma migrate dev)
