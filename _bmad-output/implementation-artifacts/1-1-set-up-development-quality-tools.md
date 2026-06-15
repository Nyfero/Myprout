# Story 1.1: Set Up Development Quality Tools

Status: ready-for-dev

## Story

As a developer,
I want Vitest configured and a .env.example file in place,
so that I can write automated tests and onboard new environments easily.

## Acceptance Criteria

1. Running `npx vitest run` from `backend/` exits with code 0 and at least one passing test.
2. `backend/vitest.config.ts` exists and is valid.
3. At least one passing test exists: a crypto utility smoke test in `backend/src/utils/crypto.test.ts`.
4. `.env.example` exists at the project root with all required variable names and no secret values.
5. Required variables in `.env.example`: `DATABASE_URL`, `JWT_PRIVATE_KEY_PATH`, `JWT_PUBLIC_KEY_PATH`, `NODE_ENV`.

## Tasks / Subtasks

- [ ] Install Vitest in backend (AC: 1, 2)
  - [ ] Run `npm install -D vitest` inside `backend/`
  - [ ] Add `"test": "vitest run"` and `"test:watch": "vitest"` to `backend/package.json` scripts
- [ ] Create `backend/vitest.config.ts` (AC: 2)
  - [ ] Use `defineConfig` from `vitest/config`, set `environment: 'node'`
- [ ] Write crypto utility smoke test (AC: 1, 3)
  - [ ] Create `backend/src/utils/crypto.test.ts`
  - [ ] Test: `generateCryptoKey()` returns 64-char lowercase hex string
  - [ ] Test: `generateSalt()` returns 64-char lowercase hex string
  - [ ] Verify `npx vitest run` passes
- [ ] Create `.env.example` at project root (AC: 4, 5)
  - [ ] List all required variables with placeholder values (no real secrets)

## Dev Notes

### Critical: ESM Module Configuration

The backend uses `"type": "module"` in `package.json` — this is **pure ESM**. Rules that apply everywhere in this project:
- **Never use `require()`** — only `import`/`export`
- **Never use CommonJS patterns** (`module.exports`, `__dirname`, `__filename`)
- Vitest handles TypeScript natively via esbuild — no need for `tsx` or `ts-node` in tests

### Vitest Config (exact content)

Create `backend/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
  },
})
```

**Anti-patterns to avoid:**
- ❌ Do NOT use `jest.config.ts` — architecture specifies Vitest, not Jest
- ❌ Do NOT add `globals: true` unless you also add `"types": ["vitest/globals"]` to tsconfig
- ❌ Do NOT place config at root `package.json` — Vitest is a backend-only concern

### package.json scripts to add

In `backend/package.json`, add to scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

**Install command** (run from `backend/` directory):
```bash
npm install -D vitest
```

### Crypto Test File

Create `backend/src/utils/crypto.test.ts` — test file co-located with source (architecture decision):

```typescript
import { describe, it, expect } from 'vitest'
import { generateCryptoKey, generateSalt, encryptCryptoKey, decryptCryptoKey, deriveKek } from './crypto'

describe('crypto utils', () => {
  it('generateCryptoKey returns 64-char hex string', () => {
    const key = generateCryptoKey()
    expect(key).toHaveLength(64)
    expect(key).toMatch(/^[0-9a-f]+$/)
  })

  it('generateSalt returns 64-char hex string', () => {
    const salt = generateSalt()
    expect(salt).toHaveLength(64)
    expect(salt).toMatch(/^[0-9a-f]+$/)
  })

  it('encryptCryptoKey/decryptCryptoKey roundtrip', async () => {
    const key = generateCryptoKey()
    const salt = generateSalt()
    const kek = await deriveKek('test-password', Buffer.from(salt, 'hex'))
    const encrypted = encryptCryptoKey(key, kek)
    // Format must be iv:tag:encrypted (hex, colon-separated)
    expect(encrypted.split(':')).toHaveLength(3)
    const decrypted = decryptCryptoKey(encrypted, kek)
    expect(decrypted).toBe(key)
  })
})
```

**Critical crypto invariants** (must not be broken by any test):
- PBKDF2: 310,000 iterations, 32-byte key, SHA-256 (`PBKDF2_ITERATIONS`, `PBKDF2_KEYLEN`, `PBKDF2_DIGEST` constants in crypto.ts)
- Encrypted format: `iv:tag:encrypted` (hex strings, colon-separated) — never change this format
- `deriveKek` takes `(password: string, salt: Buffer)` — salt must be passed as `Buffer.from(hexSalt, 'hex')`

### .env.example Content

Create at **project root** (not inside `backend/`):
```
# Database
DATABASE_URL=mysql://user:password@localhost:3306/myprout

# JWT RSA Keys (file paths to PEM files)
JWT_PRIVATE_KEY_PATH=/path/to/private.pem
JWT_PUBLIC_KEY_PATH=/path/to/public.pem

# Environment
NODE_ENV=development
```

**Anti-patterns:**
- ❌ Do NOT put real values, tokens, or passwords in this file
- ❌ Do NOT put `.env.example` inside `backend/` — it belongs at the monorepo root
- ✅ `.env` (the real file) is already in `.gitignore` — do not modify `.gitignore`

### Project Structure Notes

- `backend/vitest.config.ts` — NEW file
- `backend/src/utils/crypto.test.ts` — NEW file, co-located with `crypto.ts`
- `backend/package.json` — MODIFY: add `vitest` devDependency + test scripts
- `.env.example` — NEW file at project root `/home/gsap/myprout/.env.example`

**Do NOT touch:**
- `frontend/` — Vitest for backend only; frontend uses Vite (no testing setup in this story)
- Root `package.json` — no Vitest dependency at root level
- Any existing source files — this story adds infrastructure only

### Existing Code Context

`backend/src/utils/crypto.ts` exports:
- `deriveKek(password, salt)` → Promise<Buffer> — PBKDF2 key derivation
- `encryptCryptoKey(cryptoKeyHex, kek)` → string (`iv:tag:encrypted`)
- `decryptCryptoKey(encryptedData, kek)` → string (hex)
- `generateCryptoKey()` → string (64-char hex)
- `generateSalt()` → string (64-char hex)

The `deriveKek` function uses callback-style `crypto.pbkdf2` wrapped in a Promise — this is correct, do not convert to `promisify` or change the implementation.

### References

- [Source: architecture.md#INFRA-4] Vitest test framework, ESM-native, co-located test files
- [Source: architecture.md#INFRA-5] .env.example at project root with variable names only
- [Source: project-context.md#Language-Specific Rules] Backend uses ESM — never require()
- [Source: project-context.md#Critical Don't-Miss Rules] PBKDF2 310k iterations, AES-256-GCM, format iv:tag:encrypted
- [Source: backend/package.json] "type": "module" — pure ESM, TypeScript 5.9.3, tsx 4.21.0

## Dev Agent Record

### Agent Model Used

_to be filled by dev agent_

### Debug Log References

### Completion Notes List

### File List

- `backend/vitest.config.ts` (NEW)
- `backend/src/utils/crypto.test.ts` (NEW)
- `backend/package.json` (MODIFY — add vitest devDependency + test scripts)
- `.env.example` (NEW — project root)
