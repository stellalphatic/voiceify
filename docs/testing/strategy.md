# Testing strategy

Updated: 2026-07-14

## Layers

| Layer | Tool | Location |
|-------|------|----------|
| Unit | Vitest | `packages/*/src/**/*.test.ts`, `apps/web/src/**/*.test.ts` |
| API reference generation | Vitest | Shared endpoint metadata and generated OpenAPI shape |
| Live route/OpenAPI parity | Planned integration test | Compare mounted API routes with `GET /api/openapi.json` |
| Manual E2E | Browser | Auth → org → pack install → voice sandbox |

## Commands

```bash
pnpm test
pnpm typecheck
pnpm --filter @voiceify/web test
pnpm --filter @voiceify/shared test
pnpm --filter @voiceify/voice test
```

## Must-pass scenarios (FYP)

1. Sign up → org created with trial credits
2. Install Restaurant pack → menu seeded → `create_reservation` writes DB row
3. Deploy agent → embed public session returns agent
4. Voice turn deducts credits (`credit_ledger`)
5. Webhook test endpoint returns signature headers

## Coverage gaps

- Playwright e2e not yet wired
- Stripe live charges (test-mode grant path only)
- Telephony (out of v1)
