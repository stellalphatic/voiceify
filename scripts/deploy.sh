#!/usr/bin/env bash
#
# Pull, rebuild, recreate, and then PROVE the running containers are serving the
# commit you just deployed. Run from the repo root on the server:
#
#   ./scripts/deploy.sh              # uses the tls profile
#   COMPOSE_PROFILE=  ./scripts/deploy.sh   # no profile (plain http on :8080)
#
set -euo pipefail

COMPOSE_PROFILE="${COMPOSE_PROFILE-tls}"
BRANCH="${BRANCH:-main}"
SERVICES="api worker web"

cd "$(dirname "$0")/.."

profile_args=()
[ -n "$COMPOSE_PROFILE" ] && profile_args=(--profile "$COMPOSE_PROFILE")

echo "==> Checking working tree"
if [ -n "$(git status --porcelain)" ]; then
  echo "!! Working tree has local changes. Commit, stash, or discard them first:" >&2
  git status --short >&2
  exit 1
fi

echo "==> Fetching origin/$BRANCH"
git fetch origin "$BRANCH"

before="$(git rev-parse HEAD)"
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"
after="$(git rev-parse HEAD)"

if [ "$before" = "$after" ]; then
  echo "    Already at $(git rev-parse --short HEAD) (rebuilding anyway)"
else
  echo "    $(git rev-parse --short "$before") -> $(git rev-parse --short "$after")"
fi

GIT_SHA="$(git rev-parse --short HEAD)"
BUILT_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
export GIT_SHA BUILT_AT
echo "==> Building $GIT_SHA"

# --no-cache on the app layers is not needed: Docker invalidates them from the
# COPY of changed sources. But the build MUST succeed before anything restarts,
# so build and up are separate steps rather than `up --build`.
docker compose "${profile_args[@]}" build --pull $SERVICES

echo "==> Recreating containers"
docker compose "${profile_args[@]}" up -d --force-recreate $SERVICES

echo "==> Waiting for API health"
deadline=$(( $(date +%s) + 180 ))
while :; do
  if docker compose "${profile_args[@]}" exec -T api \
      node -e "fetch('http://127.0.0.1:3001/health').then(r=>r.json()).then(j=>process.exit(j.ok?0:1)).catch(()=>process.exit(1))" \
      >/dev/null 2>&1; then
    break
  fi
  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "!! API did not become healthy in 180s. Last 60 log lines:" >&2
    docker compose "${profile_args[@]}" logs --tail=60 api >&2
    exit 1
  fi
  sleep 3
done

echo "==> Verifying deployed version"
api_sha="$(docker compose "${profile_args[@]}" exec -T api \
  node -e "fetch('http://127.0.0.1:3001/health').then(r=>r.json()).then(j=>console.log(j.gitSha))")"
web_sha="$(docker compose "${profile_args[@]}" exec -T web \
  sh -c "cat /usr/share/nginx/html/version.json" | sed 's/.*"gitSha":"\([^"]*\)".*/\1/')"

api_sha="$(echo "$api_sha" | tr -d '\r\n')"
web_sha="$(echo "$web_sha" | tr -d '\r\n')"

echo "    repo: $GIT_SHA"
echo "    api:  $api_sha"
echo "    web:  $web_sha"

if [ "$api_sha" != "$GIT_SHA" ] || [ "$web_sha" != "$GIT_SHA" ]; then
  echo "!! Version mismatch — containers are NOT running the current commit." >&2
  exit 1
fi

echo "==> Deployed $GIT_SHA successfully"
echo "    Hard-refresh the browser (Ctrl+Shift+R) to drop any cached HTML."
