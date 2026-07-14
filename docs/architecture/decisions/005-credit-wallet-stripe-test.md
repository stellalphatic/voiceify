# ADR 005: Credit wallet with Stripe test mode

Date: 2026-07-14  
Status: accepted

## Context

Voice turns burn variable provider cost (STT time, LLM tokens, TTS characters, tool HTTP). Flat seats alone underprice heavy users. We need metering before going live, but not PCI scope or production payouts during the EC2 rebuild.

## Decision

Implement an **org-scoped credit wallet** (`packages/usage`):

- Soft balance in Postgres ledger (`credit_ wh` / transactions).
- Each billable event appends an immutable debit/credit row; balance is derived or atomically updated in one transaction.
- Top-ups via **Stripe Checkout / PaymentIntents in test mode** (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`).
- Webhooks credit the wallet idempotently (`stripe_event_id` unique).
- Hard stop when balance ≤ 0 (configurable grace for demo orgs).

No live Stripe keys in the default `.env.example`.

## Alternatives

| Option | Why not |
|--------|---------|
| Invoice monthly only | No real-time kill switch; surprise bills |
| Pure prepaid Stripe Customer Balance | Less flexible for non-Stripe adjustments (admin grants, promos) |
| Live Stripe immediately | Premature PCI/process burden before product-market fit on EC2 |
| Unlimited usage on flat plan | Margin risk on voice |

## Consequences

- Worker may reconcile stuck webhooks and recompute balances.
- Metering must run server-side after successful provider usage, not on the client.
- Admin tools need audited grant/revoke paths.
- Switching test → live Stripe is a config + ADR update, not a schema rewrite if event ids stay unique.
