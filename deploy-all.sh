#!/usr/bin/env bash
# ============================================================
# Deploy full stack (Django backend + React frontend) to Vercel
#
# Prerequisites:
#   1. Vercel account at https://vercel.com
#   2. Vercel token from https://vercel.com/account/tokens
#
# Usage:
#   export VERCEL_TOKEN=<your_token>
#   bash deploy-all.sh
# ============================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -z "$VERCEL_TOKEN" ]; then
  echo "=============================================="
  echo "  ERROR: VERCEL_TOKEN environment variable not set"
  echo "=============================================="
  echo ""
  echo "Steps to get your token:"
  echo "  1. Go to https://vercel.com/account/tokens"
  echo "  2. Click 'Create Token'"
  echo "  3. Give it a name (e.g. 'deploy-cyberaware')"
  echo "  4. Run: export VERCEL_TOKEN=<paste_token_here>"
  echo "  5. Run: bash deploy-all.sh"
  echo ""
  exit 1
fi

echo "=============================================="
echo "  CyberAware Platform — Full Stack Deploy"
echo "=============================================="
echo ""

# ── Step 1: Deploy Backend ──────────────────────────────────
echo "[1/2] Deploying Django backend..."
cd "$SCRIPT_DIR/backend"

vercel deploy --prod --yes \
  --token "$VERCEL_TOKEN" \
  --name "cyber-security-backend" \
  2>&1 | tee /tmp/vercel-backend.log

BACKEND_URL=$(grep -oE 'https://[a-z0-9._-]+\.vercel\.app' /tmp/vercel-backend.log | tail -1)

if [ -z "$BACKEND_URL" ]; then
  echo ""
  echo "  Could not auto-detect backend URL. Check /tmp/vercel-backend.log"
  echo "  Please enter your backend Vercel URL (e.g. https://cyber-security-backend.vercel.app):"
  read -r BACKEND_URL
fi

echo "  Backend URL : $BACKEND_URL"
echo "  API Base URL: $BACKEND_URL/api"
echo ""

# ── Step 2: Deploy Frontend ─────────────────────────────────
echo "[2/2] Deploying React/Vite frontend..."
cd "$SCRIPT_DIR/frontend"

vercel deploy --prod --yes \
  --token "$VERCEL_TOKEN" \
  --name "cybersecurityap" \
  --build-env VITE_API_URL="$BACKEND_URL/api" \
  --env VITE_API_URL="$BACKEND_URL/api" \
  2>&1 | tee /tmp/vercel-frontend.log

FRONTEND_URL=$(grep -oE 'https://[a-z0-9._-]+\.vercel\.app' /tmp/vercel-frontend.log | tail -1)

if [ -z "$FRONTEND_URL" ]; then
  echo ""
  echo "  Could not auto-detect frontend URL. Check /tmp/vercel-frontend.log"
  echo "  Please enter your frontend Vercel URL:"
  read -r FRONTEND_URL
fi

echo "  Frontend URL: $FRONTEND_URL"
echo ""

# ── Step 3: Update backend FRONTEND_URL ────────────────────
echo "[3/3] Updating backend FRONTEND_URL environment variable..."
cd "$SCRIPT_DIR/backend"

echo "$FRONTEND_URL" | vercel env add FRONTEND_URL production \
  --token "$VERCEL_TOKEN" --yes 2>/dev/null || \
  vercel env rm FRONTEND_URL production --token "$VERCEL_TOKEN" --yes 2>/dev/null && \
  echo "$FRONTEND_URL" | vercel env add FRONTEND_URL production --token "$VERCEL_TOKEN" --yes 2>/dev/null || \
  echo "  (Skipped — update FRONTEND_URL manually in Vercel dashboard)"

echo ""
echo "=============================================="
echo "  Deployment complete!"
echo "=============================================="
echo ""
echo "  Backend  : $BACKEND_URL"
echo "  API      : $BACKEND_URL/api"
echo "  Frontend : $FRONTEND_URL"
echo ""
echo "  Admin panel: $BACKEND_URL/admin"
echo ""
