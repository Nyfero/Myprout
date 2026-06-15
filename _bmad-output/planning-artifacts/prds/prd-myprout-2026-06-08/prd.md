---
title: myprout — Personal Digital Sovereignty Platform
status: final
created: 2026-06-08
updated: 2026-06-08
---

# PRD: myprout

## 0. Document Purpose

This PRD is written for Gaetan (product owner, sole developer, and primary admin) and serves as the authoritative reference for all downstream work: architecture decisions, epics, stories, and implementation. It documents the complete vision for myprout across all planned phases, with a clear MVP scope that identifies what ships first. The Glossary defines all domain terms used throughout; FRs use those terms verbatim. Assumptions inferred during drafting are tagged `[ASSUMPTION]` and indexed in §9.

---

## 1. Vision

myprout is a self-hosted personal digital sovereignty platform. It is the single place where Gaetan and his family store passwords, documents, and digital assets — with full end-to-end encryption, hosted on Gaetan's own machine, with no dependency on any third-party cloud service. Every byte of data stays on-premise.

The core thesis: commercial password managers and cloud storage ask users to trust a company with their most sensitive data. myprout inverts that relationship — the user owns the server, the encryption keys, and every piece of data. If the company behind LastPass gets breached, that's someone else's problem. If myprout gets breached, it's Gaetan's problem — and he has the code, the keys, and the access to fix it.

The platform grows in phases: starting as a professional-grade password manager (Phase 0–2), expanding to a multi-platform ecosystem (Phase 3), then to a full family digital hub (Phase 4), and ultimately to owning even the family's email infrastructure (Phase 5). The Docker-packaged deployment means the entire platform can be spun up on any machine in minutes — making disaster recovery and hardware migration a non-event.

---

## 2. Target User

### 2.1 Jobs To Be Done

**Gaetan (Admin & Power User)**
- Store all passwords in one place I own, without trusting a corporation with my data
- Access passwords effortlessly via browser auto-fill — no more typing
- Know immediately when one of my passwords has been compromised
- Manage my home infrastructure (game servers) without being on-call for friends
- Have a professional portfolio piece that demonstrates full-stack + security competence

**Family & Friends (Standard Users — max ~50 total)**
- Find and use passwords without needing to ask Gaetan for help
- Migrate existing passwords from browser/LastPass without pain
- Access myprout from any device (web, Windows, mobile) with the same experience
- Trust that their data is private — not sold, not analyzed, not stored abroad

### 2.2 Non-Users (v1)
- General public — myprout is invitation-only, admin-gated registration
- Enterprise teams — no multi-tenant architecture, no SSO, no audit logs
- Users who need anonymous sign-up — registration requires admin approval

### 2.3 Key User Journeys

- **UJ-1. Gaetan logs into a website without typing his password.**
  - **Persona:** Gaetan, on his desktop, browsing normally.
  - **Entry state:** Authenticated in myprout, extension installed and active.
  - **Path:** Navigates to a login form → extension detects the domain → offers to fill credentials → Gaetan clicks fill → credentials populated.
  - **Climax:** Logged in without opening myprout or typing anything.
  - **Resolution:** Session open; password usage logged.
  - **Edge case:** If no password exists for the domain, extension offers to save the credentials just entered.

- **UJ-2. Family member adds a new account and saves the password.**
  - **Persona:** Marie (Gaetan's mother, comfortable with computers), creating a new Netflix account.
  - **Entry state:** Authenticated in myprout web, extension installed.
  - **Path:** Visits Netflix sign-up → extension suggests a strong generated password → Marie accepts → account created → extension prompts to save → Marie confirms.
  - **Climax:** New password saved to myprout, encrypted, accessible from any device.
  - **Resolution:** Password visible in myprout vault under "N".
  - **Edge case:** If Marie dismisses the save prompt, she can manually add it via myprout.

- **UJ-3. Thomas migrates his Chrome passwords to myprout.**
  - **Persona:** Thomas (Gaetan's friend), switching from Chrome's built-in password manager.
  - **Entry state:** Authenticated in myprout. Has exported his Chrome passwords as CSV.
  - **Path:** Opens myprout settings → finds Import → uploads CSV → myprout parses and previews entries → Thomas confirms → passwords imported and encrypted.
  - **Climax:** 47 passwords now in myprout, all encrypted with Thomas's key.
  - **Resolution:** Thomas no longer depends on Chrome sync.

- **UJ-4. A friend starts a game server without calling Gaetan.**
  - **Persona:** Kevin, wants to play with friends on a game server hosted on Gaetan's machine.
  - **Entry state:** Authenticated in myprout, has "Game Manager" permission.
  - **Path:** Opens Game Server panel → sees server status (offline) → clicks Start → server starts → status updates to "online".
  - **Climax:** Server online, Kevin and friends can connect. Gaetan's PC not disturbed.
  - **Resolution:** Kevin can stop the server when done.

---

## 3. Glossary

- **Crypto Key** — A 256-bit AES-GCM key unique to each User, stored encrypted in the database. The raw key is never stored; it exists in memory only while the User is authenticated and unlocked.
- **KEK (Key Encryption Key)** — A key derived from the User's Master Password via PBKDF2 (310,000 iterations, SHA-256), used to encrypt and decrypt the Crypto Key.
- **Master Password** — The primary secret a User chooses at account activation. Never stored; used only to derive the KEK at login time.
- **Vault** — The collection of all Password Entries belonging to a User.
- **Password Entry** — A record in the Vault containing a site title, username, password (encrypted), email, and optional note.
- **Token** — A server-issued credential. All tokens (Access, Refresh, Email Verification, Activate, Password Reset) are stored as SHA-256 hashes in the database, never in plaintext.
- **Access Token** — A short-lived JWT (RS256, 15 min) authorizing API requests. Verified by signature AND database presence.
- **Refresh Token** — A long-lived random token (7 days) stored in an httpOnly cookie, used to obtain new Access Tokens silently.
- **Admin** — A User with elevated permissions. Can activate accounts, manage users, and access the admin panel.
- **Locked Session** — State where a User is authenticated (valid Refresh Token) but the Crypto Key is not in memory. Requires password re-entry to unlock.
- **Breach** — A known data leak exposing a password, detected via the Have I Been Pwned (HIBP) API.
- **Extension** — The myprout browser extension enabling auto-fill and password generation on third-party websites.
- **Self-hosted** — Running on infrastructure owned and operated by the admin (Gaetan's personal machine), not a cloud provider.

---

## 4. Features

### 4.1 User Registration & Authentication

**Description:** myprout uses an admin-gated, multi-step registration flow. A visitor submits their name and email; they receive a verification email. Once they verify, the admin is notified and can activate the account. Activation sends the new user a time-limited link to set their Master Password and security questions — which simultaneously derives their KEK and generates their Crypto Key. Login issues a short-lived Access Token and long-lived Refresh Token; the Refresh Token is rotated on each use. All tokens are stored as hashes in the database for full revocability. Realizes UJ-1, UJ-2, UJ-3.

**Functional Requirements:**

#### FR-1: Unique-email registration with spam protection
A Visitor can submit their first name, last name, and email address to request an account. If the email is already registered (verified or pending), the system returns a 409 and does not send another email, preventing email spam attacks.

**Consequences (testable):**
- Submitting an email already in the `users` table returns HTTP 409.
- A new `email_verification` token is created only when no user with that email exists.
- The verification email is sent exactly once per registration attempt.

#### FR-2: Email verification
A registered Visitor can verify their email address by clicking the link in the verification email. Verification marks `is_email_verified: true` and notifies the Admin.

**Consequences (testable):**
- Clicking the verification link sets `is_email_verified: true`.
- The `email_verification` token is deleted after use.
- Re-clicking an already-used link returns an error.

#### FR-3: Admin account activation
The Admin can activate a verified account by sending an activation link (JWT, time-limited). The new User follows the link to set their Master Password and security questions, completing account setup.

**Consequences (testable):**
- Expired activation links return HTTP 401.
- On activation, `is_active: true`, `password_hash`, `encrypted_crypto_key`, `kek_salt`, and `recovery_questions` are all set in a single transaction.
- The `activate` token is deleted after use.

#### FR-4: Login with dual-token session
A User can log in with email and Master Password. Login issues an Access Token (JWT, 15 min) and a Refresh Token (random, 7 days, httpOnly cookie). All prior access/refresh/password_reset tokens for the user are invalidated.

**Consequences (testable):**
- Failed login (wrong password or inactive account) returns HTTP 401/403 without distinguishing the cause to the client.
- The Refresh Token is stored as a SHA-256 hash in the `tokens` table.
- Prior tokens of types `access`, `refresh`, `password_reset` are deleted on login.

#### FR-5: Silent token refresh
The client can obtain a new Access Token using the Refresh Token cookie. The Refresh Token is rotated (hash updated in-place) on each successful refresh.

**Consequences (testable):**
- A valid Refresh Token returns a new Access Token and rotates the Refresh Token hash.
- An expired or unknown Refresh Token returns HTTP 401 and clears the cookie.

#### FR-6: Logout
A User can log out. All tokens for that user are deleted; the Refresh Token cookie is cleared.

**Consequences (testable):**
- After logout, the previous Refresh Token returns HTTP 401 on all subsequent requests.

#### FR-7: Password recovery via security questions
A User who has forgotten their Master Password can initiate recovery using their security questions. Answering correctly returns the `recovery_encrypted_crypto_key`, allowing the client to decrypt the Crypto Key and re-encrypt it under a new Master Password.

**Consequences (testable):**
- Incorrect answers return HTTP 401 without revealing which questions were wrong.
- Correct answers return `recovery_encrypted_crypto_key` and `kek_salt`.
- The recovery KEK is derived from concatenated question answers (lowercased, no spaces).

#### FR-8: Vault unlock
An authenticated User in a Locked Session can re-enter their Master Password to unlock their Vault without re-authenticating.

**Consequences (testable):**
- An incorrect unlock password returns HTTP 401.
- A successful unlock makes the Crypto Key available in the client's memory.

---

### 4.2 Password Vault

**Description:** The Vault is the heart of myprout. Each User has a private, encrypted Vault. Password Entries are encrypted client-side with the User's Crypto Key before transmission. The server stores only ciphertext. Users can create, view, edit, delete, and search entries. Entries are organized by first letter of the title (alphabetical index) and can be starred as favorites. Realizes UJ-1, UJ-2, UJ-3.

**Functional Requirements:**

#### FR-9: Create Password Entry
A User can create a Password Entry with title, username, password, email, and note. The password field is encrypted client-side with the User's Crypto Key before being sent to the server.

**Consequences (testable):**
- The server stores only the ciphertext of the password field.
- A new entry appears in the alphabetical index under its title's first letter.

#### FR-10: View and decrypt Password Entry
A User can view their Password Entries. The password field is decrypted client-side using the Crypto Key from memory.

**Consequences (testable):**
- Decryption fails gracefully if the Crypto Key is not in memory (redirects to Unlock).
- The decrypted value is never sent to the server.

#### FR-11: Edit and Delete Password Entry
A User can update any field of a Password Entry or soft-delete it (`is_deleted: true`, with `deleted_time` timestamp).

**Consequences (testable):**
- Soft-deleted entries do not appear in the default Vault view.
- [ASSUMPTION: Permanently deleted entries can be hard-deleted by Admin only.]

#### FR-12: Alphabetical index navigation
The Vault displays an alphabetical index (A–Z). Clicking a letter filters entries to those whose title starts with that letter.

**Consequences (testable):**
- Clicking "Y" shows only entries with titles starting with "Y".

#### FR-13: Search
A User can search entries by title. Search is case-insensitive and returns partial matches.

**Consequences (testable):**
- Searching "you" returns entries with "YouTube", "YouPorn", etc.

#### FR-14: Favorites filter
A User can star a Password Entry as a favorite. A toggle in the UI filters the Vault to show only starred entries.

**Consequences (testable):**
- Toggling the favorites filter shows only entries with `is_stared: true`.
- Un-starring an entry removes it from the favorites view.

#### FR-15: Strong password generator
A User can generate a cryptographically strong password of configurable length and character set within myprout.

**Consequences (testable):**
- Generated passwords use `crypto.getRandomValues` (frontend) or `crypto.randomBytes` (backend equivalent).
- [ASSUMPTION: Minimum length 12, default 20 characters, includes uppercase, lowercase, digits, symbols.]

#### FR-16: Breach monitoring
[NON-GOAL for MVP — see Phase 2.] The system periodically checks stored passwords against the Have I Been Pwned API and sends an email alert when a breach is detected.

---

### 4.3 Admin Panel

**Description:** The Admin (Gaetan) has access to a panel showing all registered users, their activation status, and controls to activate or deactivate accounts. Emergency account management is done directly via database access for critical incidents. Realizes admin operations.

**Functional Requirements:**

#### FR-17: User list and status
The Admin can view all users with their `is_email_verified`, `is_active` status, and registration date.

#### FR-18: Account activation / deactivation
The Admin can activate a verified account (triggering the activation email) or deactivate an active account (setting `is_active: false`, invalidating all tokens).

**Consequences (testable):**
- Deactivated users cannot log in (HTTP 403).
- Deactivation invalidates all existing tokens for that user.

---

### 4.4 Browser Extension

**Description:** [Phase 2] A browser extension for Chrome/Firefox that auto-fills credentials on third-party websites and generates strong passwords at account creation. The extension communicates with the myprout backend using the user's active session. Realizes UJ-1, UJ-2.

**Functional Requirements:**

#### FR-19: Auto-fill detection and injection
The extension detects login forms on visited pages and offers to fill credentials from the Vault if a matching entry exists for that domain.

#### FR-20: In-extension password generator
The extension can generate a strong password directly in a password field, with an option to save the new entry to the Vault.

**Notes:** [NOTE FOR PM] Extension architecture (content scripts, service workers, manifest v3) is a significant technical scope. Architecture doc should detail this before story creation.

---

### 4.5 Multi-Platform Applications

**Description:** [Phase 3] A Windows desktop application and a mobile application (iOS/Android) provide offline-first access to the Vault. Local data is synchronized with the myprout backend when online. The mobile app also serves as the 2FA authenticator for myprout login. Realizes UJ-1, UJ-2.

**Functional Requirements:**

#### FR-21: Windows app — offline Vault access
The Windows app stores an encrypted local copy of the Vault. Users can view and use passwords when the myprout server is unreachable.

#### FR-22: Mobile app — offline Vault access
The mobile app (iOS/Android) provides the same offline-first Vault access as the Windows app.

#### FR-23: Two-factor authentication for myprout
[ASSUMPTION: 2FA is TOTP-based, generated by the myprout mobile app.] Users can optionally enable 2FA for their myprout login. The mobile app generates TOTP codes. Required for Admin account.

#### FR-24: Automatic sync
When connectivity is restored, local changes are synchronized with the server, with conflict resolution favoring the most recent change.

---

### 4.6 Password Import

**Description:** [Phase 2] Users can import existing passwords from a CSV file exported by Chrome, Firefox, or LastPass. The import preview allows users to review entries before confirming. Realizes UJ-3.

**Functional Requirements:**

#### FR-25: CSV import
A User can upload a CSV file in standard browser/LastPass export format. The system parses, deduplicates, and presents a preview. On confirmation, entries are encrypted and added to the Vault.

**Consequences (testable):**
- Duplicate entries (same title + username) are flagged in the preview.
- Failed rows (malformed CSV) are surfaced without blocking the rest of the import.

---

### 4.7 Family Platform Features

**Description:** [Phase 4] Multi-user family features including shared Vault access, document storage (hardware-gated), and emergency account recovery. Realizes UJ-2, UJ-4.

**Functional Requirements:**

#### FR-26: Shared family Vault entries
[ASSUMPTION: Sharing is entry-level, not full-Vault.] A User can share specific Password Entries with designated family members. Shared entries appear in the recipient's Vault read-only.

#### FR-27: Document Vault
[Hardware-gated: requires dedicated storage (RAID array).] A User can upload and store encrypted documents (PDF, images) in myprout. Documents are encrypted client-side with the User's Crypto Key.

#### FR-28: Admin-assisted account recovery
At account activation, a recovery code is generated and sent to the Admin. If a User loses both Master Password and security questions, the Admin can use the recovery code to initiate a reset — subject to the User confirming via email.

**Notes:** [NOTE FOR PM] The fundamental limitation: the Crypto Key is derived from the Master Password. If that is lost and security questions fail, encrypted vault contents are irrecoverable. This should be communicated clearly to users at activation.

---

### 4.8 Infrastructure Management

**Description:** [Phase 5] A control panel allowing authorized friends to start and stop game servers hosted on Gaetan's machine, without requiring Gaetan's involvement. Realizes UJ-4.

**Functional Requirements:**

#### FR-29: Game server start/stop
A User with "Game Manager" permission can view the status of registered game servers and start/stop them via the myprout UI.

**Consequences (testable):**
- Server actions are logged with user, timestamp, and action.
- Only users with the "Game Manager" role can access this panel.

---

### 4.9 Sovereign Mail

**Description:** [Phase 5 — Long-term vision.] A full email client integrated into myprout, hosted on Gaetan's machine. Includes creation of disposable/revocable email addresses to protect against spam and tracking.

**Functional Requirements:**

#### FR-30: Email send/receive
A User can send and receive emails via myprout's integrated mail client.

#### FR-31: Disposable address creation and revocation
A User can create a disposable email alias that forwards to their real address. The alias can be revoked instantly, stopping all future mail to that address.

**Notes:** [NOTE FOR PM] Sovereign mail requires an MX record, SMTP server, DKIM/SPF configuration, and significant deliverability maintenance. This is a long-term investment, not a v1 feature.

---

## 5. Non-Goals (Explicit)

- **Public/open-source** — myprout repository remains private.
- **Multi-tenancy** — No SaaS model; one instance per household.
- **Temporary sharing via expiring links** — Out of scope for all phases.
- **Anonymous or self-serve registration** — All accounts require admin approval.
- **Enterprise features** — No SSO, LDAP, SAML, audit logs for compliance.
- **Password sharing with external (non-myprout) users** — No "send password securely" feature.
- **TOTP storage (Google Authenticator replacement)** — myprout does not store TOTP secrets for third-party sites; only the myprout-native 2FA code.
- **Monetization** — No payment, subscription, or ads model, ever.

---

## 6. MVP Scope

### 6.1 In Scope (Phase 0 + 1)

- Registration spam fix (FR-1) — unique email, no re-registration while pending
- Full auth flow: register, verify, activate, login, refresh, logout, recover (FR-1 through FR-8)
- Password Vault: CRUD, alphabetical index, search, favorites filter, password generator (FR-9 through FR-15)
- Admin panel: user list, activate/deactivate (FR-17, FR-18)
- Unit test suite covering auth routes and crypto utilities
- Dev/prod environment separation
- Security audit and hardening (CORS, rate limiting, input validation)
- Docker image for deployment and disaster recovery
- Deployed live at `myprout.fr`

### 6.2 Out of Scope for MVP

- Breach monitoring (FR-16) — deferred to Phase 2 [NOTE FOR PM: high user trust value, consider for early Phase 2]
- Browser extension (FR-19, FR-20) — Phase 2
- CSV import (FR-25) — Phase 2
- 2FA for myprout (FR-23) — Phase 3
- Windows/mobile apps (FR-21, FR-22, FR-24) — Phase 3
- Family sharing, document vault, recovery code (FR-26, FR-27, FR-28) — Phase 4
- Game server panel (FR-29) — Phase 5
- Sovereign mail (FR-30, FR-31) — Phase 5

---

## 7. Success Metrics

**Primary**

- **SM-1**: Zero support requests from family/friends in the first month after launch — users are self-sufficient. Validates FR-1 through FR-15, FR-17, FR-18 (UX clarity and reliability).
- **SM-2**: Zero reported bugs that prevent normal Vault usage in the first 30 days. Validates overall system stability.

**Secondary**

- **SM-3**: At least 3 family members with active accounts and at least 5 passwords stored within 2 weeks of launch. Validates adoption.
- **SM-4**: Gaetan's own passwords fully migrated to myprout before v1 goes live. Validates Vault completeness.

**Counter-metrics (do not optimize)**

- **SM-C1**: Do not optimize for feature richness at the expense of SM-1. A simpler, working product beats a feature-rich, confusing one.
- **SM-C2**: Do not skip the security audit to hit a launch date. A breach would be catastrophic for family trust.

---

## 8. Cross-Cutting NFRs

### Security
- **NFR-SEC-1**: All passwords are encrypted client-side with AES-256-GCM before transmission. The server never receives plaintext passwords.
- **NFR-SEC-2**: JWT tokens use RS256 (asymmetric). Private key stored in a file, path configured via environment variable.
- **NFR-SEC-3**: All tokens are stored as SHA-256 hashes in the database. Access tokens are validated against the database on every request (revocability).
- **NFR-SEC-4**: PBKDF2 parameters (310,000 iterations, 32-byte key, SHA-256) must be identical between frontend (WebCrypto API) and backend (Node.js crypto).
- **NFR-SEC-5**: CORS restricted to known origins: `localhost:5173`, `localhost:3000`, `https://myprout.fr`.
- **NFR-SEC-6**: Refresh Token stored in httpOnly, SameSite=Strict cookie. Secure flag enabled in production.
- **NFR-SEC-7**: Rate limiting must be implemented on auth endpoints (login, registration, password reset) to prevent brute force. Implementation in Phase 1.
- **NFR-SEC-8**: The myprout server must not be accessible from the public internet except via its defined API surface. A reverse proxy (nginx) with TLS termination (Let's Encrypt) must be configured in front of the Express server. Implementation in Phase 1.

### Reliability
- **NFR-REL-1**: The service must remain stable under normal household usage (~50 users, low concurrency). No hard uptime SLA, but unexpected crashes must be logged and auto-restarted.
- **NFR-REL-2**: Weekly automated backup of the database via cron job (mysqldump). Backup stored locally. Recovery from backup must be possible within 2 hours.
- **NFR-REL-3**: Docker image enables full re-deployment on a new machine within 30 minutes.

### Performance
- **NFR-PERF-1**: API response time for Vault operations (read, write) under 200ms on the local network.
- **NFR-PERF-2**: The frontend must be usable on standard household computers and mid-range smartphones.

### Privacy
- **NFR-PRIV-1**: No telemetry, analytics, or data sent to any third-party service. The only external call in v1 is the HIBP breach check (Phase 2), which uses the k-anonymity model (no full password hash transmitted).
- **NFR-PRIV-2**: No user data stored outside the self-hosted instance.

### Usability
- **NFR-UX-1**: A new user can complete account activation and add their first password without external help. Every action must have visible affordances; no icon without a label if its function is ambiguous.
- **NFR-UX-2**: The Vault must be navigable on mobile browsers (responsive layout) even before the native mobile app exists.

---

## 9. Open Questions

1. ~~**Rate limiting implementation**~~ — **Resolved:** Rate limiting is not yet implemented; must be added in Phase 1 security hardening. Library and thresholds TBD at implementation time.
2. ~~**Reverse proxy setup**~~ — **Resolved:** No nginx proxy currently in place; must be configured in Phase 1. TLS via Let's Encrypt auto-renewal.
3. ~~**Backup automation**~~ — **Resolved:** Cron job + mysqldump script. Local destination; no cloud backup required.
4. **Mobile app technology** — React Native, Flutter, or native? This decision significantly impacts Phase 3 scope and complexity.
5. **Browser extension manifest** — Manifest v3 (Chrome) vs v2 (Firefox compatibility)? This affects the extension architecture before Phase 2 starts.
6. **Document Vault encryption** — Same Crypto Key per user, or a separate document key? Large files will need chunked upload.
7. **Game server abstraction** — How are servers registered? What is the start/stop mechanism (shell command, Docker API, systemd)?
8. **Family sharing key management** — Sharing an encrypted Password Entry requires re-encrypting under the recipient's public key. Does a public key infrastructure need to be added to the User model?

---

## 10. Assumptions Index

- **§4.2 FR-11** — Permanently deleted entries can be hard-deleted by Admin only (soft delete is the default user action).
- **§4.2 FR-15** — Generated passwords: minimum length 12, default 20 characters, includes uppercase, lowercase, digits, symbols.
- **§4.5 FR-23** — 2FA is TOTP-based, generated by the myprout mobile app specifically.
- **§4.7 FR-26** — Family sharing is at the individual entry level, not full-Vault sharing.
- **§8 NFR-SEC-7** — Rate limiting on auth endpoints is implemented (library and thresholds TBD per Open Question 1).
- **§8 NFR-SEC-8** — A reverse proxy (nginx) with TLS termination sits in front of the Express server in production.
