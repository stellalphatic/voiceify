# First principles: Docker, Compose, profiles, and TLS

Updated: 2026-07-16

This doc explains **why** Voiceify is deployed the way it is, not just which commands to copy. Read it once; then the EC2 commands will make sense.

---

## 1. What problem Docker solves

Your laptop and the EC2 server are different machines (OS, paths, Node versions, ports).

**Containers** package:

- the app code (or a built image of it)
- a fixed Linux userland
- declared ports and env vars

So “it works in Docker” means the same process tree runs on your PC and on EC2.

Voiceify is a **multi-container app** (API, web, worker, Postgres, Redis, optional Caddy). One container = one process role.

---

## 2. Images vs containers vs Compose

| Concept | Meaning |
|---------|---------|
| **Image** | Immutable filesystem snapshot + start command (e.g. `voiceify-api:latest`) |
| **Container** | A running (or stopped) instance of an image |
| **Dockerfile** | Recipe to build an image (`docker/api.Dockerfile`, `web.Dockerfile`, …) |
| **Compose file** | `docker-compose.yml`: names services, wires networks, env, volumes, ports |

Without Compose you would type long `docker run …` lines and invent network names yourself. Compose does that from one YAML file.

---

## 3. The Voiceify service graph (first principles)

```
Browser
   │
   ▼
┌─────────────┐     profile "tls"      ┌─────────┐
│   Caddy     │ ◄── only when started  │  nginx  │ ◄── always (port 8080)
│  :80/:443   │     with --profile tls │  :8080  │     for HTTP / local
└──────┬──────┘                        └────┬────┘
       │ /api/* , /health                   │
       ▼                                    ▼
   ┌───────┐  SQL/Redis                 ┌───────┐
   │  api  │◄───────────────────────────│  web  │  (static SPA + widget.js)
   └───┬───┘                            └───────┘
       │
       ├── postgres (data)
       ├── redis (queues / cache)
       └── worker (background jobs)
```

- **web**: React build served by nginx inside its container. No secrets.
- **api**: Hono + Better Auth + voice routes. Holds all provider keys.
- **worker**: async jobs (same DB/Redis).
- **postgres / redis**: state.
- **nginx (host :8080)**: reverse proxy for HTTP access without TLS (dev / IP).
- **caddy**: reverse proxy + **automatic HTTPS** (Let’s Encrypt) when you enable the `tls` profile.

---

## 4. What is a Compose **profile**?

Some services should not start in every environment.

```yaml
caddy:
  profiles: ["tls"]
```

- Default: `docker compose up` starts everything **except** services that list a profile.
- With TLS: `docker compose --profile tls up` also starts `caddy`.

**Why?** Locally you often want `http://localhost:8080` (nginx) without fighting for ports 80/443 or needing a real domain. On EC2 with `voiceify.online` you want Caddy on 80/443.

`--profile tls` does **not** magically enable TLS by itself. It only starts the Caddy service. TLS works because:

1. DNS `A` record points the domain at the EC2 Elastic IP.
2. `.env` has `DOMAIN=…` and `ACME_EMAIL=…`.
3. Caddy’s config (`docker/Caddyfile`) requests a certificate for that domain.

---

## 5. Flags you will see (and what they mean)

| Command / flag | Meaning |
|----------------|---------|
| `docker compose up` | Create/start containers defined in `docker-compose.yml` |
| `-d` | Detached (background). Without it, logs attach to your terminal |
| `--build` | Rebuild images from Dockerfiles before starting (needed after code changes) |
| `--force-recreate` | Recreate containers even if config looks unchanged (picks up new `.env`) |
| `--profile tls` | Enable services tagged with profile `tls` (Caddy) |
| `docker compose exec -T api …` | Run a command **inside** the running `api` container (`-T` = no TTY, good for scripts) |
| `docker compose logs -f api` | Follow API logs |
| `git pull --ff-only origin main` | Safely fast-forward the server checkout to GitHub `main`; it stops instead of discarding local edits |

### Env injection (critical)

Compose merges:

1. `env_file: .env` on the host
2. `environment:` block in YAML (can override)

If you change `.env` but **do not** recreate the container, the process may still have old env. Prefer:

```bash
docker compose --profile tls up -d --force-recreate api
```

Never put provider secrets in the web image or in `VITE_*` variables.

---

## 6. Volumes (why data survives rebuilds)

Named volumes (`pgdata`, `redisdata`, `caddy_data`, …) live on the Docker host.

- Rebuild API/web images: **safe** (DB stays).
- `docker compose down -v`: **deletes volumes** (wipes Postgres). Avoid on production unless you mean it.

Caddy stores certificates in `caddy_data`. Deleting that volume forces re-issuance.

---

## 7. Networking inside Compose

Services reach each other by **service name**:

- API → `postgres:5432`, `redis:6379`
- Caddy → `api:3001`, `web:80`

Your browser never talks to `postgres` directly in production. Only published ports (`8080`, `80`, `443`) are on the public interface.

Host `DATABASE_URL` for tools on the EC2 shell often uses `localhost:5433` (mapped port). Inside containers it must use `postgres:5432` (Compose overrides this for `api` / `worker`).

---

## 8. Caddy TLS in one paragraph

Caddy terminates HTTPS: browser ↔ TLS ↔ Caddy ↔ plain HTTP to `api`/`web` on the Docker network. It sets `X-Forwarded-Proto: https` so Better Auth issues **Secure** cookies correctly. Without that header, login cookies break behind a reverse proxy.

---

## 9. Canonical EC2 deploy sequence

```bash
cd ~/voiceify   # or your EC2_APP_DIR

git pull --ff-only origin main

# Edit .env on the server only (never commit it)
# DOMAIN, ACME_EMAIL, BETTER_AUTH_*, RESEND_*, GROQ_*, ELEVENLABS_*, …

export GIT_SHA="$(git rev-parse --short=12 HEAD)"
export BUILT_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
docker compose --profile tls up -d --build --force-recreate

# After auth/.env password changes:
docker compose exec -T api pnpm --filter @voiceify/auth seed:admin

# Sanity
curl -sS https://voiceify.online/api/health
curl -sS https://voiceify.online/version.json
docker compose logs api --tail=80
```

GitHub Actions does the same SSH flow when secrets `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY` are set. See [github-actions-ec2.md](./github-actions-ec2.md).

---

## 10. Mental model checklist

1. **Browser never holds Groq/ElevenLabs/Gemini keys.**
2. **Compose profiles** = optional services, not a magic security mode.
3. **`--build`** after code pull; **`--force-recreate`** after `.env` change.
4. **Caddy** = public HTTPS; **nginx :8080** = HTTP edge / debugging.
5. **Volumes** hold durable state; protect them.

When something “didn’t pick up the new API key,” 90% of the time the container was not recreated after editing `.env`.
