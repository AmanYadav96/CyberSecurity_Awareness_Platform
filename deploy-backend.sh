#!/usr/bin/env bash
# ============================================================
# Deploy Django backend to Vercel
# Usage:
#   export VERCEL_TOKEN=<your_token>
#   bash deploy-backend.sh
# ============================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"

if [ -z "$VERCEL_TOKEN" ]; then
  echo "ERROR: VERCEL_TOKEN is not set."
  echo "  1. Go to https://vercel.com/account/tokens"
  echo "  2. Create a new token"
  echo "  3. Run: export VERCEL_TOKEN=<your_token>"
  exit 1
fi

echo "==> Deploying backend to Vercel..."
cd "$BACKEND_DIR"

vercel deploy --prod --yes \
  --token "$VERCEL_TOKEN" \
  --name "cyber-security-backend" \
  2>&1 | tee /tmp/vercel-backend-deploy.log

BACKEND_URL=$(grep -oE 'https://[^ ]+\.vercel\.app' /tmp/vercel-backend-deploy.log | tail -1)

if [ -z "$BACKEND_URL" ]; then
  echo "WARNING: Could not automatically detect backend URL from deploy output."
  echo "  Check https://vercel.com/dashboard for your deployment URL."
else
  echo ""
  echo "==> Backend deployed successfully!"
  echo "    URL: $BACKEND_URL"
  echo "    API: $BACKEND_URL/api"
  echo ""
  echo "    Next step: run deploy-frontend.sh with VITE_API_URL=$BACKEND_URL/api"
  echo "    Or run: VITE_API_URL=$BACKEND_URL/api bash deploy-frontend.sh"
fi
