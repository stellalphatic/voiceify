# Roadmap

Updated: 2026-07-20

## Shipped (current)

- Turborepo + Docker Compose on EC2
- Better Auth + orgs + RBAC
- Agents + versions + deploy
- Tools Studio + webhook tester
- Automation Packs (restaurant, receptionist, appointments)
- Usage metering + credit wallet + admin grants
- Knowledge ingest (text/PDF/DOCX) + hybrid retrieval
- Optional Qdrant mirror (`--profile vectors`)
- Llama 3.3 default LLM + Coqui XTTS TTS router hooks
- Guardrails synced to agent + injected on turns
- Privacy JSON export
- Conversations + analytics
- Embed widget bootstrap
- OpenAPI + interactive `/docs`
- Project report: `docs/PROJECT_REPORT.md`

## Next

- Playwright smoke suite
- Stronger embedding models for Qdrant
- Workflow graph executor
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
