# Story 3.4: Validate Production Deployment

Status: ready-for-dev

## Story

As a system administrator,
I want to verify that the production deployment is healthy and resilient,
so that I am confident myprout can be relied upon by my family.

## Acceptance Criteria

1. `https://myprout.fr` loads the login page with a valid TLS certificate and no browser security warnings.
2. When the backend container is killed, it automatically restarts within 30 seconds without manual intervention.
3. When the frontend is rebuilt and `frontend/dist/` is updated, nginx serves the new version immediately without restarting containers.
4. On a fresh machine with Docker installed, `docker compose up -d` brings the full stack online within 30 minutes.
5. `npx vitest run` passes after all changes.

## Tasks / Subtasks

- [ ] Validation 1: HTTPS health check (AC: 1)
- [ ] Validation 2: Backend auto-restart test (AC: 2)
- [ ] Validation 3: Frontend hot-swap test (AC: 3)
- [ ] Validation 4: Disaster recovery procedure documentation (AC: 4)
- [ ] Create `DEPLOYMENT.md` at project root documenting the full deployment process
- [ ] Fix any issues found during validation
- [ ] Verify no regression (AC: 5)

## Dev Notes

### This is a Validation Story

This story does **not** implement new features. Its purpose is to run through production validation checks, fix any discovered issues, and document the deployment process. Each validation is a concrete test with expected output.

---

### Validation 1: HTTPS Health Check

**Test 1a — Login page loads over HTTPS:**
```bash
curl -I https://myprout.fr
```
Expected: `HTTP/2 200` with `content-type: text/html`

**Test 1b — HTTP redirects to HTTPS:**
```bash
curl -I http://myprout.fr
```
Expected: `HTTP/1.1 301 Moved Permanently` with `Location: https://myprout.fr/`

**Test 1c — API responds via HTTPS:**
```bash
curl -s -o /dev/null -w "%{http_code}" \
  -X POST https://myprout.fr/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test","password":"test"}'
```
Expected: `400` (AUTH_005 missing fields → proves the API proxy works)

**Test 1d — TLS certificate details:**
```bash
curl -vI https://myprout.fr 2>&1 | grep -E "subject|issuer|expire"
```
Expected: issuer contains "Let's Encrypt"

**If Test 1c returns 502 Bad Gateway:**
- Backend is not reachable from nginx
- Check: `docker compose logs backend --tail=20`
- Check: `docker compose ps` — all 3 containers running?

---

### Validation 2: Backend Auto-Restart

**Test — Kill the backend container and verify restart:**
```bash
# Step 1: Note current container start time
docker inspect myprout-backend --format='{{.State.StartedAt}}'

# Step 2: Kill the container
docker kill myprout-backend

# Step 3: Wait 10 seconds
sleep 10

# Step 4: Verify it restarted automatically
docker inspect myprout-backend --format='{{.State.Status}} {{.State.StartedAt}}'
```
Expected: Status is `running`, StartedAt is more recent than Step 1.

**Test — API still responds after restart:**
```bash
curl -s -o /dev/null -w "%{http_code}" \
  -X POST https://myprout.fr/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test","password":"test"}'
```
Expected: `400` (not 502 or connection refused)

**If container does NOT restart:**
- Check `restart: always` is set in docker-compose.yml for the backend service
- Check `docker events --filter container=myprout-backend` for restart events

---

### Validation 3: Frontend Hot-Swap

The nginx container mounts `./frontend/dist:/usr/share/nginx/html:ro`. Because nginx reads static files from disk on each request, updating `dist/` takes effect **immediately** without any container restart.

**Test procedure:**
```bash
# Step 1: Note the current page title or version
curl -s https://myprout.fr | grep -o '<title>[^<]*</title>'

# Step 2: Make a visible change to identify the new build
# Edit frontend/src/App.vue or any component temporarily
# (e.g., change a text string or add a comment)

# Step 3: Rebuild frontend
cd frontend && npm run build && cd ..

# Step 4: Immediately test (no nginx restart needed)
curl -s https://myprout.fr | grep -o '<title>[^<]*</title>'
```
Expected: The updated content is served without any `docker compose restart nginx`.

**Practical update workflow for production:**
```bash
# Update frontend only
cd frontend && npm run build && cd ..
# No container restart needed — nginx picks up new files immediately

# Update backend only
docker compose build backend
docker compose up -d backend
# Backend container restarts with new image, applies migrations
```

---

### Validation 4: Disaster Recovery Procedure

**Objective:** Verify the full stack can be restored on a fresh machine in <30 minutes.

**Documented procedure (store in DEPLOYMENT.md):**

```markdown
# Disaster Recovery

## Prerequisites
- Docker Engine installed
- Git installed
- Domain DNS pointing to new machine's IP

## Steps

### 1. Clone the repository (2 min)
git clone <repo-url> myprout
cd myprout

### 2. Configure environment (5 min)
cp .env.example .env
# Edit .env with real values:
# - MYSQL_ROOT_PASSWORD, MYSQL_USER, MYSQL_PASSWORD
# - RESEND_API_KEY
# - ADMIN_EMAIL, FRONTEND_URL
# - LOGO_DEV_TOKEN
# - NODE_ENV=production

### 3. Restore JWT keys (2 min)
mkdir -p keys
# Copy private.pem and public.pem to keys/
# Or generate new ones:
openssl genrsa -out keys/private.pem 2048
openssl rsa -in keys/private.pem -pubout -out keys/public.pem

### 4. Build frontend (3 min)
cd frontend && npm install && npm run build && cd ..

### 5. Start the stack (5 min)
docker compose up -d

### 6. Verify all containers running
docker compose ps

### 7. Obtain TLS certificate (5 min — requires port 80 accessible)
docker run --rm \
  -v $(pwd)/nginx/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/nginx/certbot/www:/var/www/certbot \
  certbot/certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email admin@myprout.fr --agree-tos --no-eff-email \
  -d myprout.fr

### 8. Apply HTTPS nginx config and reload (2 min)
# Replace nginx/nginx.conf with HTTPS version (see Story 3.2)
docker compose exec nginx nginx -s reload

### 9. Restore database from backup (5 min, if applicable)
gunzip < backups/myprout_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i myprout-db mysql -u root -p"${MYSQL_ROOT_PASSWORD}" myprout

### 10. Set up cron backup (1 min)
crontab -e
# Add: 0 3 * * 0 /path/to/myprout/scripts/backup.sh >> /path/to/myprout/backups/backup.log 2>&1

Total: ~30 minutes
```

---

### Create DEPLOYMENT.md

Create `DEPLOYMENT.md` at the project root with the disaster recovery procedure above, plus:
- System requirements (Docker Engine, 4GB RAM minimum)
- Initial deployment steps (same as disaster recovery, minus the backup restore)
- Common troubleshooting commands

---

### Common Issues and Fixes

**Container fails to start — check logs:**
```bash
docker compose logs backend --tail=50
docker compose logs db --tail=20
docker compose logs nginx --tail=20
```

**Backend can't connect to DB:**
```bash
# Check DATABASE_URL uses 'db' hostname, not 'localhost'
grep DATABASE_URL .env
# Expected: mysql://...@db:3306/myprout
```

**nginx serves stale frontend:**
```bash
# Verify dist/ was rebuilt
ls -la frontend/dist/
# The files should have recent timestamps
```

**Prisma migration fails on startup:**
```bash
# Check migration logs
docker compose logs backend | grep -E "migration|prisma|error"
# If migration fails, check if DB is initialized
docker exec myprout-db mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "SHOW DATABASES;"
```

**Rate limiting blocks your own IP:**
```bash
# If you're testing from the same IP as the server, rate limits apply
# Wait 15 minutes or temporarily remove loginLimiter from auth.ts during testing
```

---

### Final Validation Checklist

Before marking this story complete, run through this checklist manually:

- [ ] `https://myprout.fr` loads — no TLS warning
- [ ] `http://myprout.fr` → 301 redirect to HTTPS
- [ ] Login form visible and functional
- [ ] API returns 400 (not 502) for invalid login attempt
- [ ] Backend container restarts after `docker kill myprout-backend`
- [ ] Frontend updates visible without nginx restart after `npm run build`
- [ ] `docker compose ps` shows all 3 containers as "running"
- [ ] `scripts/backup.sh` runs without error when containers are up
- [ ] `DEPLOYMENT.md` exists and is accurate
- [ ] `npx vitest run` passes

---

### References

- [Source: architecture.md#NFR-REL-1] Stable under ~50 users, auto-restart via Docker restart: always
- [Source: architecture.md#NFR-REL-3] Full re-deployment within 30 minutes via Docker image
- [Source: story-3.1] docker-compose.yml, restart: always on all services
- [Source: story-3.2] nginx HTTPS config, certbot TLS
- [Source: story-3.3] scripts/backup.sh, backups/ directory

## Dev Agent Record

### Agent Model Used

_to be filled by dev agent_

### Debug Log References

### Completion Notes List

### File List

- `DEPLOYMENT.md` (NEW — project root, disaster recovery procedure)
