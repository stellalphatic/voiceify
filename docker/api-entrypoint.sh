#!/bin/sh
set -eu

echo "[api] waiting for database…"
# Simple retry loop for migrate
i=0
until pnpm --filter @voiceify/db migrate; do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then
    echo "[api] migrations failed after retries" >&2
    exit 1
  fi
  echo "[api] migrate retry $i/30…"
  sleep 2
done

echo "[api] starting"
exec pnpm --filter @voiceify/api start
