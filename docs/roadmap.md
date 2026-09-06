# Roadmap

Updated: 2026-09-06

## Shipped (current)

- Turborepo + Docker Compose on EC2
- Better Auth + orgs + RBAC
- Agents + versions + deploy
- Tools Studio + webhook tester
- Automation Packs (restaurant, receptionist, appointments)
- Usage metering + credit wallet + admin grants
- Knowledge ingest (text/PDF/DOCX) + hybrid retrieval
- Optional Qdrant mirror (`--profile vectors`)
- Qwen 3.8 27B default LLM + Coqui XTTS TTS router hooks
- Guardrails synced to agent + injected on turns
- Privacy JSON export
- Conversations + analytics
- Embed widget with persisted, origin-bound sessions plus text and microphone modes
- Server-persisted workflow graphs consumed as active conversation guidance
- BullMQ webhook delivery and usage-rollup workers
- OpenAPI + interactive `/docs`
- Project report: `docs/PROJECT_REPORT.md`

## Next

- Playwright smoke suite
- Stronger embedding models for Qdrant
- Deterministic workflow node traversal, branch conditions, and resumable execution state
- Live call monitor UI
- Stripe Checkout + webhooks completion
- Self-hosted vLLM / Ollama profile

## Platform / compliance

- Telephony (Twilio/SIP) — Phase 8
- Human warm transfer
- SSO (SAML/OIDC)
- Immutable audit log
- GDPR erasure automation + DPA pack
- SOC 2 readiness
- AI disclosure on embeds

## Non-goals (v1)

- Clerk / Supabase / LiveKit as required vendors
- Multi-region HA
- Claiming SOC2/HIPAA certification before controls exist
