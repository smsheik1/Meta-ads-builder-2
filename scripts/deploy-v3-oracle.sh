#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/Meta-ads-builder-2}"
BRANCH="${DEPLOY_BRANCH:-main}"
V3_APP_NAME="${PM2_V3_APP_NAME:-wiggly-v3}"
V3_WORKER_APP_NAME="${PM2_V3_WORKER_APP_NAME:-wiggly-v3-render-worker}"
V3_PORT="${V3_PORT:-3020}"

REQUIRED_ENV_VARS=(
  V3_CONVEX_DEPLOY_KEY
  V3_CONVEX_URL
  NEXT_PUBLIC_V3_CONVEX_URL
  NEXT_PUBLIC_V3_CONVEX_SITE_URL
  FIRECRAWL_API_KEY
  GEMINI_API_KEY
)

for env_var in "${REQUIRED_ENV_VARS[@]}"; do
  if [ -z "${!env_var:-}" ]; then
    echo "Missing required v3 production env var: $env_var" >&2
    exit 1
  fi
done

export CONVEX_DEPLOY_KEY="$V3_CONVEX_DEPLOY_KEY"
export CONVEX_URL="$V3_CONVEX_URL"
export NEXT_PUBLIC_CONVEX_URL="$NEXT_PUBLIC_V3_CONVEX_URL"
export NEXT_PUBLIC_CONVEX_SITE_URL="$NEXT_PUBLIC_V3_CONVEX_SITE_URL"
export TTS_MODEL="${TTS_MODEL:-gemini-3.1-flash-tts-preview}"

cd "$APP_DIR"

git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

cd "$APP_DIR/v3"

if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

npx convex deploy
npm run test
npm run typecheck
npm run build
npm run remotion:still
npm run runtime:health

export NODE_ENV=production
export PORT="$V3_PORT"

pm2 delete "$V3_APP_NAME" >/dev/null 2>&1 || true
pm2 start npm --name "$V3_APP_NAME" --update-env -- run start

pm2 delete "$V3_WORKER_APP_NAME" >/dev/null 2>&1 || true
pm2 start npm --name "$V3_WORKER_APP_NAME" --update-env -- run render-worker:watch

pm2 save
pm2 status
