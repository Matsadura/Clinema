#!/bin/sh
# Update the running stack to the latest main.
#
# With API_IMAGE/WEB_IMAGE set in .env, pulls the images CI published (fast,
# no compiling on the server); if that fails, or they're unset, builds
# locally. Then restarts only what changed and waits for health checks.
set -eu
cd "$(dirname "$0")/.."

git pull --ff-only
if grep -qE '^(API|WEB)_IMAGE=' .env 2>/dev/null && docker compose pull api web; then
  docker compose up -d --no-build --wait
else
  echo "Building images locally"
  docker compose build api
  docker compose build web
  docker compose up -d --wait
fi
docker image prune -f >/dev/null
docker compose ps --format '{{.Service}}\t{{.Status}}'
