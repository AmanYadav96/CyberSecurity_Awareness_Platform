# Deployment Guide — CyberAware Platform

Deploy the Django backend and React/Vite frontend independently to Vercel.

---

## Prerequisites

| Tool | Install command |
|------|----------------|
| Node.js ≥ 18 | [nodejs.org](https://nodejs.org) |
| Vercel CLI | `npm install -g vercel` |
| Vercel account | [vercel.com/signup](https://vercel.com/signup) |
| Vercel token | [vercel.com/account/tokens](https://vercel.com/account/tokens) |

---

## Quick Deploy (One Command)

```bash
export VERCEL_TOKEN=<your_vercel_token>
bash deploy-all.sh
```

---

## Step-by-Step Runnable Commands

### 0. Install Vercel CLI

```bash
npm install -g vercel
vercel --version        # should print version e.g. 54.x.x
```

### 1. Get a Vercel Token

1. Log in at <https://vercel.com>
2. Go to **Account Settings → Tokens**
3. Click **Create Token**, give it a name, copy it
4. Export it in your terminal:

```bash
export VERCEL_TOKEN=xxxxxxxxxxxxxxxxxxxxxx
```

---

### 2. Deploy Backend (Django)

```bash
cd backend
vercel deploy --prod --yes --token $VERCEL_TOKEN --name cyber-security-backend
```

After deployment, note the URL printed (e.g. `https://cyber-security-backend-xxx.vercel.app`).

#### Set required environment variables on the backend project

```bash
# Inside backend/ directory

# Django secret key (generate a strong random one)
echo "your-strong-secret-key" | vercel env add SECRET_KEY production --token $VERCEL_TOKEN --yes

# Database URL (Supabase Postgres)
echo "postgresql://postgres.derkuyyijoggrukjjlbs:Shriram@123@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres" \
  | vercel env add DATABASE_URL production --token $VERCEL_TOKEN --yes

# Django settings module
echo "core.settings" | vercel env add DJANGO_SETTINGS_MODULE production --token $VERCEL_TOKEN --yes

# Set to False in production
echo "False" | vercel env add DEBUG production --token $VERCEL_TOKEN --yes
```

Redeploy backend after setting env vars:

```bash
vercel deploy --prod --yes --token $VERCEL_TOKEN --name cyber-security-backend
```

---

### 3. Deploy Frontend (React/Vite)

Replace `<BACKEND_URL>` with the URL from step 2 (e.g. `https://cyber-security-backend-xxx.vercel.app`):

```bash
export BACKEND_URL=https://cyber-security-backend-xxx.vercel.app

cd ../frontend
vercel deploy --prod --yes \
  --token $VERCEL_TOKEN \
  --name cybersecurityap \
  --build-env VITE_API_URL="$BACKEND_URL/api" \
  --env VITE_API_URL="$BACKEND_URL/api"
```

After deployment, note the frontend URL (e.g. `https://cybersecurityap.vercel.app`).

---

### 4. Link Frontend URL Back to Backend

```bash
export FRONTEND_URL=https://cybersecurityap.vercel.app

cd ../backend

# Add FRONTEND_URL env var so CORS and CSRF are updated
echo "$FRONTEND_URL" | vercel env add FRONTEND_URL production --token $VERCEL_TOKEN --yes

# Redeploy backend to pick up the new FRONTEND_URL
vercel deploy --prod --yes --token $VERCEL_TOKEN --name cyber-security-backend
```

---

## Environment Variables Reference

### Backend (set in Vercel dashboard or via CLI)

| Variable | Required | Example |
|----------|----------|---------|
| `SECRET_KEY` | Yes | `some-random-secret-key` |
| `DATABASE_URL` | Yes | `postgresql://user:pass@host:port/db` |
| `DJANGO_SETTINGS_MODULE` | Yes | `core.settings` |
| `DEBUG` | No | `False` |
| `FRONTEND_URL` | Yes | `https://cybersecurityap.vercel.app` |
| `ALLOWED_HOSTS` | No | `*` |

### Frontend (Vite build-time env vars)

| Variable | Required | Example |
|----------|----------|---------|
| `VITE_API_URL` | Yes | `https://cyber-security-backend-xxx.vercel.app/api` |

---

## Local Development

```bash
# Terminal 1 — Backend
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Terminal 2 — Frontend
cd frontend
npm install
# .env.local already sets VITE_API_URL=http://localhost:8000/api
npm run dev
```

Open <http://localhost:5173>

---

## All Runnable Commands (Copy-Paste List)

```bash
# ── 0. Install CLI ──────────────────────────────────────────
npm install -g vercel

# ── 1. Set your token ───────────────────────────────────────
export VERCEL_TOKEN=<your_vercel_token>

# ── 2. Deploy backend ───────────────────────────────────────
cd backend
vercel deploy --prod --yes --token $VERCEL_TOKEN --name cyber-security-backend

export BACKEND_URL=https://cyber-security-awareness-platform-dusky.vercel.app

# Set backend env vars
echo "core.settings"  | vercel env add DJANGO_SETTINGS_MODULE production --token $VERCEL_TOKEN --yes
echo "False"           | vercel env add DEBUG production --token $VERCEL_TOKEN --yes
echo "your-secret-key" | vercel env add SECRET_KEY production --token $VERCEL_TOKEN --yes
echo "postgresql://postgres.derkuyyijoggrukjjlbs:Shriram@123@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres" \
                       | vercel env add DATABASE_URL production --token $VERCEL_TOKEN --yes

# Redeploy backend
vercel deploy --prod --yes --token $VERCEL_TOKEN --name cyber-security-backend

# ── 3. Deploy frontend ──────────────────────────────────────
cd ../frontend
vercel deploy --prod --yes \
  --token $VERCEL_TOKEN \
  --name cybersecurityap \
  --build-env VITE_API_URL="$BACKEND_URL/api" \
  --env VITE_API_URL="$BACKEND_URL/api"

export FRONTEND_URL=https://cybersecurityap.vercel.app   # update after frontend deploys

# ── 4. Update backend FRONTEND_URL ──────────────────────────
cd ../backend
echo "$FRONTEND_URL" | vercel env add FRONTEND_URL production --token $VERCEL_TOKEN --yes
vercel deploy --prod --yes --token $VERCEL_TOKEN --name cyber-security-backend

echo ""
echo "Done! Backend: $BACKEND_URL | Frontend: $FRONTEND_URL"
```
