# Phase 04 — Automation Packs
Updated: 2026-07-14  
Status: not started

## Goal

Ship installable Packs that materialize agents + tools for restaurant, healthcare, and support verticals (ADR 006).

## Scope

- Pack manifest schema (version, agents, tools, checklist)
- First-party Packs in `packages/automations`
- Install API: copy into org, mark pack_installs row
- Dashboard Pack gallery + post-install checklist

## Exit criteria

- [ ] Install restaurant Pack → agent + tools visible in org
- [ ] Re-install is idempotent or clearly versioned upgrade
- [ ] Pack docs include required external credentials (e.g. booking API)
- [ ] Competitor messaging can cite live Packs

## Non-goals

- Third-party Pack marketplace
- Paid Pack revenue share
