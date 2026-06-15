# Story 3.1: Dockerize the Application

Status: ready-for-dev

## Story

As a developer,
I want myprout packaged as a Docker Compose application,
so that the entire stack can be deployed or restored with a single command.

## Acceptance Criteria

1. Running `docker compose up -d` from the project root starts three containers: `myprout-backend`, `myprout-db`, `myprout-nginx`.
2. The backend container connects to MySQL using the `db` service hostname (not `localhost`).
3. All services have `restart: always` policy.
4. `backend/Dockerfile` exists and builds the Express TypeScript app.
5. A basic nginx configuration exists at `nginx/nginx.conf` serving the frontend and proxying `/api/` to the backend (HTTP only — HTTPS added in Story 3.2).
6. `npx vitest run` passes after all changes.

## Tasks / Subtasks

- [ ] Fix: Add `bcrypt` to `backend/package.json` dependencies (prerequisite for Docker)
  - [ ] Add `"bcrypt": "^6.0.0"` to `backend/package.json` dependencies
  - [ ] Add `"@types/bcrypt": "^6.0.0"` to `backend/package.json` devDependencies
- [ ] Create `backend/docker-entrypoint.sh` (migrations + server start)
- [ ] Create `backend/Dockerfile` (AC: 4)
- [ ] Create `nginx/` directory and `nginx/nginx.conf` (AC: 5)
- [ ] Create `docker-compose.yml` at project root (AC: 1, 2, 3)
- [ ] Update `.env.example` with all Docker-required variables
- [ ] Create `keys/` directory at project root (gitignored, for JWT PEM files)
  - [ ] Document expected key file locations
- [ ] Build frontend before Docker deploy
  - [ ] Run `npm run build` from `frontend/` to generate `frontend/dist/`
- [ ] Verify (AC: 6)
  - [ ] Run `npx vitest run` from `backend/`

## Dev Notes

### Critical Prerequisite: bcrypt Missing from backend/package.json

**This is a showstopper for Docker.** The backend's `auth.ts` imports `bcrypt`, but `bcrypt` is only in the **root** `package.json`, not in `backend/package.json`.

In development, Node.js module resolution walks up to root `node_modules`. In Docker (when context = `./backend`), there is no root `node_modules`. The container will fail at startup with `Cannot find module 'bcrypt'`.

**Fix before creating Dockerfile:**

In `backend/package.json`, add to `dependencies`:
```json
"bcrypt": "^6.0.0"
```

And add to `devDependencies`:
```json
"@types/bcrypt": "^6.0.0"
```

Run `npm install` from `backend/` to update `package-lock.json`.

---

### backend/docker-entrypoint.sh

Create `backend/docker-entrypoint.sh`:

```sh
#!/bin/sh
set -e

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Starting myprout backend..."
exec npx tsx src/index.ts
```

Make executable in Dockerfile with `RUN chmod +x /docker-entrypoint.sh`.

**Why `prisma migrate deploy` not `migrate dev`:** `migrate deploy` applies pending migrations in production without interactive prompts. `migrate dev` is for development only and can reset the database. Never use `migrate dev` in production.

---

### backend/Dockerfile

Create `backend/Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (includes tsx, prisma CLI for generate and migrate)
RUN npm ci

# Copy source and prisma schema
COPY . .

# Generate Prisma client (reads schema.prisma, outputs to node_modules/@prisma/client)
RUN npx prisma generate

# Copy and prepare entrypoint
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/docker-entrypoint.sh"]
```

**Why `node:20-alpine`:** Minimal image, LTS Node version. Host runs Node v24 — Node 20 LTS is appropriate for Docker production.

**Why `npm ci` not `npm install`:** `npm ci` uses the exact lock file, ensuring reproducible installs.

**Why include devDependencies:** `tsx` (runtime TypeScript execution) and `prisma` CLI (for `migrate deploy` and `generate`) are in devDependencies. `npm ci` installs all deps by default.

**Prisma generate in Dockerfile:** Must run after copying source because it reads `prisma/schema.prisma` and generates the client. The generated client (`node_modules/@prisma/client`) needs to match the schema.

---

### docker-compose.yml

Create at **project root** (`/home/gsap/myprout/docker-compose.yml`):

```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: myprout-backend
    restart: always
    env_file: .env
    volumes:
      - ./keys:/app/keys:ro
    depends_on:
      - db
    networks:
      - myprout-network

  db:
    image: mysql:8.0
    container_name: myprout-db
    restart: always
    env_file: .env
    volumes:
      - mysql_data:/var/lib/mysql
    networks:
      - myprout-network

  nginx:
    image: nginx:alpine
    container_name: myprout-nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/certbot/conf:/etc/letsencrypt:ro
      - ./nginx/certbot/www:/var/www/certbot:ro
      - ./frontend/dist:/usr/share/nginx/html:ro
    depends_on:
      - backend
    networks:
      - myprout-network

volumes:
  mysql_data:

networks:
  myprout-network:
    driver: bridge
```

**No `version:` field:** Docker Compose v2+ (bundled with Docker Desktop and recent Docker Engine) does not require the `version:` key. Omitting it is the current best practice.

---

### JWT Keys — Volume Mount Strategy

The backend reads JWT keys from file paths via `fs.readFileSync(process.env.JWT_PRIVATE_KEY_PATH)`. In Docker, these paths are container-internal paths.

**Setup:**

1. Create `keys/` directory at project root (add to `.gitignore` — never commit private keys)
2. Place RSA key files:
   - `keys/private.pem` — RS256 private key
   - `keys/public.pem` — RS256 public key
3. In `.env`, set container-internal paths:
   ```
   JWT_PRIVATE_KEY_PATH=/app/keys/private.pem
   JWT_PUBLIC_KEY_PATH=/app/keys/public.pem
   ```
4. Docker Compose mounts `./keys:/app/keys:ro` into the backend container

**Generate RSA keys (if not already done):**
```bash
openssl genrsa -out keys/private.pem 2048
openssl rsa -in keys/private.pem -pubout -out keys/public.pem
```

---

### DATABASE_URL — Docker Network Hostname

In the Docker network, services communicate by service name. The backend must use `db` (not `localhost`) as the MySQL hostname:

```
DATABASE_URL=mysql://myprout_user:password@db:3306/myprout
```

The MySQL container uses these env vars from `.env`:
```
MYSQL_ROOT_PASSWORD=your-root-password
MYSQL_DATABASE=myprout
MYSQL_USER=myprout_user
MYSQL_PASSWORD=your-app-password
```

**Important:** If migrating from a local MySQL dev setup, create the same user/password in the Docker MySQL or use root (less secure).

---

### Complete .env.example Update

Update `.env.example` (created in Story 1.1) to include all Docker-required variables:

```
# ── Database ──────────────────────────────────────────────────────────────────
# Docker: use 'db' as hostname (Docker network service name)
# Dev local: use 'localhost'
DATABASE_URL=mysql://myprout_user:password@db:3306/myprout

# MySQL container credentials (used by docker-compose db service)
MYSQL_ROOT_PASSWORD=your-root-password-here
MYSQL_DATABASE=myprout
MYSQL_USER=myprout_user
MYSQL_PASSWORD=your-app-password-here

# ── JWT RSA Keys ───────────────────────────────────────────────────────────────
# Docker: container-internal paths (mounted via ./keys volume)
# Dev local: absolute paths on your machine
JWT_PRIVATE_KEY_PATH=/app/keys/private.pem
JWT_PUBLIC_KEY_PATH=/app/keys/public.pem

# ── Environment ────────────────────────────────────────────────────────────────
NODE_ENV=production

# ── Email (Resend) ─────────────────────────────────────────────────────────────
RESEND_API_KEY=re_your-resend-api-key

# ── App ────────────────────────────────────────────────────────────────────────
ADMIN_EMAIL=admin@myprout.fr
FRONTEND_URL=https://myprout.fr

# ── Logo API ───────────────────────────────────────────────────────────────────
LOGO_DEV_TOKEN=your-logo-dev-token
```

**Note:** Story 1.1 created `.env.example` with only 4 variables. This story **replaces** the entire `.env.example` with the complete set above.

---

### nginx/nginx.conf — HTTP Only (Story 3.2 adds HTTPS)

Create `nginx/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    server {
        listen 80;
        server_name _;

        # Serve Vue frontend (SPA — all non-API routes → index.html)
        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;
        }

        # Proxy API to backend Express server
        location /api/ {
            proxy_pass http://backend:3000;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
}
```

**This is a temporary HTTP-only config.** Story 3.2 will replace it with HTTPS + Let's Encrypt.

**SPA routing:** `try_files $uri $uri/ /index.html` ensures Vue Router client-side navigation works — unknown paths fall back to `index.html`.

**`include /etc/nginx/mime.types`:** Ensures `.js`, `.css`, `.woff2` etc. are served with correct Content-Type headers.

---

### Frontend Build Before Deploy

The nginx container mounts `./frontend/dist:/usr/share/nginx/html:ro`. This directory must exist before running `docker compose up`.

Build command (run from project root):
```bash
cd frontend && npm run build
```

The `vite.config.js` has a dev proxy (`/api` → `http://localhost:3000`). The production build removes this proxy — in production, nginx handles the `/api` routing. No changes to `vite.config.js` needed.

---

### .gitignore Additions

Add to the project root `.gitignore`:
```
keys/
frontend/dist/
```

`keys/` must never be committed (contains RSA private key).
`frontend/dist/` is a build artifact.

---

### CORS Consideration

In production, the backend's CORS allowlist in `backend/src/index.ts` is:
```typescript
const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000', 'https://myprout.fr']
```

`https://myprout.fr` is already in the list. When nginx terminates TLS (Story 3.2), the backend receives requests from nginx at `http://backend:3000` — the `Origin` header in browser requests will be `https://myprout.fr`, which is allowed. ✅

However, for Story 3.1 (HTTP only, no TLS yet), the origin will be `http://myprout.fr` — NOT in the allowlist. If you test with the actual domain in Story 3.1, add `http://myprout.fr` temporarily or test via `http://localhost`.

---

### trust proxy for Rate Limiting (X-Forwarded-For)

From Story 1.4's architecture note: `express-rate-limit` uses `req.ip` for rate limiting. Behind nginx, the real client IP is in `X-Forwarded-For`. Add to `backend/src/index.ts` after `const app = express()`:

```typescript
app.set('trust proxy', 1) // Trust first proxy (nginx)
```

Without this, all requests appear to come from nginx's internal IP → rate limiting won't work correctly in production.

---

### References

- [Source: architecture.md#INFRA-2] docker-compose 3 services: backend, db, nginx
- [Source: architecture.md#INFRA-1] Docker `restart: always` — no PM2
- [Source: architecture.md#INFRA-5] .env at root, mounted via env_file
- [Source: backend/package.json] bcrypt missing — must be added before Docker build
- [Source: backend/src/routes/passwords.ts:87] LOGO_DEV_TOKEN env var used
- [Source: backend/src/services/email/email.ts] RESEND_API_KEY, ADMIN_EMAIL, FRONTEND_URL used
- [Source: backend/prisma/migrations/] Multiple existing migrations — prisma migrate deploy will run all

## Dev Agent Record

### Agent Model Used

_to be filled by dev agent_

### Debug Log References

### Completion Notes List

### File List

- `backend/package.json` (MODIFY — add bcrypt + @types/bcrypt)
- `backend/Dockerfile` (NEW)
- `backend/docker-entrypoint.sh` (NEW)
- `docker-compose.yml` (NEW — project root)
- `nginx/nginx.conf` (NEW — HTTP only placeholder)
- `.env.example` (MODIFY — replace with complete variable set)
- `backend/src/index.ts` (MODIFY — add `app.set('trust proxy', 1)`)
- `.gitignore` (MODIFY — add keys/ and frontend/dist/)
