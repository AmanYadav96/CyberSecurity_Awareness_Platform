#!/usr/bin/env bash
# ============================================================
# Deploy React/Vite frontend to Vercel
# Usage:
#   export VERCEL_TOKEN=<your_token>
#   export VITE_API_URL=https://your-backend.vercel.app/api
#   bash deploy-frontend.sh
# ============================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

if [ -z "$VERCEL_TOKEN" ]; then
  echo "ERROR: VERCEL_TOKEN is not set."
  echo "  1. Go to https://vercel.com/account/tokens"
  echo "  2. Create a new token"
  echo "  3. Run: export VERCEL_TOKEN=<your_token>"
  exit 1
fi

if [ -z "$VITE_API_URL" ]; then
  echo "ERROR: VITE_API_URL is not set."
  echo "  Set it to your deployed backend URL, e.g.:"
  echo "  export VITE_API_URL=https://cyber-security-backend.vercel.app/api"
  exit 1
fi

echo "==> Deploying frontend to Vercel with API_URL=$VITE_API_URL..."
cd "$FRONTEND_DIR"

vercel deploy --prod --yes \
  --token "$VERCEL_TOKEN" \
  --name "cybersecurityap" \
  --build-env VITE_API_URL="$VITE_API_URL" \
  --env VITE_API_URL="$VITE_API_URL" \
  2>&1 | tee /tmp/vercel-frontend-deploy.log

FRONTEND_URL=$(grep -oE 'https://[^ ]+\.vercel\.app' /tmp/vercel-frontend-deploy.log | tail -1)

if [ -z "$FRONTEND_URL" ]; then
  echo "WARNING: Could not automatically detect frontend URL from deploy output."
  echo "  Check https://vercel.com/dashboard for your deployment URL."
else
  echo ""
  echo "==> Frontend deployed successfully!"
  echo "    URL: $FRONTEND_URL"
  echo ""
  echo "    IMPORTANT: Update backend FRONTEND_URL env var to: $FRONTEND_URL"
  echo "    Run: vercel env add FRONTEND_URL production --token \$VERCEL_TOKEN"
  echo "         (enter value: $FRONTEND_URL)"
fi
