# Compliance notes
Updated: 2026-07-20

## Shipped foundations

- Multi-tenant `org_id` isolation on product data.
- Server-only provider secrets.
- Privacy / portability export: `GET /api/orgs/:orgId/privacy/export` (Settings → Privacy & data export).
- Password change and reset flows (Better Auth).
- Threat model: [../security/threat-model.md](../security/threat-model.md).

## Not certified yet (roadmap)

Documented in [PROJECT_REPORT.md](../PROJECT_REPORT.md) §10 and [roadmap.md](../roadmap.md):

- Formal GDPR erasure SLA automation
- DPA / subprocessors register
- SOC 2 Type II program
- HIPAA BAA path
- EU AI Act disclosure UX on embeds/telephony
- SSO (SAML/OIDC)
- Immutable audit log
- Call-recording consent for telephony

Do not claim certification in marketing until the corresponding controls ship.
