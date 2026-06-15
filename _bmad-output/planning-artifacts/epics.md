---
stepsCompleted: [1, 2, 3, 4]
status: 'complete'
completedAt: '2026-06-08'
inputDocuments: ['prds/prd-myprout-2026-06-08/prd.md', 'architecture.md', 'project-context.md']
---

# myprout - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for myprout, decomposing the requirements from the PRD, Architecture, and project-context into implementable stories.

---

## Requirements Inventory

### Functional Requirements

FR-1: A Visitor can submit first name, last name, and email to request an account. If the email is already registered (verified or pending), the system returns 409 and does not send another email.
FR-2: A registered Visitor can verify their email address by clicking the link in the verification email. Verification marks is_email_verified: true, deletes the token, and notifies the Admin.
FR-3: The Admin can activate a verified account by sending a time-limited activation link (JWT). The new User follows the link to set their Master Password and security questions.
FR-4: A User can log in with email and Master Password. Login issues an Access Token (JWT, 15 min) and a Refresh Token (random, 7 days, httpOnly cookie). All prior access/refresh/password_reset tokens are invalidated.
FR-5: The client can obtain a new Access Token using the Refresh Token cookie. The Refresh Token is rotated (hash updated in-place) on each successful refresh.
FR-6: A User can log out. All tokens for that user are deleted; the Refresh Token cookie is cleared.
FR-7: A User who has forgotten their Master Password can recover via security questions. Correct answers return the recovery_encrypted_crypto_key and kek_salt.
FR-8: An authenticated User in a Locked Session can re-enter their Master Password to unlock their Vault without re-authenticating.
FR-9: A User can create a Password Entry with title, username, password (encrypted client-side), email, and note.
FR-10: A User can view their Password Entries. The password field is decrypted client-side using the Crypto Key from memory.
FR-11: A User can update any field of a Password Entry or delete it (hard delete — DA-1: is_deleted/deleted_time removed).
FR-12: The Vault displays an alphabetical index (A–Z). Clicking a letter filters entries to those whose title starts with that letter.
FR-13: A User can search entries by title. Search is case-insensitive and returns partial matches.
FR-14: A User can star a Password Entry as a favorite. A toggle filters the Vault to show only starred entries.
FR-15: A User can generate a cryptographically strong password of configurable length and character set.
FR-16: [NON-GOAL for MVP — Phase 2] Breach monitoring via HIBP API with email alerts.
FR-17: The Admin can view all users with their is_email_verified, is_active status, and registration date.
FR-18: The Admin can activate a verified account (triggering activation email) or deactivate an active account (invalidating all tokens).
FR-19: [Phase 2] Browser extension auto-fills credentials on third-party websites.
FR-20: [Phase 2] Browser extension generates strong passwords in password fields.
FR-21: [Phase 3] Windows app provides offline-first Vault access.
FR-22: [Phase 3] Mobile app (iOS/Android) provides offline-first Vault access.
FR-23: [Phase 3] Users can enable 2FA (TOTP via mobile app) for myprout login.
FR-24: [Phase 3] When connectivity restores, local changes sync with server automatically.
FR-25: [Phase 2] A User can import passwords from a CSV file (Chrome/Firefox/LastPass format).
FR-26: [Phase 4] A User can share specific Password Entries with designated family members (read-only).
FR-27: [Phase 4] A User can upload and store encrypted documents (hardware-gated: requires RAID).
FR-28: [Phase 4] Admin-assisted recovery code generated at activation for emergency password reset.
FR-29: [Phase 5] A User with "Game Manager" permission can start/stop registered game servers.
FR-30: [Phase 5] Full email client — send/receive via self-hosted mail server.
FR-31: [Phase 5] Disposable email alias creation and instant revocation.

### Non-Functional Requirements

NFR-SEC-1: All passwords encrypted client-side with AES-256-GCM before transmission. Server never receives plaintext passwords.
NFR-SEC-2: JWT tokens use RS256 (asymmetric). Private key stored in file, path configured via environment variable.
NFR-SEC-3: All tokens stored as SHA-256 hashes in the database. Access tokens validated against DB on every request.
NFR-SEC-4: PBKDF2 parameters (310,000 iterations, 32-byte key, SHA-256) identical between WebCrypto API (frontend) and Node.js crypto (backend).
NFR-SEC-5: CORS restricted to known origins: localhost:5173, localhost:3000, https://myprout.fr.
NFR-SEC-6: Refresh Token stored in httpOnly, SameSite=Strict cookie. Secure flag enabled in production.
NFR-SEC-7: Rate limiting on auth endpoints (login, registration, password reset). Implemented via express-rate-limit.
NFR-SEC-8: nginx reverse proxy with TLS termination (Let's Encrypt) in front of Express server.
NFR-REL-1: Service stable under ~50 users, low concurrency. Unexpected crashes logged and auto-restarted (Docker restart: always).
NFR-REL-2: Weekly automated backup of the database via cron job (mysqldump). Recovery from backup possible within 2 hours.
NFR-REL-3: Docker image enables full re-deployment on a new machine within 30 minutes.
NFR-PERF-1: API response time for Vault operations under 200ms on local network.
NFR-PERF-2: Frontend usable on standard household computers and mid-range smartphones.
NFR-PRIV-1: No telemetry, analytics, or data sent to any third-party service.
NFR-PRIV-2: No user data stored outside the self-hosted instance.
NFR-UX-1: A new user can complete account activation and add their first password without external help.
NFR-UX-2: Vault navigable on mobile browsers (responsive layout).

### Additional Requirements (from Architecture)

- DA-1: Remove is_deleted and deleted_time fields from Prisma passwords model. Hard delete only.
- SEC-1: Implement express-rate-limit middleware (loginLimiter: 10/15min/IP, registerLimiter: 5/60min/IP, apiLimiter: 100/60s/IP) in src/middlewares/rateLimiter.ts.
- SEC-2: Configure nginx as reverse proxy with Let's Encrypt TLS. nginx serves frontend static files and proxies /api to Express port 3000.
- API-2: Standardize error response format to { error: 'message', code: 'DOMAIN_NNN' }. Error code registry: AUTH_001-099, VAULT_001-099, ADMIN_001-099, SERVER_001-099.
- INFRA-2: Create docker-compose.yml with 3 services: backend (Express), db (MySQL), nginx (proxy + TLS + static).
- INFRA-3: Add Winston logger instance at src/utils/logger.ts. Replace all console.log/error in production code.
- INFRA-4: Configure Vitest. Test files co-located with source (auth.test.ts, crypto.test.ts). Coverage priority: auth routes, then crypto utils, then vault routes.
- INFRA-5: Create .env.example with all required variable names. Variables: DATABASE_URL, JWT_PRIVATE_KEY_PATH, JWT_PUBLIC_KEY_PATH, NODE_ENV.
- BACKUP: Create scripts/backup.sh cron script for weekly mysqldump.

### UX Design Requirements

N/A — No UX design document provided. Frontend follows existing Vue 3 component patterns documented in project-context.md.

### FR Coverage Map

FR-1: Epic 1 — Unique email registration, spam protection (new work)
FR-2: Already implemented — Email verification flow
FR-3: Already implemented — Admin account activation
FR-4: Already implemented — Login with dual-token session
FR-5: Already implemented — Silent token refresh
FR-6: Already implemented — Logout
FR-7: Already implemented — Password recovery via security questions
FR-8: Already implemented — Vault unlock
FR-9: Already implemented — Create Password Entry
FR-10: Already implemented — View and decrypt Password Entry
FR-11: Epic 2 — Edit/Delete (modify for hard delete after DA-1 schema cleanup)
FR-12: Already implemented — Alphabetical index navigation
FR-13: Already implemented — Search
FR-14: Epic 2 — Favorites filter (make functional, currently cosmetic)
FR-15: Already implemented — Password generator
FR-16: Deferred Phase 2 — Breach monitoring
FR-17: Already implemented — Admin user list
FR-18: Already implemented — Admin activate/deactivate
FR-19 to FR-31: Deferred Phases 2–5
DA-1: Epic 2 — Remove is_deleted/deleted_time from Prisma schema
SEC-1: Epic 1 — Rate limiting middleware
SEC-2: Epic 3 — nginx + TLS Let's Encrypt
API-2: Epics 1 & 2 — Standardized error format { error, code }
INFRA-2: Epic 3 — docker-compose (backend + db + nginx)
INFRA-3: Epic 1 — Winston logger
INFRA-4: Epic 1 — Vitest setup + auth/crypto tests
INFRA-5: Epic 1 — .env.example
BACKUP: Epic 3 — Weekly cron backup script

## Epic List

### Epic 1: Hardened Authentication
Users can register, log in, and manage their accounts with robust security — no spam, no brute force, with observable behavior via structured logs and error codes. Development tooling (Vitest, Winston) is established as a quality gate for all future work.
**FRs covered:** FR-1, SEC-1, API-2 (auth routes), INFRA-3, INFRA-4, INFRA-5

### Epic 2: Complete Vault Experience
Users can fully use the password manager with all features working correctly — favorites are filterable, passwords are properly deleted, and the schema is clean. The UI is coherent with the logout button in the right place.
**FRs covered:** FR-11 (hard delete), FR-14 (favorites filter), DA-1, API-2 (vault routes), UX logout button fix

### Epic 3: Production Launch
myprout is live on myprout.fr, containerized via Docker, protected by TLS, auto-restarting on crash, and backed up weekly. Any family member can access it from anywhere.
**FRs covered:** INFRA-2 (docker-compose), SEC-2 (nginx + TLS), BACKUP (cron mysqldump), NFR-REL validation

---

## Epic 1: Hardened Authentication

Users can register, log in, and manage their accounts with robust security — no spam, no brute force, with observable behavior via structured logs and standardized error codes. Development tooling (Vitest, Winston) is established as a quality gate for all future work.

### Story 1.1: Set Up Development Quality Tools

As a developer,
I want Vitest configured and a .env.example file in place,
So that I can write automated tests and onboard new environments easily.

**Acceptance Criteria:**

**Given** the backend directory
**When** I run `npx vitest run`
**Then** all tests pass with exit code 0
**And** vitest.config.ts is present at backend/vitest.config.ts
**And** at least one passing test exists (crypto utility smoke test)

**Given** a developer setting up a new environment
**When** they read .env.example at the project root
**Then** they find all required variables listed: DATABASE_URL, JWT_PRIVATE_KEY_PATH, JWT_PUBLIC_KEY_PATH, NODE_ENV
**And** no secret values are present in the file

---

### Story 1.2: Add Structured Logging with Winston

As a developer,
I want all backend logs going through Winston,
So that production logs are structured, leveled, and never expose secrets.

**Acceptance Criteria:**

**Given** src/utils/logger.ts
**When** imported in any backend file
**Then** it exports a Winston logger with levels: error, warn, info, debug
**And** logs are written to console (captured by Docker)

**Given** the auth routes (auth.ts) and server entry (index.ts)
**When** any console.log or console.error currently exists
**Then** it is replaced with logger.info / logger.error / logger.warn
**And** no password, token, or crypto key value appears in any log output

---

### Story 1.3: Fix Email Registration Spam Vulnerability

As a visitor,
I want to register only if my email is not already in the system,
So that my inbox is not spammed by multiple confirmation emails.

**Acceptance Criteria:**

**Given** a POST /api/auth/register request
**When** the email already exists in the users table (verified or not)
**Then** the server returns HTTP 409
**And** no new email_verification token is created
**And** no email is sent to that address

**Given** a POST /api/auth/register request
**When** the email does not exist in the users table
**Then** a new user is created with is_email_verified: false
**And** an email_verification token is created
**And** a confirmation email is sent exactly once

---

### Story 1.4: Add Rate Limiting to Auth Endpoints

As a system administrator,
I want rate limiting on authentication endpoints,
So that brute force and spam attacks are automatically blocked.

**Acceptance Criteria:**

**Given** src/middlewares/rateLimiter.ts
**When** imported in auth routes
**Then** loginLimiter (10 req/15min/IP), registerLimiter (5 req/60min/IP), and apiLimiter (100 req/60s/IP) are exported as named functions

**Given** POST /api/auth/login called 11 times from the same IP within 15 minutes
**When** the 11th request arrives
**Then** the server returns HTTP 429
**And** a retry-after header is present

**Given** POST /api/auth/register called 6 times from the same IP within 60 minutes
**When** the 6th request arrives
**Then** the server returns HTTP 429

---

### Story 1.5: Standardize Auth Error Response Codes

As a developer,
I want all auth route errors to include a machine-readable error code,
So that frontend clients can handle specific error cases programmatically.

**Acceptance Criteria:**

**Given** any error response from /api/auth/* routes
**When** the response body is parsed
**Then** it contains both an `error` string (human-readable) and a `code` string in format AUTH_NNN
**And** the following codes are defined and used:
- AUTH_001 — invalid credentials
- AUTH_002 — token expired
- AUTH_003 — missing token
- AUTH_004 — revoked token
- AUTH_005 — missing required fields
- AUTH_006 — email already registered

**Given** a successful response from any auth route
**When** the response body is parsed
**Then** it does NOT contain an `error` or `code` field

---

### Story 1.6: Write Auth and Crypto Test Coverage

As a developer,
I want automated tests for the auth routes and crypto utilities,
So that regressions in critical security code are caught before deployment.

**Acceptance Criteria:**

**Given** backend/src/routes/auth.test.ts
**When** vitest runs
**Then** tests cover: duplicate email returns 409, valid registration creates user + token, rate limiter returns 429 after threshold

**Given** backend/src/utils/crypto.test.ts
**When** vitest runs
**Then** tests cover: encryptCryptoKey/decryptCryptoKey roundtrip produces original value, PBKDF2 produces consistent output for same inputs, different passwords produce different KEKs

**Given** all test files
**When** `npx vitest run` is executed
**Then** all tests pass with no failures

---

## Epic 2: Complete Vault Experience

Users can fully use the password manager with all features working correctly — favorites are filterable, passwords are properly deleted, and the schema is clean. The UI is coherent with the logout button in the right place.

### Story 2.1: Remove Soft Delete from Password Schema

As a developer,
I want the passwords table schema cleaned up,
So that the codebase does not carry unused complexity.

**Acceptance Criteria:**

**Given** the Prisma schema file (backend/prisma/schema.prisma)
**When** the migration is applied
**Then** the passwords model no longer contains is_deleted or deleted_time fields
**And** a Prisma migration file exists documenting this change
**And** the backend compiles without TypeScript errors referencing these fields

**Given** existing password records in the database
**When** the migration runs
**Then** no data loss occurs for other fields (title, username, password, etc.)

---

### Story 2.2: Implement Hard Delete for Password Entries

As a user,
I want to permanently delete a password entry,
So that removed entries are fully gone and not just hidden.

**Acceptance Criteria:**

**Given** an authenticated user with at least one password entry
**When** they send DELETE /api/passwords/:id
**Then** the entry is permanently removed from the database (prisma.passwords.delete)
**And** subsequent GET /api/passwords returns the remaining entries without the deleted one
**And** the server returns HTTP 200 with a success message

**Given** a DELETE request for a password_id that does not belong to the user
**When** the request is processed
**Then** the server returns HTTP 403 with code VAULT_003

---

### Story 2.3: Make Favorites Filter Functional

As a user,
I want to filter my vault to show only starred entries,
So that I can quickly find my most-used passwords.

**Acceptance Criteria:**

**Given** the Vault view with at least two entries (one starred, one not)
**When** I click the favorites filter toggle
**Then** only entries with is_stared: true are displayed
**And** the toggle visually indicates the active filter state

**Given** the favorites filter is active
**When** I click the toggle again
**Then** all entries are displayed again (filter deactivated)
**And** the toggle returns to its inactive visual state

**Given** a user with no starred entries
**When** they activate the favorites filter
**Then** an empty state is shown (no entries, no error)

---

### Story 2.4: UX Polish and Vault Error Codes

As a user,
I want the logout button in an intuitive location and clear error messages in the vault,
So that I can navigate myprout confidently without confusion.

**Acceptance Criteria:**

**Given** the authenticated app layout
**When** a user looks for the logout button
**Then** it is located in the navbar or user profile area (not buried in settings)
**And** it is visible without scrolling on both desktop and mobile

**Given** any error response from /api/passwords/* routes
**When** the response body is parsed
**Then** it contains both an `error` string and a `code` string in format VAULT_NNN
**And** the following codes are used:
- VAULT_001 — missing required fields
- VAULT_002 — entry not found
- VAULT_003 — unauthorized (entry belongs to another user)

**Given** vault error codes received by the frontend
**When** displayed to the user
**Then** the error message is human-readable (the `error` field, not the code)

---

## Epic 3: Production Launch

myprout is live on myprout.fr, containerized via Docker, protected by TLS, auto-restarting on crash, and backed up weekly. Any family member can access it from anywhere.

### Story 3.1: Dockerize the Application

As a developer,
I want myprout packaged as a Docker Compose application,
So that the entire stack can be deployed or restored with a single command.

**Acceptance Criteria:**

**Given** the project root
**When** `docker compose up -d` is run
**Then** three containers start: backend (Express), db (MySQL), nginx
**And** the backend container connects to MySQL via the db service hostname
**And** all services have `restart: always` policy
**And** a Dockerfile exists at backend/Dockerfile building the Express app

**Given** a new machine with Docker installed
**When** .env is configured and `docker compose up -d` is run
**Then** myprout is fully operational within 30 minutes

---

### Story 3.2: Configure nginx Reverse Proxy with TLS

As a user,
I want to access myprout via HTTPS at myprout.fr,
So that my connection is encrypted and the app feels professional.

**Acceptance Criteria:**

**Given** nginx/nginx.conf
**When** the nginx container starts
**Then** HTTP requests to port 80 are redirected to HTTPS (301)
**And** HTTPS requests to /api/* are proxied to the backend container on port 3000
**And** HTTPS requests to all other paths serve the frontend build (dist/) as static files
**And** TLS is terminated at nginx (Express receives plain HTTP internally)

**Given** the domain myprout.fr pointed to the server
**When** certbot runs
**Then** a valid Let's Encrypt certificate is obtained and stored in the certbot volume
**And** nginx serves with valid TLS (no browser security warnings)
**And** a renewal hook auto-renews the certificate before expiry

---

### Story 3.3: Set Up Automated Database Backup

As a system administrator,
I want an automated weekly database backup,
So that I can recover from hardware failure without losing more than 7 days of data.

**Acceptance Criteria:**

**Given** scripts/backup.sh at the project root
**When** executed
**Then** it runs mysqldump against the db container
**And** saves a timestamped .sql.gz file to a local backup directory
**And** exits with code 0 on success

**Given** a cron job configured on the host machine
**When** it runs weekly (e.g. every Sunday at 3:00 AM)
**Then** backup.sh executes automatically
**And** a new backup file is created with the current timestamp in the filename

**Given** a backup file created by backup.sh
**When** it is restored with `mysql < backup.sql`
**Then** the database is fully recovered with all tables and data intact

---

### Story 3.4: Validate Production Deployment

As a system administrator,
I want to verify that the production deployment is healthy and resilient,
So that I am confident myprout can be relied upon by my family.

**Acceptance Criteria:**

**Given** myprout running in production (`docker compose up -d`)
**When** I visit https://myprout.fr
**Then** the login page loads over HTTPS with a valid certificate
**And** no browser security warnings are shown

**Given** the backend container is killed manually
**When** Docker detects the container has stopped
**Then** it automatically restarts within 30 seconds (restart: always policy)
**And** the service is accessible again without manual intervention

**Given** the frontend build is regenerated (`npm run build` in frontend/)
**When** the dist/ folder is updated in the nginx static files location
**Then** the updated UI is served immediately without restarting containers

**Given** the .env file and a fresh machine with Docker
**When** the project is cloned and `docker compose up -d` is run
**Then** the full stack is online within 30 minutes
