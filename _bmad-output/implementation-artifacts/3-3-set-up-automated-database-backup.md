# Story 3.3: Set Up Automated Database Backup

Status: ready-for-dev

## Story

As a system administrator,
I want an automated weekly database backup,
so that I can recover from hardware failure without losing more than 7 days of data.

## Acceptance Criteria

1. `scripts/backup.sh` exists at the project root, is executable, and runs without errors when the db container is running.
2. Each execution creates a timestamped `.sql.gz` file in the `./backups/` directory.
3. A cron job on the host machine runs `backup.sh` weekly (Sunday 3:00 AM).
4. A backup file created by `backup.sh` can be used to fully restore the database.
5. `npx vitest run` passes after all changes (no backend code changes — this is infrastructure only).

## Tasks / Subtasks

- [ ] Create `scripts/` directory at project root
- [ ] Create `scripts/backup.sh` (AC: 1, 2, 4)
  - [ ] Load credentials from `.env`
  - [ ] Run `mysqldump` via `docker exec myprout-db`
  - [ ] Compress output with gzip
  - [ ] Save to `backups/YYYYMMDD_HHMMSS.sql.gz`
  - [ ] Clean up backups older than 28 days
  - [ ] Make executable: `chmod +x scripts/backup.sh`
- [ ] Create `backups/` directory with `.gitignore`
- [ ] Add cron job on host (AC: 3)
  - [ ] `crontab -e` → add weekly job
- [ ] Document restore procedure (AC: 4)
- [ ] Verify no regression (AC: 5)
  - [ ] Run `npx vitest run` from `backend/`

## Dev Notes

### scripts/backup.sh — Exact Content

Create `scripts/backup.sh`:

```bash
#!/bin/bash
set -e

# Resolve project root (works regardless of where script is called from)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "${SCRIPT_DIR}")"

# Load environment variables from .env
if [ -f "${PROJECT_DIR}/.env" ]; then
  export $(grep -v '^#' "${PROJECT_DIR}/.env" | xargs)
fi

# Backup configuration
BACKUP_DIR="${PROJECT_DIR}/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/myprout_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=28  # Keep 4 weeks of backups

mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Starting backup → ${BACKUP_FILE}"

# Run mysqldump inside the db container, pipe through gzip
docker exec myprout-db mysqldump \
  -u root \
  -p"${MYSQL_ROOT_PASSWORD}" \
  --single-transaction \
  --routines \
  --triggers \
  myprout | gzip > "${BACKUP_FILE}"

echo "[$(date)] Backup completed: $(du -sh "${BACKUP_FILE}" | cut -f1)"

# Cleanup: delete backups older than RETENTION_DAYS
find "${BACKUP_DIR}" -name "myprout_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
echo "[$(date)] Cleaned up backups older than ${RETENTION_DAYS} days"
```

Make executable:
```bash
chmod +x scripts/backup.sh
```

---

### Why `docker exec` not `docker compose exec`

`docker exec myprout-db` uses the container name directly — this works regardless of whether the command is run from the project directory. `docker compose exec` requires the working directory to be the project root (where docker-compose.yml is). Since cron jobs may run from a different context, `docker exec` with the container name is more reliable.

**Container name:** `myprout-db` (set in docker-compose.yml via `container_name: myprout-db`).

---

### Why `--single-transaction`

For InnoDB tables (MySQL's default engine), `--single-transaction` starts a consistent transaction before dumping. This means:
- No table locks during backup
- The database remains fully operational while backup runs
- The dump represents a consistent point-in-time snapshot

Without `--single-transaction`, mysqldump would lock tables, causing request failures during backup.

---

### Backup Storage Location

Backups are stored in `./backups/` at the project root. This directory:
- Must NOT be committed to git (add to `.gitignore`)
- Must be on the same filesystem as the project (ensure sufficient disk space)
- 28-day retention: with weekly backups, keeps 4 backup files

**Add to `.gitignore`** (if not already):
```
backups/
```

Create the directory with a placeholder `.gitignore` inside it:
```bash
mkdir -p backups
echo "*" > backups/.gitignore
echo "!.gitignore" >> backups/.gitignore
```

This ensures `backups/` is tracked in git (so it exists on clone) but its contents are ignored.

---

### Cron Job Setup

Add to host crontab (`crontab -e`):

```cron
# myprout weekly database backup — every Sunday at 3:00 AM
0 3 * * 0 /path/to/myprout/scripts/backup.sh >> /path/to/myprout/backups/backup.log 2>&1
```

**Replace `/path/to/myprout`** with the absolute path of the project directory.

Verify cron is installed and running:
```bash
sudo systemctl status cron   # Debian/Ubuntu
# or
sudo systemctl status crond  # Fedora/RHEL
```

**Test the cron job manually:**
```bash
/path/to/myprout/scripts/backup.sh
ls -la /path/to/myprout/backups/
```

---

### Restore Procedure (AC: 4)

To restore from a backup file `myprout_20261201_030000.sql.gz`:

```bash
# 1. Stop the backend (prevent writes during restore)
docker compose stop backend

# 2. Restore the database
gunzip < backups/myprout_20261201_030000.sql.gz | \
  docker exec -i myprout-db mysql \
  -u root \
  -p"${MYSQL_ROOT_PASSWORD}" \
  myprout

# 3. Restart the backend
docker compose start backend
```

**Verify restore:**
```bash
docker exec myprout-db mysql -u root -p"${MYSQL_ROOT_PASSWORD}" \
  -e "SELECT COUNT(*) FROM users;" myprout
```

**Note on `exec -i`:** The `-i` flag is required for `docker exec` when piping stdin. Without it, the MySQL client won't receive the SQL input.

---

### Environment Variable: MYSQL_ROOT_PASSWORD

The backup script reads `MYSQL_ROOT_PASSWORD` from `.env`. This variable is already defined in `.env.example` (added in Story 3.1). Ensure the real `.env` has this value set.

**Alternative — dedicated backup user (more secure, optional):**
Instead of using root, create a dedicated MySQL backup user with read-only permissions:
```sql
CREATE USER 'myprout_backup'@'%' IDENTIFIED BY 'backup_password';
GRANT SELECT, LOCK TABLES, SHOW VIEW, EVENT, TRIGGER ON myprout.* TO 'myprout_backup'@'%';
FLUSH PRIVILEGES;
```

Then in `backup.sh`, replace `-u root -p"${MYSQL_ROOT_PASSWORD}"` with `-u myprout_backup -p"${MYSQL_BACKUP_PASSWORD}"` and add `MYSQL_BACKUP_PASSWORD` to `.env`. This is optional for a personal self-hosted project.

---

### What This Story Does NOT Include

- Off-site backup (S3, Backblaze, etc.) — deferred; local backup is sufficient for Phase 1
- Backup encryption — not required for a local personal project
- Backup monitoring/alerting — deferred
- Frontend dist/ backup — not needed (can be rebuilt with `npm run build`)
- Config files backup (nginx.conf, .env) — document separately; not automated

---

### References

- [Source: architecture.md#NFR-REL-2] Weekly automated backup via cron job (mysqldump). Recovery within 2 hours.
- [Source: docker-compose.yml (Story 3.1)] container_name: myprout-db
- [Source: .env.example (Story 3.1)] MYSQL_ROOT_PASSWORD, MYSQL_DATABASE=myprout
- [Source: epics.md#Story 3.3 AC] "Scripts/backup.sh", timestamped .sql.gz, cron weekly 3 AM, restore works

## Dev Agent Record

### Agent Model Used

_to be filled by dev agent_

### Debug Log References

### Completion Notes List

### File List

- `scripts/backup.sh` (NEW — executable)
- `backups/.gitignore` (NEW — keeps directory tracked but contents ignored)
- `.gitignore` (MODIFY — add `backups/` if not already present)
