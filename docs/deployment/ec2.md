# EC2 deployment

Updated: 2026-07-14

Production target: **one EC2 instance** running Docker Compose — Postgres, Redis, API (Hono), worker (BullMQ), static web, and edge nginx.

Paid external services: **EC2** + **ElevenLabs**. Auth, database, cache, and compute stay on the box.

Repository: [stellalphatic/voiceify](https://github.com/stellalphatic/voiceify)

---

## 1. Provision EC2

| Setting | Recommendation |
|---------|----------------|
| OS | Ubuntu 22.04 LTS or 24.04 LTS |
| Instance | `t3.small` (dev/FYP) or `t3.medium` (demo traffic) |
| Storage | 30 GB gp3 |
| Security group | Inbound: **22** (SSH, your IP), **8080** (HTTP app), **443** (TLS, optional) |

Attach an Elastic IP if you need a stable public address.

---

## 2. Bootstrap the host

```bash
# SSH into the instance
ssh ubuntu@<elastic-ip>

sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-plugin git curl

sudo usermod -aG docker $USER
newgrp docker

# Optional: install Node 20 + pnpm for migrations from the host
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
corepack enable && corepack prepare pnpm@9.15.0 --activate
```

---

## 3. Clone and configure

```bash
git clone https://github.com/stellalphatic/voiceify.git
cd voiceify
cp .env.example .env
nano .env   # fill in secrets (see below)
```

### Required `.env` values (production)

```bash
# Public URL — use your domain or Elastic IP
APP_URL="http://<elastic-ip>:8080"
WEB_ORIGIN="http://<elastic-ip>:8080"
BETTER_AUTH_URL="http://<elastic-ip>:8080"
BETTER_AUTH_TRUSTED_ORIGINS="http://<elastic-ip>:8080"

# Generate: openssl rand -base64 32
BETTER_AUTH_SECRET="<long-random-secret>"

# Inside Docker network (compose defaults work)
DATABASE_URL="postgresql://voiceify:voiceify@postgres:5432/voiceify"
REDIS_URL="redis://redis:6379"

# AI keys (server-only — never VITE_*)
GEMINI_API_KEY="..."
GROQ_API_KEY="..."
ELEVENLABS_API_KEY="..."

# Platform admin — rotate before go-live
PLATFORM_ADMIN_EMAIL="admin@metapresence.co"
PLATFORM_ADMIN_PASSWORD="<strong-password>"
AUTO_APPROVE_SIGNUPS="false"
```

> **Note:** Host-side migrations use port **5433** (`localhost:5433`) because compose maps Postgres `5432 → 5433` on the host. Inside Docker, services use `postgres:5432`.

---

## 4. Database migrations and seed

```bash
# Start data stores first
docker compose up -d postgres redis

# Wait for healthy postgres, then migrate from host
export DATABASE_URL="postgresql://voiceify:voiceify@localhost:5433/voiceify"
pnpm install
pnpm db:migrate
pnpm db:seed          # plans (Free / Pro / Enterprise)
pnpm db:seed:admin    # platform super-admin
```

---

## 5. Start the full stack

```bash
docker compose up -d --build
docker compose ps
curl -sf http://localhost:8080/health && echo "API OK"
```

Open **http://\<elastic-ip\>:8080** in a browser.

- Sign up as a normal user → status **pending** until a super-admin approves.
- Sign in as platform admin → **/admin** portal.

---

## 6. TLS (recommended)

Terminate TLS with **Caddy** or **nginx + Let's Encrypt** in front of `:8080`, or mount certificates into the compose nginx service.

After TLS is active, update:

```bash
APP_URL="https://your.domain"
WEB_ORIGIN="https://your.domain"
BETTER_AUTH_URL="https://your.domain"
BETTER_AUTH_TRUSTED_ORIGINS="https://your.domain"
```

Restart: `docker compose up -d --build`

---

## 7. CI/CD (GitHub Actions)

### Continuous integration

Every push/PR to `main` runs `.github/workflows/ci.yml`:

- `pnpm install --frozen-lockfile`
- `pnpm typecheck` · `pnpm lint` · `pnpm test` · `pnpm build`

### Automated deploy (optional)

`.github/workflows/deploy-ec2.yml` deploys on push to `main` when repository is `stellalphatic/voiceify`.

Add these **GitHub repository secrets**:

| Secret | Description |
|--------|-------------|
| `EC2_HOST` | Elastic IP or hostname |
| `EC2_USER` | SSH user (e.g. `ubuntu`) |
| `EC2_SSH_KEY` | Private key (PEM contents) |
| `EC2_APP_DIR` | Optional — default `/home/ubuntu/voiceify` |

The workflow SSHs in, `git pull`s `main`, and runs `docker compose up -d --build`.

Manual deploy:

```bash
ssh ubuntu@<elastic-ip>
cd voiceify
git pull origin main
docker compose up -d --build
```

---

## 8. Backups

```bash
# Daily dump (cron-friendly)
docker compose exec -T postgres pg_dump -U voiceify voiceify > backup-$(date +%F).sql
```

Restore:

```bash
cat backup-YYYY-MM-DD.sql | docker compose exec -T postgres psql -U voiceify voiceify
```

---

## 9. Health and rollback

| Check | Command |
|-------|---------|
| API | `curl http://localhost:8080/health` |
| Web | `curl -I http://localhost:8080/` |
| Services | `docker compose ps` |
| Logs | `docker compose logs -f api` |

Rollback:

```bash
git checkout <previous-sha>
docker compose up -d --build
```

---

## 10. Post-deploy checklist

- [ ] Rotate `BETTER_AUTH_SECRET` and `PLATFORM_ADMIN_PASSWORD`
- [ ] Confirm `AUTO_APPROVE_SIGNUPS=false`
- [ ] Restrict security group to known IPs where possible
- [ ] Enable TLS before sharing publicly
- [ ] Schedule Postgres backups
- [ ] Verify admin portal at `/admin` and approve a test user
