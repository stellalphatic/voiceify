# Voiceify go-live guide

Updated: 2026-07-14

End-to-end instructions to get API keys, pick an EC2 instance, deploy Docker Compose, and attach **voiceify.metapresence.co**.

Repository: [stellalphatic/voiceify](https://github.com/stellalphatic/voiceify)

---

## What you need to pay for

| Resource | Required? | Notes |
|----------|-----------|--------|
| AWS EC2 | Yes | Single instance runs the whole stack |
| ElevenLabs | Yes | STT (Scribe) + TTS |
| Groq and/or Gemini | Yes | LLM (Groq first, Gemini fallback) |
| Domain DNS | Yes | A record for the subdomain |
| Stripe | **No** | Optional. Credits work via admin portal / demo top-up |
| Clerk / Supabase / LiveKit / Twilio | No | Not used in v1 |

---

## Step 1 — Create API keys

### 1a. Google Gemini (LLM fallback)

1. Open [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with a Google account
3. **Create API key** → copy the key
4. Put it in `.env` as `GEMINI_API_KEY=...`

### 1b. Groq (primary LLM — fast)

1. Open [Groq Console](https://console.groq.com/keys)
2. Create an account → **API Keys** → **Create API Key**
3. Put it in `.env` as `GROQ_API_KEY=...`

### 1c. ElevenLabs (STT + TTS)

1. Open [ElevenLabs](https://elevenlabs.io/) → sign up / log in
2. Go to **Developers → API Keys** (or profile → API Key)
3. Create a key with access to **Text to Speech** and **Speech to Text / Scribe**
4. Put it in `.env` as `ELEVENLABS_API_KEY=...`
5. For production demos, use a paid plan so rate limits and realtime Scribe are available

### 1d. Auth secret (not a third-party API)

On your laptop or the EC2 host:

```bash
openssl rand -base64 32
```

Put the result in `.env` as `BETTER_AUTH_SECRET=...`

### 1d2. Resend (password reset email)

Required for “Forgot password”. Without it, reset requests succeed for privacy but no email is delivered.

1. Create an account at [Resend](https://resend.com/)
2. **API Keys → Create** → copy into `.env` as `RESEND_API_KEY=re_...` (no surrounding quotes)
3. Verify a sending domain, then set `RESEND_FROM_EMAIL=Voiceify <noreply@your-verified-domain>`
4. Recreate API so Compose injects the new vars:

```bash
docker compose up -d --force-recreate api
docker compose exec -T api printenv RESEND_API_KEY | head -c 8
# should print re_… prefix (not empty, not starting with a quote)
curl -s https://your-domain/api/health | jq .emailConfigured
# true
```

5. In **/admin → overview**, click **Send test email to me**. Check `docker compose logs api --tail=80` for `[voiceify/email]`.

**Signup note:** signups are approved immediately by default (`AUTO_APPROVE_SIGNUPS=true`), so new users land in the dashboard right after registering. Set it to `false` only if you want admin review first, in which case new users stay `pending` until approved in `/admin → Users`. Admins can still suspend or reject any account at any time.

Reset flow: `/auth?mode=forgot` → email link → `/auth/reset-password?token=…`

CI/CD secrets and EC2 auto-deploy: see [github-actions-ec2.md](./github-actions-ec2.md).

Docker Compose profiles, TLS, and why `--force-recreate` matters: see [first-principles-docker.md](./first-principles-docker.md).

### 1e. Stripe (skip for now)

Leave these unset / false:

```bash
STRIPE_ENABLED=false
ALLOW_DEMO_TOPUP=true
```

Credits are granted by:

- Platform admin at `/admin` → org credits
- Dashboard **Settings** → “Add $25 demo credits” (when demo top-up is allowed)

---

## Step 2 — Pick an EC2 instance

| Workload | Instance | vCPU / RAM | Notes |
|----------|----------|------------|--------|
| FYP / internal demo | **t3.small** | 2 / 2 GB | Minimum viable |
| Public demo / a few concurrent calls | **t3.medium** | 2 / 4 GB | **Recommended** |
| Heavier trials | t3.large | 2 / 8 GB | Optional |

Also set:

- **AMI:** Ubuntu 22.04 or 24.04 LTS
- **Storage:** 30 GB gp3
- **Security group inbound:**
  - `22` SSH from your IP
  - `80` HTTP (Let’s Encrypt + redirects)
  - `443` HTTPS
  - Optional `8080` during setup (HTTP via nginx without TLS)
- **Elastic IP** so DNS stays stable

---

## Step 3 — DNS for voiceify.metapresence.co

In your DNS provider for `metapresence.co`:

| Type | Name | Value |
|------|------|--------|
| A | `voiceify` | `<EC2 Elastic IP>` |

Wait until it resolves:

```bash
nslookup voiceify.metapresence.co
```

---

## Step 4 — Bootstrap the EC2 host

```bash
ssh ubuntu@<elastic-ip>

sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-plugin git curl
sudo usermod -aG docker $USER
newgrp docker

git clone https://github.com/stellalphatic/voiceify.git
cd voiceify
cp .env.example .env
nano .env
```

### Production `.env` (HTTPS subdomain)

```bash
DOMAIN="voiceify.metapresence.co"
ACME_EMAIL="admin@metapresence.co"

APP_URL="https://voiceify.metapresence.co"
WEB_ORIGIN="https://voiceify.metapresence.co"
BETTER_AUTH_URL="https://voiceify.metapresence.co"
BETTER_AUTH_TRUSTED_ORIGINS="https://voiceify.metapresence.co"

BETTER_AUTH_SECRET="<openssl rand -base64 32>"

POSTGRES_USER="voiceify"
POSTGRES_PASSWORD="<strong-db-password>"
POSTGRES_DB="voiceify"

GEMINI_API_KEY="..."
GROQ_API_KEY="..."
ELEVENLABS_API_KEY="..."

PLATFORM_ADMIN_EMAIL="admin@metapresence.co"
PLATFORM_ADMIN_PASSWORD="<strong-password>"
AUTO_APPROVE_SIGNUPS="true"

STRIPE_ENABLED="false"
ALLOW_DEMO_TOPUP="true"
```

> Compose sets `DATABASE_URL` / `REDIS_URL` to the internal Docker network automatically. You do **not** need host `localhost:5433` URLs inside the container.

---

## Step 5 — Deploy with Docker Compose

### First boot (HTTP ok for smoke test)

```bash
docker compose up -d --build
docker compose ps
curl -sf http://127.0.0.1:8080/health
```

The API container **runs migrations on start**. Then seed admin (one-time):

```bash
# From the host, against mapped Postgres
export DATABASE_URL="postgresql://voiceify:<password>@127.0.0.1:5433/voiceify"
# If Node/pnpm not installed on host, run seed inside the api container instead:
docker compose exec api pnpm --filter @voiceify/db seed
docker compose exec api pnpm --filter @voiceify/auth seed:admin
```

Seed needs `BETTER_AUTH_*` env available inside the container (already from compose).

### Enable HTTPS for the subdomain

Open security group ports **80** and **443**, then:

```bash
docker compose --profile tls up -d --build
```

Caddy terminates TLS for `DOMAIN` and proxies to `api` + `web`.

Verify:

```bash
curl -sf https://voiceify.metapresence.co/health
curl -I https://voiceify.metapresence.co/
```

Open the site:

- App: https://voiceify.metapresence.co  
- Admin: https://voiceify.metapresence.co/admin  
- OpenAPI: https://voiceify.metapresence.co/api/openapi.json  

---

## Step 6 — Smoke test checklist

1. Sign up a normal user → should see **pending approval**
2. Sign in as platform admin → approve the user in `/admin`
3. User signs in → dashboard loads
4. **Settings** → credit balance visible; demo top-up works without Stripe
5. Create / edit an agent → persists after refresh
6. Sandbox / demo voice turn with mic → STT + LLM + TTS
7. Embed snippet loads `/widget.js` (200 OK)
8. `GET /api/health` shows `elevenlabs`, `groq`, `gemini` flags

---

## Feature map (vs Vapi / Retell)

| Capability | Voiceify v1 |
|------------|-------------|
| Realtime STT (Scribe) | Yes |
| Streaming TTS (ElevenLabs PCM) | Yes |
| LLM (Groq → Gemini) | Yes |
| Barge-in / interrupt | Client-side |
| Multi-tenant orgs + RBAC | Yes |
| Agent versions + deploy | Yes |
| Tools + Automation Packs | Yes |
| Knowledge inject into turns | Yes (ILIKE retrieval) |
| Usage + credit wallet | Yes |
| Web embed widget | Bootstrap + session |
| Super-admin portal | Yes |
| Stripe checkout | Optional / off by default |
| Phone / SIP / Twilio | Out of scope for v1 |

---

## CI/CD

- **CI:** `.github/workflows/ci.yml` — pnpm typecheck, lint, test, build on every push
- **Deploy:** `.github/workflows/deploy-ec2.yml` — SSH pull + `docker compose up -d --build`

GitHub secrets: `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`, optional `EC2_APP_DIR`

---

## Rollback & backups

```bash
# Rollback code
git fetch origin && git reset --hard <good-sha>
docker compose up -d --build

# Backup DB
docker compose exec -T postgres pg_dump -U voiceify voiceify > backup-$(date +%F).sql
```

---

## Common failures

| Symptom | Fix |
|---------|-----|
| Auth cookies fail on HTTPS | Set `APP_URL` / `WEB_ORIGIN` / `BETTER_AUTH_URL` / `TRUSTED_ORIGINS` to `https://voiceify.metapresence.co` |
| Voice “API unavailable” | Check `/api/health` and AI keys in the **api** container env |
| Signup cannot enter dashboard | Expected until `/admin` approves the user |
| Caddy certificate fails | DNS A record must point to this host; ports 80/443 open |
| Migrations fail | Check Postgres health: `docker compose logs postgres` |
