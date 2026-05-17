#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/Meta-ads-builder-2}"
BRANCH="${DEPLOY_BRANCH:-main}"
APP_NAME="${PM2_APP_NAME:-wiggly}"

cd "$APP_DIR"

git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

npm run build
pm2 restart "$APP_NAME" --update-env
pm2 save
