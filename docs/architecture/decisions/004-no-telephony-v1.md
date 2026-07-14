# ADR 004: No telephony in v1

Date: 2026-07-14  
Status: accepted

## Context

Restaurant, clinic, and SMB buyers often ask for phone numbers. PSTN/SIP brings carriers, number inventory, call recording compliance, concurrent call capacity planning, and a different billing model. The rebuild’s immediate goal is a reliable multi-tenant web voice product on one EC2 host.

## Decision

**v1 ships browser and widget voice only.** No Twilio/Vonage/SIP trunk, no inbound DID provisioning, no call transfer to PSTN.

Marketing copy may say “answers every call” in the product-sense of voice conversations; engineering scope is web realtime + utterance modes until a later ADR revisits telephony.

## Alternatives

| Option | Why not (for v1) |
|--------|------------------|
| Twilio Voice / SIP from day one | Doubles infra and compliance scope before auth/credits are solid |
| Partner reseller DID only | Still needs media bridging, recording retention, and fraud controls |
| Fake “phone” UI without PSTN | Misleading; damages trust |

## Consequences

- Roadmap telephony is explicitly Phase post-07 (see [roadmap.md](../../roadmap.md)).
- Competitive comparisons must be honest: Retell/Vapi/Bland are stronger on phone today.
- Widget UX, mic permissions, and reconnect logic get full attention.
- When telephony lands, it should reuse the same agent/tool/credit core, not fork the pipeline.
