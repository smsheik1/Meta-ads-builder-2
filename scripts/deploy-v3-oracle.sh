#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/Meta-ads-builder-2}"
BRANCH="${DEPLOY_BRANCH:-main}"
V3_APP_NAME="${PM2_V3_APP_NAME:-wiggly-v3}"
V3_WORKER_APP_NAME="${PM2_V3_WORKER_APP_NAME:-wiggly-v3-render-worker}"
V3_PORT="${V3_PORT:-3020}"
V3_PUBLIC_HOST="${V3_PUBLIC_HOST:-}"
V3_NGINX_SITE_NAME="${V3_NGINX_SITE_NAME:-wiggly-v3}"

REQUIRED_ENV_VARS=(
  V3_CONVEX_DEPLOY_KEY
  V3_CONVEX_URL
  NEXT_PUBLIC_V3_CONVEX_URL
  NEXT_PUBLIC_V3_CONVEX_SITE_URL
  FIRECRAWL_API_KEY
  DEEPGRAM_API_KEY
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

if [ -n "$V3_PUBLIC_HOST" ]; then
  if ! [[ "$V3_PUBLIC_HOST" =~ ^[A-Za-z0-9.-]+$ ]]; then
    echo "V3_PUBLIC_HOST must be a plain hostname, got: $V3_PUBLIC_HOST" >&2
    exit 1
  fi

  V3_CERT_FULLCHAIN="/etc/letsencrypt/live/$V3_PUBLIC_HOST/fullchain.pem"
  V3_CERT_PRIVKEY="/etc/letsencrypt/live/$V3_PUBLIC_HOST/privkey.pem"

  if sudo test -f "$V3_CERT_FULLCHAIN" && sudo test -f "$V3_CERT_PRIVKEY"; then
    sudo tee "/etc/nginx/sites-available/$V3_NGINX_SITE_NAME" >/dev/null <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $V3_PUBLIC_HOST;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name $V3_PUBLIC_HOST;

    ssl_certificate $V3_CERT_FULLCHAIN;
    ssl_certificate_key $V3_CERT_PRIVKEY;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 350M;

    location / {
        proxy_pass http://127.0.0.1:$V3_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
EOF
  else
    sudo tee "/etc/nginx/sites-available/$V3_NGINX_SITE_NAME" >/dev/null <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $V3_PUBLIC_HOST;

    client_max_body_size 350M;

    location / {
        proxy_pass http://127.0.0.1:$V3_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
EOF
  fi
  sudo ln -sf "/etc/nginx/sites-available/$V3_NGINX_SITE_NAME" "/etc/nginx/sites-enabled/$V3_NGINX_SITE_NAME"
  sudo nginx -t
  sudo systemctl reload nginx
fi
