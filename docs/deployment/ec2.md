# EC2 deployment (quick reference)

Updated: 2026-07-14

**Full walkthrough (API keys, instance size, DNS, TLS, smoke tests):**  
→ **[GO_LIVE.md](./GO_LIVE.md)**

## Short path

```bash
git clone https://github.com/stellalphatic/voiceify.git && cd voiceify
cp .env.example .env
# Fill BETTER_AUTH_SECRET, AI keys, and for prod:
# DOMAIN=voiceify.metapresence.co + https URL vars (see GO_LIVE.md)

docker compose up -d --build
docker compose exec api pnpm --filter @voiceify/db seed
docker compose exec api pnpm --filter @voiceify/auth seed:admin

# With subdomain + Let's Encrypt:
docker compose --profile tls up -d --build
```

- HTTP edge: `http://<ip>:8080`
- HTTPS edge: `https://voiceify.metapresence.co` (Caddy profile `tls`)

## Stripe

Optional. Keep `STRIPE_ENABLED=false`. Use admin credit grants or Settings demo top-up.

## Health

- `GET /health`
- `GET /api/health` (provider capability flags)
