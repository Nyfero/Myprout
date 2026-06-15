# Story 3.2: Configure nginx Reverse Proxy with TLS

Status: ready-for-dev

## Story

As a user,
I want to access myprout via HTTPS at myprout.fr,
so that my connection is encrypted and the app feels professional.

## Acceptance Criteria

1. HTTP requests to port 80 are permanently redirected to HTTPS (HTTP 301), except for the ACME challenge path.
2. HTTPS requests to `/api/*` are proxied to the backend container on port 3000.
3. HTTPS requests to all other paths serve the frontend build (`frontend/dist/`) as static files, with SPA fallback to `index.html`.
4. TLS is terminated at nginx using a valid Let's Encrypt certificate for `myprout.fr` — no browser security warnings.
5. The certificate renews automatically before expiry.
6. `npx vitest run` passes after all changes.

## Tasks / Subtasks

- [ ] Pre-step: Ensure Story 3.1 is complete and `docker compose up -d` works with HTTP
- [ ] Step 1: Update `nginx/nginx.conf` to add ACME challenge support (still HTTP)
  - [ ] Add `location /.well-known/acme-challenge/` serving from certbot www volume
  - [ ] Reload nginx: `docker compose exec nginx nginx -s reload`
- [ ] Step 2: Obtain Let's Encrypt certificate via certbot
  - [ ] Run certbot webroot challenge (see exact command below)
  - [ ] Verify cert files exist in `nginx/certbot/conf/live/myprout.fr/`
- [ ] Step 3: Replace `nginx/nginx.conf` with full HTTPS configuration
  - [ ] HTTP server: ACME challenge + redirect all other HTTP → HTTPS
  - [ ] HTTPS server: TLS certs + frontend static files + `/api/` proxy
- [ ] Step 4: Reload nginx with HTTPS config
  - [ ] `docker compose exec nginx nginx -s reload`
  - [ ] Verify HTTPS works: `curl -I https://myprout.fr`
- [ ] Step 5: Set up auto-renewal cron job on host
- [ ] Verify no regression (AC: 6)
  - [ ] Run `npx vitest run` from `backend/`

## Dev Notes

### Dependency on Story 3.1

This story requires:
- `docker compose up -d` working (Story 3.1)
- `nginx/certbot/conf/` and `nginx/certbot/www/` volumes declared in docker-compose.yml (Story 3.1)
- Port 80 accessible from the internet (domain `myprout.fr` must resolve to the server)

**Important:** Before running certbot, the domain `myprout.fr` must point to the server's public IP address. Certbot cannot issue a certificate without successful HTTP-01 domain validation.

---

### Step 1: Intermediate nginx.conf (HTTP + ACME challenge)

**Replace** `nginx/nginx.conf` with this intermediate config (HTTPS not yet active — certs don't exist yet):

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    server {
        listen 80;
        server_name myprout.fr;

        # ACME challenge for Let's Encrypt
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        # Serve frontend temporarily (HTTP — will redirect to HTTPS after cert is obtained)
        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;
        }

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

Reload nginx to apply:
```bash
docker compose exec nginx nginx -s reload
```

---

### Step 2: Obtain Let's Encrypt Certificate

Run certbot using the webroot method (nginx stays running — no downtime):

```bash
docker run --rm \
  -v $(pwd)/nginx/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/nginx/certbot/www:/var/www/certbot \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email admin@myprout.fr \
  --agree-tos \
  --no-eff-email \
  -d myprout.fr
```

**Expected output:** Certificate saved to `/etc/letsencrypt/live/myprout.fr/fullchain.pem`

**What certbot creates in `nginx/certbot/conf/`:**
```
nginx/certbot/conf/
└── live/
    └── myprout.fr/
        ├── fullchain.pem   ← certificate chain (for ssl_certificate)
        ├── privkey.pem     ← private key (for ssl_certificate_key)
        ├── cert.pem        ← certificate only
        └── chain.pem       ← intermediate chain
```

**If certbot fails with "domain not accessible":** Ensure port 80 is open on the firewall, the domain DNS points to the server, and the certbot www volume is correctly mounted.

---

### Step 3: Final nginx.conf with HTTPS

**Replace** `nginx/nginx.conf` with the production HTTPS configuration:

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # HTTP → HTTPS redirect (and ACME challenge for renewals)
    server {
        listen 80;
        server_name myprout.fr;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    # HTTPS server
    server {
        listen 443 ssl;
        server_name myprout.fr;

        # TLS certificates (from Let's Encrypt)
        ssl_certificate /etc/letsencrypt/live/myprout.fr/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/myprout.fr/privkey.pem;

        # Modern TLS — TLSv1.2 and TLSv1.3 only
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_prefer_server_ciphers off;

        # Vue SPA frontend
        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;
        }

        # Proxy API calls to Express backend
        location /api/ {
            proxy_pass http://backend:3000;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

Reload nginx:
```bash
docker compose exec nginx nginx -s reload
```

**Verify:** Open `https://myprout.fr` in browser — should load without certificate warning.

---

### Step 4: Verify Backend Receives HTTPS Requests Correctly

With nginx TLS termination:
- Browser → `https://myprout.fr/api/auth/login` (HTTPS)
- nginx → `http://backend:3000/api/auth/login` (HTTP, internal Docker network)
- The `Origin` header: `https://myprout.fr` ✅ (already in CORS allowlist)
- `X-Forwarded-Proto: https` header tells Express the original protocol

The `app.set('trust proxy', 1)` added in Story 3.1 ensures `req.ip` uses `X-Forwarded-For` for rate limiting, and `req.protocol` returns `https`.

**Cookie security:** The Refresh Token cookie has `secure: process.env.NODE_ENV === 'production'`. With `NODE_ENV=production` in `.env`, the cookie will be sent only over HTTPS. ✅

---

### Step 5: Auto-Renewal Cron Job

Add to the host's crontab (`crontab -e`):

```cron
0 3 * * 1 cd /path/to/myprout && docker run --rm \
  -v $(pwd)/nginx/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/nginx/certbot/www:/var/www/certbot \
  certbot/certbot renew --webroot --webroot-path=/var/www/certbot --quiet \
  && docker compose exec nginx nginx -s reload
```

**Frequency:** Every Monday at 3 AM — Let's Encrypt certs expire after 90 days, renewal is attempted when less than 30 days remain. Weekly cron is safe.

**Why webroot for renewals:** nginx stays running during renewal (no downtime). The ACME challenge location in the HTTP server block handles the validation.

**Replace `/path/to/myprout`** with the actual absolute path of the project directory on the host.

---

### Vite Production Build — baseURL Note

The Vue frontend in development uses the Vite dev proxy (`/api` → `http://localhost:3000`). The production build has no proxy — instead, `api.js` hardcodes `baseURL: 'http://localhost:3000/api'`.

**This must be updated before the production build:**

In `frontend/src/services/api.js` (line ~6):
```javascript
const api = axios.create({
  baseURL: 'http://localhost:3000/api',  // DEV
  // baseURL: 'https://votre-backend.com/api', // Pour la prod -- UPDATE THIS
```

For production, since nginx proxies `/api/` at the same domain, the baseURL should be relative:
```javascript
const api = axios.create({
  baseURL: '/api',  // nginx proxies /api/ to backend — works for both HTTP and HTTPS
  withCredentials: true,
})
```

Using `/api` (relative path) makes the frontend work regardless of the domain, and avoids hardcoding `https://myprout.fr`. **Update `api.js` and rebuild the frontend before deploying.**

---

### What to Test After Deployment

```bash
# HTTPS loads correctly
curl -I https://myprout.fr
# Expected: HTTP/2 200

# HTTP redirects to HTTPS
curl -I http://myprout.fr
# Expected: HTTP/1.1 301 Moved Permanently + Location: https://myprout.fr/

# API proxying works
curl -s -o /dev/null -w "%{http_code}" https://myprout.fr/api/auth/login -X POST \
  -H "Content-Type: application/json" -d '{"email":"a","password":"b"}'
# Expected: 400 (missing fields, not 502 or 404)
```

---

### Files Not Changed in This Story

- `docker-compose.yml` — unchanged from Story 3.1 (certbot volumes already declared)
- `backend/` — no changes
- `frontend/src/` — only `api.js` baseURL (if not done in Story 3.1)

---

### References

- [Source: architecture.md#SEC-2] nginx + Let's Encrypt via certbot, auto-renewal
- [Source: backend/src/index.ts:7] allowedOrigins — `https://myprout.fr` already in list ✅
- [Source: backend/src/index.ts] refreshToken cookie: `secure: NODE_ENV === 'production'` — requires HTTPS ✅
- [Source: story-3.1] docker-compose volumes: `./nginx/certbot/conf:/etc/letsencrypt:ro`, `./nginx/certbot/www:/var/www/certbot:ro`
- [Source: frontend/src/services/api.js:6] baseURL hardcoded to localhost — must change to `/api` for production

## Dev Agent Record

### Agent Model Used

_to be filled by dev agent_

### Debug Log References

### Completion Notes List

### File List

- `nginx/nginx.conf` (MODIFY twice — intermediate HTTP config, then final HTTPS config)
- `frontend/src/services/api.js` (MODIFY — change baseURL to `/api` for production)
