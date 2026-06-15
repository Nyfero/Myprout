# Story 1.6: Write Auth and Crypto Test Coverage

Status: ready-for-dev

## Story

As a developer,
I want automated tests for the auth routes and crypto utilities,
so that regressions in critical security code are caught before deployment.

## Acceptance Criteria

1. `backend/src/routes/auth.test.ts` exists and covers: duplicate email returns 409 with `code: 'AUTH_006'`, valid registration creates user + token (mocked), rate limiter returns 429 after threshold.
2. `backend/src/utils/crypto.test.ts` is expanded to cover: PBKDF2 consistency (same inputs = same output), different passwords produce different KEKs, decryptCryptoKey with wrong KEK throws.
3. All tests in `backend/src/routes/auth.test.ts` mock Prisma and email service — no real DB connection required.
4. Running `npx vitest run` from `backend/` exits with code 0 and all tests pass.

## Tasks / Subtasks

- [ ] Install test dependencies (AC: 1)
  - [ ] Run `npm install -D supertest @types/supertest` inside `backend/`
- [ ] Expand `backend/src/utils/crypto.test.ts` (AC: 2)
  - [ ] Add PBKDF2 consistency test
  - [ ] Add different-password-different-KEK test
  - [ ] Add wrong-KEK-throws test
- [ ] Create `backend/src/routes/auth.test.ts` (AC: 1, 3)
  - [ ] Set up Express app instance and vi.mock for prisma + email
  - [ ] Test POST /register: duplicate email → 409 + AUTH_006
  - [ ] Test POST /register: missing fields → 400 + AUTH_005
  - [ ] Test POST /register: new email → 201 (happy path)
  - [ ] Test POST /login: missing fields → 400 + AUTH_005
  - [ ] Test POST /login: rate limit → 429 after 11 attempts
- [ ] Verify all tests pass (AC: 4)
  - [ ] Run `npx vitest run` from `backend/`

## Dev Notes

### Install Commands

Run from `backend/` directory:
```bash
npm install -D supertest @types/supertest
```

`supertest` is the standard library for testing Express HTTP routes in Node.js. It sends real HTTP requests to the Express app without needing a running server.

---

### crypto.test.ts — Additions to Existing Smoke Test

File: `backend/src/utils/crypto.test.ts` (already exists from Story 1.1)

Add these tests to the existing `describe('crypto utils')` block:

```typescript
it('deriveKek: same password + salt always produces same key material', async () => {
  const password = 'my-test-password'
  const salt = generateSalt()
  const kek1 = await deriveKek(password, Buffer.from(salt, 'hex'))
  const kek2 = await deriveKek(password, Buffer.from(salt, 'hex'))
  // Both KEKs should encrypt/decrypt identically
  const key = generateCryptoKey()
  const encrypted1 = encryptCryptoKey(key, kek1)
  const decrypted = decryptCryptoKey(encrypted1, kek2)
  expect(decrypted).toBe(key)
})

it('deriveKek: different passwords produce different KEKs', async () => {
  const salt = generateSalt()
  const kek1 = await deriveKek('password-one', Buffer.from(salt, 'hex'))
  const kek2 = await deriveKek('password-two', Buffer.from(salt, 'hex'))
  const key = generateCryptoKey()
  const encrypted = encryptCryptoKey(key, kek1)
  // Decrypting with wrong KEK must throw
  expect(() => decryptCryptoKey(encrypted, kek2)).toThrow()
})
```

**Note on PBKDF2:** `deriveKek` is callback-based (not promisify), and it returns a `Promise<Buffer>`. The tests must `await` it. The existing smoke test already demonstrates this pattern.

---

### auth.test.ts — Architecture

Create `backend/src/routes/auth.test.ts`.

**Key challenge:** auth.ts imports `prisma` from `'../prisma'`, and email service from `'../services/email/email'`. Both must be mocked to avoid DB connections and SMTP calls in tests.

#### Required Mocks

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import cookieParser from 'cookie-parser'
import authRoutes from './auth'

// Mock Prisma singleton
vi.mock('../prisma', () => ({
  default: {
    users: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    tokens: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
    passwords: {
      deleteMany: vi.fn(),
    },
    userRoles: {
      deleteMany: vi.fn(),
    },
  },
}))

// Mock email service
vi.mock('../services/email/email', () => ({
  sendConfirmEmailToUser: vi.fn().mockResolvedValue(undefined),
  sendRequestInscriptionToAdmin: vi.fn().mockResolvedValue(undefined),
  sendRecoveryToUser: vi.fn().mockResolvedValue(undefined),
}))

// Mock JWT utils (avoid reading key files from disk)
vi.mock('../utils/jwt', () => ({
  generateToken: vi.fn().mockReturnValue('mock-access-token'),
  generateRandomToken: vi.fn().mockReturnValue('mock-random-token'),
  verifyToken: vi.fn().mockReturnValue({ user_id: 1, email: 'test@test.com', isAdmin: false }),
  hashToken: vi.fn().mockImplementation((t: string) => `hashed-${t}`),
}))
```

#### App Setup

```typescript
// Build Express app for testing (mirrors index.ts setup)
const app = express()
app.use(express.json())
app.use(cookieParser())
app.use('/api/auth', authRoutes)
```

#### Import Prisma Mock for Assertions

```typescript
import prisma from '../prisma'
const mockPrisma = prisma as unknown as {
  users: { findUnique: ReturnType<typeof vi.fn>; [k: string]: ReturnType<typeof vi.fn> }
  tokens: { [k: string]: ReturnType<typeof vi.fn> }
  $transaction: ReturnType<typeof vi.fn>
}
```

#### beforeEach — Reset All Mocks

```typescript
beforeEach(() => {
  vi.clearAllMocks()
})
```

---

### auth.test.ts — Test Cases

#### POST /register Tests

```typescript
describe('POST /api/auth/register', () => {
  it('returns 400 with AUTH_005 when fields are missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@test.com' }) // missing firstName, lastName

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('AUTH_005')
    expect(res.body.error).toBeTruthy()
  })

  it('returns 409 with AUTH_006 when email already exists', async () => {
    mockPrisma.users.findUnique.mockResolvedValue({ user_id: 1, email: 'exists@test.com' })

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'exists@test.com', firstName: 'John', lastName: 'Doe' })

    expect(res.status).toBe(409)
    expect(res.body.code).toBe('AUTH_006')
    expect(mockPrisma.users.findUnique).toHaveBeenCalledWith({ where: { email: 'exists@test.com' } })
  })

  it('returns 201 and sends email when email is new', async () => {
    mockPrisma.users.findUnique.mockResolvedValue(null)
    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const result = await fn({
        users: { create: vi.fn().mockResolvedValue({ user_id: 1, email: 'new@test.com', firstName: 'John', lastName: 'Doe' }) },
        tokens: { create: vi.fn().mockResolvedValue({}) },
      })
      return result
    })

    const { sendConfirmEmailToUser } = await import('../services/email/email')

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'new@test.com', firstName: 'John', lastName: 'Doe' })

    expect(res.status).toBe(201)
    expect(res.body.message).toBeTruthy()
    expect(sendConfirmEmailToUser).toHaveBeenCalledOnce()
  })
})
```

#### POST /login — Missing Fields Test

```typescript
describe('POST /api/auth/login', () => {
  it('returns 400 with AUTH_005 when fields are missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com' }) // missing password

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('AUTH_005')
  })
})
```

#### Rate Limiter Test — POST /login

```typescript
describe('POST /api/auth/login rate limiting', () => {
  it('returns 429 after 10 failed login attempts from same IP', async () => {
    // Mock: user not found for all attempts
    mockPrisma.users.findFirst.mockResolvedValue(null)

    // Send 10 requests (at the limit)
    for (let i = 0; i < 10; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' })
    }

    // 11th request should be rate limited
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'wrong' })

    expect(res.status).toBe(429)
    expect(res.body.code).toBe('AUTH_007')
  })
})
```

**Note on rate limiter test isolation:** express-rate-limit uses an in-memory store by default. Between test runs within the same process, the store persists. To isolate rate limit tests, either:
- Put rate limiter tests last in the file
- Or reset the store by recreating the app instance per test (more complex)
- The simplest approach: put all 11 requests in a single test (as shown above)

---

### What NOT to Test in This Story

- Password hashing (`bcrypt.hash`/`bcrypt.compare`) — these are external library functions, not project code
- JWT token generation and verification — mocked in tests; the `jwt.ts` utils can be tested separately if needed
- Email delivery (Nodemailer/Resend) — mocked; tested by verifying `sendConfirmEmailToUser` was called
- Database constraint enforcement — requires real DB; not in scope
- Full login/logout session flow — requires more complex DB mocking; deferred

---

### Critical: Mock File Paths

The mock paths in `vi.mock()` are **relative to the test file location** (`backend/src/routes/auth.test.ts`):
- `'../prisma'` → `backend/src/prisma.ts` ✅
- `'../services/email/email'` → `backend/src/services/email/email.ts` ✅
- `'../utils/jwt'` → `backend/src/utils/jwt.ts` ✅

If the path is wrong, Vitest will load the real module and tests will fail with DB connection errors.

---

### Previous Stories Context

- Story 1.1: Created `vitest.config.ts` + `crypto.test.ts` smoke test
- Story 1.2: Added Winston logger (imported in auth.ts — `vi.mock('../utils/logger')` may be needed if logger tries to write files; Console transport should work in tests without mocking)
- Story 1.3: `findUnique` check in /register (tested in this story)
- Story 1.4: Rate limiters on /login, /register, /password/forgot (tested in this story)
- Story 1.5: `code` field on all errors (tested in this story via AUTH_005, AUTH_006, AUTH_007)

---

### References

- [Source: architecture.md#INFRA-4] Vitest, co-located test files, coverage: auth routes first, then vault
- [Source: project-context.md#Testing Rules] Auth flows require real DB or Prisma mock — use vi.mock
- [Source: backend/src/prisma.ts] `export default prisma` singleton — mock path is `'../prisma'`
- [Source: backend/src/services/email/email.ts] Named exports: `sendConfirmEmailToUser`, `sendRequestInscriptionToAdmin`, `sendRecoveryToUser`
- [Source: story 1.3] `/register` uses `prisma.users.findUnique({ where: { email } })`
- [Source: story 1.4] loginLimiter: 10 req/15min → 11th returns 429 with AUTH_007
- [Source: story 1.5] All errors return `{ error, code }` — AUTH_005, AUTH_006, AUTH_007 testable

## Dev Agent Record

### Agent Model Used

_to be filled by dev agent_

### Debug Log References

### Completion Notes List

### File List

- `backend/src/utils/crypto.test.ts` (MODIFY — add 2 new tests to existing describe block)
- `backend/src/routes/auth.test.ts` (NEW — comprehensive route tests)
- `backend/package.json` (MODIFY — add supertest + @types/supertest devDependencies)
