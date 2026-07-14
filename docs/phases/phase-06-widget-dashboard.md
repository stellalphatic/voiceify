# Phase 06 — Widget + dashboard
Updated: 2026-07-14  
Status: partial (legacy SPA)

## Goal

Polish tenant dashboard and ship an embeddable widget that speaks to the authenticated/public agent endpoints.

## Scope

- Migrate dashboard routes into `apps/web`
- Build `apps/widget` bundle served at `/widget`
- Embed snippet (script tag + agent public key)
- Mic permissions, reconnect, interrupt, basic transcripts UI
- Org settings: members invite (simple), API keys for widget

## Exit criteria

- [ ] Embed on a static HTML page completes a voice turn
- [ ] Dashboard shows agents, usage, packs
- [ ] Widget respects org branding basics (name, colors optional)
- [ ] Lighthouse/a11y smoke on auth + dashboard home

## Non-goals

- Full design-system overhaul
- Mobile native SDKs
