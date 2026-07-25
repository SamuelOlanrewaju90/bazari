# Bazari — Full Stack

- `backend/` — Node.js + Express + SQLite REST API (auth, products, cart, orders)
- `frontend/` — React (Vite) storefront that calls the backend over HTTP

The frontend now talks to the backend via `fetch()` — they're wired together, not just
sitting side by side. Follow the steps below to get both running live for free.

## 1. Push the code to GitHub

You'll deploy from a GitHub repo, so create one first:

```bash
cd bazari-fullstack
git init
git add .
git commit -m "Initial commit"
```

Then on github.com: **New repository** → give it a name (e.g. `bazari`) → don't
initialize with a README (you already have one) → create it. GitHub will show you
commands like:

```bash
git remote add origin https://github.com/<your-username>/bazari.git
git branch -M main
git push -u origin main
```

## 2. Create a free Postgres database (Neon)

1. Go to neon.tech and sign up (free tier, no credit card).
2. Create a project and copy the connection string it gives you — it looks like
   `postgresql://user:password@ep-xxxx.us-east-2.aws.neon.tech/dbname?sslmode=require`.
   Keep this handy for the next step.

## 3. Deploy the backend (Render, free tier)

1. Go to render.com and sign in with GitHub.
2. **New +** → **Web Service** → pick your `bazari` repo.
3. Set:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run seed`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
4. Under **Environment**, add:
   - `JWT_SECRET` = any long random string
   - `DATABASE_URL` = the Neon connection string from step 2
5. Click **Create Web Service**. Render will give you a URL like
   `https://bazari-backend.onrender.com` — that's your live API.

**Note:** Render's free tier sleeps after 15 minutes of inactivity, so the first
request after a quiet period will be slow while it wakes up — normal for free hosting.
Because your data now lives in Neon (not on Render's disk), your accounts, carts, and
orders persist across restarts and redeploys.

## 4. Deploy the frontend (Vercel, free tier)

1. Go to vercel.com and sign in with GitHub.
2. **Add New** → **Project** → pick the same `bazari` repo.
3. Set **Root Directory** to `frontend`. Vercel auto-detects Vite.
4. Under **Environment Variables**, add:
   - `VITE_API_URL` = the Render URL from step 3 (e.g. `https://bazari-backend.onrender.com`)
5. Click **Deploy**. You'll get a live URL like `https://bazari.vercel.app`.

## 5. Try it

Open your Vercel URL, create an account, add items to the cart, and place an order.
Check the Render logs if anything looks broken — that tells you if a request from the
frontend actually reached the backend.

## Running locally instead

```bash
# backend
cd backend && npm install && cp .env.example .env
# edit .env, set JWT_SECRET and DATABASE_URL (your Neon connection string works fine locally too)
npm run seed && npm start        # http://localhost:4000

# frontend, in a second terminal
cd frontend && npm install && cp .env.example .env
npm run dev                       # http://localhost:5173
```
