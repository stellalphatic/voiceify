# GitHub Actions → EC2 deploy

Updated: 2026-07-15

On every push to `main` (except docs-only changes), [`.github/workflows/deploy-ec2.yml`](../../.github/workflows/deploy-ec2.yml) SSHs into your EC2 host, pulls `origin/main`, and rebuilds with Docker Compose.

CI quality checks live in [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) (install, typecheck, tests).

---

## 1. Prerequisites on the EC2 host

1. Repo cloned (example: `/home/ubuntu/voiceify`)
2. Docker Engine + Compose plugin installed
3. A production `.env` in the app directory (never commit this file)
4. Deploy key or HTTPS credentials so `git fetch` works as the SSH user
5. Optional TLS: `DOMAIN` + `ACME_EMAIL` in `.env` so compose uses `--profile tls`

Seed the platform admin at least once after auth env is correct:

```bash
cd /home/ubuntu/voiceify
docker compose exec -T api pnpm --filter @voiceify/auth seed:admin
```

---

## 2. Generate an SSH key for GitHub Actions

On your laptop (or a throwaway machine), create a **dedicated** deploy key (do not reuse your personal key):

```bash
ssh-keygen -t ed25519 -C "github-actions-voiceify" -f voiceify-gha-ec2 -N ""
```

- Public key → EC2 `~/.ssh/authorized_keys` for the deploy user (usually `ubuntu`)
- Private key → GitHub secret `EC2_SSH_KEY` (entire PEM contents)

---

## 3. GitHub repository secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Value |
|--------|--------|
| `EC2_HOST` | Public IP or hostname (e.g. `13.212.88.2` or `voiceify.metapresence.co` if SSH points there) |
| `EC2_USER` | `ubuntu` (or your AMI user) |
| `EC2_SSH_KEY` | Full private key, including `-----BEGIN …-----` / `-----END …-----` |
| `EC2_APP_DIR` | Optional. Defaults to `/home/ubuntu/voiceify` if unset |

Secrets that stay on the **server `.env` only** (not in GitHub unless you later add a secret sync):

- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL` (compose-managed)
- `GROQ_API_KEY`, `GEMINI_API_KEY`, `ELEVENLABS_API_KEY`
- `PLATFORM_ADMIN_EMAIL`, `PLATFORM_ADMIN_PASSWORD`
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- `DOMAIN`, `ACME_EMAIL`

The workflow does **not** overwrite `.env`. Edit `.env` on the instance over SSH when keys change, then re-run deploy or recreate the `api` service.

---

## 4. First deploy checklist

1. Add the four secrets above
2. Confirm the workflow file is on `main` and repository name matches the `if:` guard (`stellalphatic/voiceify`)
3. Push to `main` **or** run **Actions → Deploy to EC2 → Run workflow**
4. Watch the job log for `docker compose … up -d --build` and the health probe
5. Open `https://voiceify.metapresence.co/health` (or your domain)
6. Sign in as platform admin → you should land on `/admin`

---

## 5. After deploy operations

```bash
# Logs
docker compose logs -f api web caddy

# Re-seed / sync admin password from .env
docker compose exec -T api pnpm --filter @voiceify/auth seed:admin

# Apply new .env keys without full rebuild
docker compose up -d api worker
```

Password reset emails require Resend:

```bash
# in EC2 .env
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL="Voiceify <noreply@your-verified-domain>"
```

Then recreate `api` so the new env is picked up.

---

## 6. Manual override / disable auto-deploy

- Pause: rename the workflow or remove push triggers temporarily
- Force run: **workflow_dispatch** in the Actions UI
- Skip docs: pushes that only change `docs/**` / `*.md` are ignored by design
