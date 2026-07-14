# Phase 05 — Credits + Stripe test
Updated: 2026-07-14  
Status: not started

## Goal

Org credit wallet with debit on voice usage and top-up via Stripe test mode webhooks (ADR 005).

## Scope

- Ledger tables + `packages/usage`
- Debit after successful billable turns
- Soft warning threshold + hard stop at 0
- Stripe Checkout (test) + webhook idempotency
- Admin grant path (audited)

## Exit criteria

- [ ] Test payment credits wallet balance
- [ ] Duplicate webhook does not double-credit
- [ ] Zero-balance org cannot start a new turn
- [ ] Usage dashboard shows recent debits

## Non-goals

- Live Stripe keys
- Invoicing / net-30
- Per-seat SaaS plans (can layer later)
