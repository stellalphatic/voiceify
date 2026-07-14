# Ops runbooks

Updated: 2026-07-14

## API down

1. `docker compose ps`
2. `docker compose logs api --tail=200`
3. Check postgres health: `docker compose exec postgres pg_isready`
4. Restart: `docker compose restart api`

## Redis / rate limit issues

1. `docker compose logs redis`
2. `docker compose restart redis`
3. API fails open on Redis errors (requests still serve)

## Credits stuck / org cannot talk

1. Query balance: SQL `select credit_balance_cents from organizations where id = '...'`
2. Grant demo credits: `POST /api/orgs/:orgId/billing/topup` as owner
3. Check ledger: `select * from credit_ledger where org_id = '...' order by created_at desc limit 20`

## Webhook delivery failing

1. `docker compose logs worker --tail=200`
2. Re-run test from Tools Studio
3. Verify receiver accepts `x-voiceify-signature`

## Voice quality / silence

1. Confirm `ELEVENLABS_API_KEY`, `GROQ_API_KEY`
2. Hit `POST /api/voice/warmup`
3. Check browser mic permissions for Scribe realtime
