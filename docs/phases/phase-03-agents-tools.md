# Phase 03 — Agents + Tools Studio
Updated: 2026-07-14  
Status: not started

## Goal

Tenants create agents and attach HTTP tools with validation, secrets refs, and allowlisted egress.

## Scope

- CRUD agents (`packages/agents`) scoped by `org_id`
- Tools Studio: method, URL, headers/auth secret ref, JSON schema, timeout
- Runtime tool loop in voice pipeline with max iterations
- Audit log of tool invocations (redact secrets)

## Exit criteria

- [ ] Agent create/update/archive in dashboard
- [ ] Tool call succeeds against a mock HTTP server in tests
- [ ] Blocked hostnames (metadata IP, localhost) rejected
- [ ] Tool failures surface as spoken fallback, not stack traces

## Non-goals

- Arbitrary code execution tools
- Marketplace publishing
