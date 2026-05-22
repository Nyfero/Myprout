# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**myprout** is a self-hosted password manager with end-to-end client-side encryption. Users' passwords are encrypted in the browser using AES-256-GCM before being sent to the server — the server never sees plaintext passwords.

## Commands

### Development (from root)
```bash
npm run dev          # starts both frontend (port 5173) and backend (port 3000) via concurrently
npm start            # production start via start.js
```

### Backend only (from `backend/`)
```bash
npm run dev                # nodemon on src/index.js
npm run prisma:migrate     # run Prisma migrations
npm run prisma:studio      # open Prisma Studio GUI
```

### Frontend only (from `frontend/`)
```bash
npm run dev        # Vite dev server
npm run build      # production build
npm run preview    # preview production build
```

## Architecture

### Stack
- **Backend**: Express 5 + TypeScript (ESM), Prisma ORM, MySQL — runs on port 3000
- **Frontend**: Vue 3 + Vite + Pinia + Vue Router — runs on port 5173
- **Email**: Nodemailer + Resend for transactional emails

### Backend route structure (`backend/src/`)
| Route prefix | File | Purpose |
|---|---|---|
| `/api/auth` | `routes/auth.ts` | Registration, login, token refresh, password reset, account deletion |
| `/api/admin` | `routes/admin.ts` | Approve/reject pending users (admin only) |
| `/api/passwords` | `routes/passwords.ts` | CRUD for encrypted password entries + logo proxy |

### Auth & token model
- **Access tokens**: short-lived JWT (15 min), sent in `Authorization: Bearer` header
- **Refresh tokens**: random token stored as SHA hash in DB, sent via `httpOnly` cookie (7 days)
- Every token (access and refresh) is stored hashed in the `tokens` table and validated on each request — tokens are effectively revocable
- `authMiddleware.ts` checks both JWT signature and DB existence of the hashed token
- `isAdmin.ts` middleware reads `req.user.isAdmin` set by `authMiddleware`

### Registration flow (multi-step, requires admin approval)
1. User submits name + email → unverified record created + verification email sent
2. User clicks email link → `POST /auth/verify-email` → admin notified
3. Admin approves via `/api/admin/approve/:user_id` → activation email with JWT token sent to user
4. User visits activation link → `POST /auth/activate` with password + security questions → account becomes active
5. User can now log in

### Client-side encryption architecture
This is the most critical part of the codebase:

- Each user has a random 256-bit **`crypto_key`** (the master key, stored encrypted in DB)
- The `crypto_key` is encrypted at rest using a **KEK** (Key Encryption Key) derived from the user's password via PBKDF2 (310,000 iterations, SHA-256)
- On login, the frontend derives the KEK from the entered password + `kek_salt`, decrypts the `crypto_key`, and holds it in memory in `authStore.crypto_key` (a `CryptoKey` WebCrypto object, never serialized)
- Individual password entries are encrypted/decrypted in `frontend/src/utils/crypto.js` using `encryptPassword` / `decryptPassword`
- A **recovery path** exists: security question answers are concatenated and used to derive a separate `recoveryKek`, which encrypts a copy of the `crypto_key` as `recovery_encrypted_crypto_key`
- Backend crypto lives in `backend/src/utils/crypto.ts` (Node `crypto` module); frontend crypto in `frontend/src/utils/crypto.js` (WebCrypto API) — both use AES-256-GCM with the same `iv:tag:ciphertext` hex format

### Lock mechanism
`authStore.isLocked` is true when `isAuthenticated && !crypto_key`. This happens after page refresh — the user is still authenticated (via refresh token cookie) but the `crypto_key` is gone from memory. The router redirects locked users to `/unlock` (UnlockView), which prompts for the password to re-derive and restore the `crypto_key`.

### Frontend state (`frontend/src/stores/authStore.js`)
- `initAuth()` is called once on first navigation — attempts token refresh to restore session
- `login()` stores user data in `localStorage` (not the crypto_key — that stays only in Pinia memory)
- 20-minute inactivity timeout via `useInactivity.js` composable triggers full logout

### API client (`frontend/src/services/api.js`)
Axios instance with two interceptors:
1. Request: attaches `Authorization: Bearer <token>` from store
2. Response: on 401, queues concurrent requests and attempts token refresh; redirects to `/login` on refresh failure

**Important**: `baseURL` is hardcoded to `http://localhost:3000/api` — must be updated for production deployment.

## Environment variables (backend)

Required in `backend/.env`:
```
DATABASE_URL=mysql://...
JWT_SECRET=...
LOGO_DEV_TOKEN=...     # logo.dev API for favicon proxy
```
Plus Nodemailer/Resend config (see `backend/src/services/email/email.ts`).

## Database

Prisma schema at `backend/prisma/schema.prisma`. Key models:
- `users` — holds `encrypted_crypto_key`, `kek_salt`, `recovery_questions` (bcrypt-hashed answers), `recovery_encrypted_crypto_key`
- `tokens` — stores all tokens as hashes with a `type` discriminator (`email_verification`, `activate`, `access`, `refresh`, `password_reset`)
- `passwords` — encrypted password entries (fields like `password`, `username`, `note` contain ciphertext)
- `roles` / `userRoles` — simple RBAC; role `Admin` (role_id=1) grants admin access
