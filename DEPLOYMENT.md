# TailorLearn Production Deployment Guide

This guide walks you through deploying the **TailorLearn** personalized learning platform live to production.

---

## 1. Architecture Overview

- **Frontend**: React 19 + Vite + Tailwind CSS (SPA)
- **Backend**: Node.js + Express (handles JWT auth, REST APIs, SSE real-time streams, cron jobs)
- **Database**: PostgreSQL (Raw SQL queries, no ORM, uses `LISTEN/NOTIFY`)
- **Third-Party Services**:
  - Razorpay (Payments)
  - SMTP / Gmail (Notifications & password reset)
  - Cloudinary (Material file uploads)
  - OpenAI / OpenRouter (AI Tutor & AI Quiz Generator)

---

## 2. Production Environment Variables Checklist

### Backend Variables (`backend/.env` or Platform Environment Settings)

| Variable | Description | Example / Note |
|---|---|---|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | HTTP Server port | `5000` (or assigned by platform like `$PORT`) |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/dbname?sslmode=require` |
| `JWT_SECRET` | 64+ char random secret | Generate via `openssl rand -hex 64` |
| `JWT_EXPIRES_IN` | Token expiration | `7d` |
| `CLIENT_URL` | Live frontend URL for CORS & redirects | `https://your-domain.com` |
| `RAZORPAY_KEY_ID` | Razorpay Live/Test Key ID | `rzp_live_...` or `rzp_test_...` |
| `RAZORPAY_KEY_SECRET`| Razorpay Key Secret | From Razorpay Dashboard |
| `SMTP_HOST` | Mail server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | Mail server port | `465` |
| `SMTP_SECURE` | SSL toggle | `true` |
| `SMTP_USER` | Email address | `your-email@gmail.com` |
| `SMTP_PASS` | App password (16 chars) | Google App Password |
| `OPENAI_API_KEY` | OpenAI API Key | `sk-...` |
| `OPENROUTER_API_KEY` | OpenRouter API Key | `sk-or-v1-...` |
| `OPENROUTER_MODEL` | AI Model name | `openrouter/free` or `google/gemini-flash` |

### Frontend Variables (`frontend/.env` or Build Environment)

| Variable | Description | Example / Note |
|---|---|---|
| `VITE_API_URL` | Backend API base URL | `https://your-api.com/api` (leave empty for single-service deployments) |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloudinary Cloud name | `dxex7pgox` |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Cloudinary Upload preset | `ml_default` |

---

## 3. Database Initialization

On your production PostgreSQL instance (e.g. Supabase, Neon, Railway Postgres, or Render Postgres), execute the following scripts in order:

1. **Schema**: Run [`database/schema.sql`](database/schema.sql)
2. **Seeds** (Optional default data): Run [`database/seeds.sql`](database/seeds.sql)
3. **Priority Normalization**: Run [`database/normalize_topic_priorities.sql`](database/normalize_topic_priorities.sql)

---

## 4. Deployment Options

### Option A: Railway (Recommended — Fastest All-in-One)

Railway allows deploying the Postgres database and the fullstack web container in a single project with automatic SSL and zero-downtime deploys.

1. **Sign Up / Log In**: Go to [railway.app](https://railway.app).
2. **Create New Project**: Click **New Project** → **Provision PostgreSQL**.
3. **Add Web Service**: Click **New** → **GitHub Repo** → select your TailorLearn repository.
4. **Configure Web Service**:
   - The multi-stage `Dockerfile` in the root will automatically be detected and build both the frontend and backend.
   - Under **Variables**, add the backend environment variables listed above. Set `DATABASE_URL` to `${{Postgres.DATABASE_URL}}`.
   - Set `CLIENT_URL` to your Railway domain (e.g. `https://tailorlearn-production.up.railway.app`).
5. **Generate Domain**: In Service Settings → **Networking** → Click **Generate Domain**.
6. **Initialize Database**:
   - Connect to your Railway PostgreSQL via Railway CLI or DB client (TablePlus, pgAdmin) and run `database/schema.sql`.

---

### Option B: Render (Popular Free/Low-Cost Cloud)

1. **Create PostgreSQL Database**:
   - In Render dashboard, click **New +** → **PostgreSQL**.
   - Copy the **Internal Database URL** (or External if connecting from outside).
2. **Create Web Service**:
   - Click **New +** → **Web Service** → Connect your repository.
   - **Environment**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Environment Variables**: Add `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL`, etc.
3. Express will automatically serve the built React frontend from `frontend/dist` and handle API routes under `/api/*`.

---

### Option C: Decoupled (Vercel Frontend + Render/Railway Backend)

If you prefer hosting the React frontend on Vercel for edge CDN performance:

1. **Deploy Backend**: Deploy `backend/` to Render or Railway. Note the live URL (e.g. `https://api.tailorlearn.com`).
2. **Deploy Frontend on Vercel**:
   - Import your repository in Vercel.
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
   - **Environment Variables**:
     - `VITE_API_URL`: `https://api.tailorlearn.com/api`
     - `VITE_CLOUDINARY_CLOUD_NAME`: your Cloudinary cloud name
     - `VITE_CLOUDINARY_UPLOAD_PRESET`: your upload preset
3. **Update Backend CORS**: In your backend environment settings, set `CLIENT_URL` to your Vercel deployment URL (e.g. `https://tailorlearn.vercel.app`).

---

### Option D: Self-Hosted Docker / VPS (Ubuntu, DigitalOcean, AWS EC2)

```bash
# 1. Clone repository
git clone <your-repo-url>
cd personalized-learning-platform

# 2. Build Docker container
docker build -t tailorlearn:latest .

# 3. Run container
docker run -d \
  -p 80:5000 \
  --env-file backend/.env \
  -e NODE_ENV=production \
  --name tailorlearn-app \
  tailorlearn:latest
```

---

## 5. Post-Deployment Verification

1. Check backend health endpoint: `GET https://<your-domain>/health` (should return `{"status": "UP"}`).
2. Verify user login & registration.
3. Test topic creation on the Teacher course page: check that **Priority Number** shifts and new topics appear immediately without refreshing.
4. Open the student Performance page in Dark Mode and verify row hovers in the Recent Quiz Performance History table.
5. Verify Real-time SSE stream connects without errors in DevTools Network tab.

