#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/Meta-ads-builder-2}"
BRANCH="${DEPLOY_BRANCH:-main}"
APP_NAME="${PM2_APP_NAME:-wiggly}"
REQUIRED_ENV_VARS=(
  CONVEX_DEPLOY_KEY
  CONVEX_URL
  NEXT_PUBLIC_CONVEX_URL
  FIRECRAWL_API_KEY
  GROQ_API_KEY
  GEMINI_API_KEY
)

for env_var in "${REQUIRED_ENV_VARS[@]}"; do
  if [ -z "${!env_var:-}" ]; then
    echo "Missing required production env var: $env_var" >&2
    exit 1
  fi
done

cd "$APP_DIR"

git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

(cd apps/web && npx convex deploy)
npm run build
export NODE_ENV=production
export PORT="${PORT:-3000}"
pm2 delete "$APP_NAME" >/dev/null 2>&1 || true
pm2 start npm --name "$APP_NAME" --update-env -- run start
pm2 save
