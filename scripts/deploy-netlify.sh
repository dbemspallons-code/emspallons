#!/usr/bin/env bash
set -euo pipefail

: "${NETLIFY_SITE_ID:?NETLIFY_SITE_ID manquant}"
: "${NETLIFY_AUTH_TOKEN:?NETLIFY_AUTH_TOKEN manquant}"

echo "==> Build web-pwa"
(cd web-pwa && npm ci && npm run build)

echo "==> Deploiement Netlify"
npx netlify deploy --prod --dir="web-pwa/dist" --site="$NETLIFY_SITE_ID" --auth="$NETLIFY_AUTH_TOKEN" --message "${DEPLOY_MESSAGE:-Prod deploy}"

echo "Deploiement termine."
