# Phase 07 — EC2 deploy harden
Updated: 2026-07-14  
Status: not started

## Goal

Production-ready single-host Docker Compose deploy on AWS EC2 with backups, TLS, and runbooks.

## Scope

- Follow [deployment/ec2.md](../deployment/ec2.md)
- nginx TLS (host or container), restrict Postgres/Redis ports
- Automated `scripts/backup-pg.sh` via cron
- Healthchecks on api/web/worker
- Log rotation + basic disk alarms
- Secrets only via `.env` with 600 perms

## Exit criteria

- [ ] `docker compose up -d` serves HTTPS (or documented TLS terminator)
- [ ] Restore drill from backup succeeds
- [ ] Voice turn works on public URL
- [ ] Runbooks cover top failures ([ops/runbooks.md](../ops/runbooks.md))

## Non-goals

- Kubernetes / ECS
- Multi-region active-active
- Telephony cutover
