# Deploy HireOps on AWS Free Tier (Amplify Hosting)

This guide is for **first-time AWS users**. HireOps stays on **Supabase** for auth/database and **OpenRouter** for AI. AWS Amplify only hosts the Next.js app.

```text
Browser → AWS Amplify (HireOps Next.js) → Supabase + OpenRouter
GitHub main → auto-deploys → Amplify
```

---

## Live production URL

**HireOps (Amplify):** [https://main.d2gei9r9nlt6ui.amplifyapp.com/](https://main.d2gei9r9nlt6ui.amplifyapp.com/)

Use this value for:

```text
NEXT_PUBLIC_APP_URL=https://main.d2gei9r9nlt6ui.amplifyapp.com
```

And in Supabase Auth → URL configuration:

```text
Site URL: https://main.d2gei9r9nlt6ui.amplifyapp.com
Redirect: https://main.d2gei9r9nlt6ui.amplifyapp.com/auth/callback
Redirect: https://main.d2gei9r9nlt6ui.amplifyapp.com/**
```

Partner UAT guide (demo logins + test plan): [PARTNER_TEST_GUIDE.md](./PARTNER_TEST_GUIDE.md)

---

## 0. What “free” means

- New AWS accounts get a **12-month Free Tier** (limits apply).
- Amplify free allowance covers light demos; heavy traffic can cost money.
- AWS still asks for a **credit/debit card** when you create an account.
- Set a **billing budget alert** on day one (see section 7).

---

## 1. Prerequisites

### A. Push the code to GitHub

From the project root:

```powershell
cd "E:\AI HR - APP"
git status
git push -u origin main
```

If you do not have a GitHub remote yet:

```powershell
gh repo create HireOps --private --source=. --remote=origin --push
```

### B. Create an AWS account

1. Open [https://aws.amazon.com/free](https://aws.amazon.com/free)
2. Create account → verify email/phone → add payment method
3. Sign in to the [AWS Console](https://console.aws.amazon.com/)

### C. Pick a region

Top-right of the console, choose a region near you, for example:

- `ap-south-1` (Mumbai)
- `eu-west-1` (Ireland)
- `us-east-1` (N. Virginia)

Amplify apps are regional; pick one and stick with it.

### D. Have secrets ready

Open your local `.env.local` (never commit it). You will paste values into Amplify.

Required keys are listed in [`.env.example`](../.env.example).

---

## 2. Create the Amplify app (console clicks)

1. AWS Console search bar → type **Amplify** → open **AWS Amplify**
2. Click **Create new app** (or **Host web app**)
3. Choose **GitHub** → **Continue**
4. Authorize AWS Amplify to access your GitHub account/org
5. Select repository **HireOps** (or your repo name) → branch **`main`**
6. Confirm Amplify detects **Next.js – SSR** / platform **WEB_COMPUTE**
7. Build settings should load from repo file [`amplify.yml`](../amplify.yml):
   - Install: `npm ci`
   - Build: writes env vars to `.env.production`, then `npm run build`
   - Artifact folder: `.next`
8. **Do not deploy yet** — add environment variables first (next section)
9. App name: `HireOps` (or similar) → **Save and deploy** after env vars are set

First build often takes **5–15 minutes**.

---

## 3. Environment variables (Amplify Console)

**Path:** Amplify → your app → **Hosting** → **Environment variables** (or **App settings** → **Environment variables**)

Add these (values from your `.env.local`):

| Variable | Required | Notes |
|----------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server only — never expose in client code |
| `DATABASE_URL` | Yes | Supabase Postgres pooler URL |
| `DIRECT_URL` | Optional | Needed only if you run migrations from this host |
| `OPENROUTER_API_KEY` | Yes | AI features |
| `AI_PROVIDER` | Yes | `openrouter` |
| `AI_CHAT_MODEL` | Yes | e.g. `qwen/qwen-2.5-72b-instruct` |
| `AI_EMBEDDING_MODEL` | Yes | e.g. `openai/text-embedding-3-small` |
| `NEXT_PUBLIC_APP_URL` | After first deploy | Your Amplify HTTPS URL (see section 5) |

Apply variables to the **`main`** branch (and production environment).

Then **Redeploy** this commit / **Retry build** so the build picks them up.

> Why `.env.production` in `amplify.yml`? Amplify injects console env vars into the build machine, but Next.js SSR needs them written into `.env.production` for server runtime. See [AWS docs: SSR environment variables](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-environment-variables.html).

---

## 4. Open the live URL

When the build status is **Deployed**:

1. Click the Amplify domain (looks like `https://main.dxxxxxxxxxx.amplifyapp.com`)
2. You should see the HireOps login page
3. Copy that URL — you need it for Supabase + `NEXT_PUBLIC_APP_URL`

Demo logins (if you seeded them):

| Portal | Email | Password |
|--------|--------|----------|
| Super Admin | `s.alamri@oia.gov.om` | `OiaDemo#2026` |
| HR | `hr.demo@oia.gov.om` | `OiaHr#2026` |
| Candidate | `candidate.demo@example.com` | `OiaCand#2026` |

---

## 5. After first deploy — App URL + Supabase Auth (required)

Login / magic link / OAuth will fail until redirects match your Amplify domain.

### A. Set `NEXT_PUBLIC_APP_URL` in Amplify

1. Amplify → Environment variables
2. Set:

```text
NEXT_PUBLIC_APP_URL=https://main.YOUR_APP_ID.amplifyapp.com
```

(Use your real Amplify URL, no trailing slash.)

3. **Redeploy** `main`

### B. Update Supabase Auth URLs

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project
2. **Authentication** → **URL Configuration**
3. Set:

| Field | Value |
|-------|--------|
| **Site URL** | `https://main.YOUR_APP_ID.amplifyapp.com` |
| **Redirect URLs** | Add both production and local: |

```text
https://main.YOUR_APP_ID.amplifyapp.com/auth/callback
https://main.YOUR_APP_ID.amplifyapp.com/**
http://localhost:3000/auth/callback
http://localhost:3000/**
http://localhost:3001/auth/callback
http://localhost:3001/**
```

4. Save

### C. Quick verification

- [ ] `/login` loads over HTTPS
- [ ] Password login works for Admin / HR / Candidate
- [ ] After login you land in the correct portal
- [ ] Dashboard loads data
- [ ] AI Copilot opens as a side panel (no full-screen blur)

---

## 6. Ongoing deploys

Every push to `main` triggers a new Amplify build:

```powershell
git add -A
git commit -m "Your message"
git push origin main
```

Watch progress in Amplify → **Hosting** → **Deployments**.

---

## 7. Billing safety (do this today)

1. AWS Console → search **Billing** → **Budgets**
2. Create budget → **Cost budget**
3. Amount: `$5` (or `$1` for a stricter alert)
4. Email alerts at 50% / 80% / 100%
5. Optional: enable **Free Tier usage alerts** under Billing preferences

If you abandon the project: Amplify → app → **Delete app** so hosting charges stop.

---

## 8. Common failures

| Symptom | Fix |
|---------|-----|
| Build fails on `npm ci` | Ensure `package-lock.json` is committed; Node 20 in `amplify.yml` |
| Build OK but blank site | Confirm platform is **WEB_COMPUTE** / Next.js SSR, `baseDirectory` is `.next` |
| Login redirects fail | Fix Supabase Site URL + Redirect URLs (section 5) |
| API / AI 500s | Confirm `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `OPENROUTER_API_KEY` are set and redeployed |
| Env vars “missing” at runtime | Confirm `amplify.yml` writes them to `.env.production` and you redeployed after adding vars |
| Next.js 16 build warnings | Amplify historically documented Next 12–15; if build fails on version, check Amplify release notes or pin Node 20 and retry |
| App feels very slow on first open | Amplify Free Tier **cold starts** — first request after idle can take several seconds. Keep the tab open while testing; warm by hitting `/login` once. Ensure `NEXT_PUBLIC_APP_URL` is set. |
| Stuck on “Starting HireOps…” | Redeploy latest `main` (lighter loaders + `/` → `/login` redirect). Hard-refresh the browser. |

---

## 9. What we are not doing in this first deploy

- Custom domain (Amplify → Domain management later)
- EC2 / Docker / Kubernetes
- Moving Supabase onto AWS
- Separate CI beyond Amplify’s GitHub integration

---

## 10. Files in this repo

| File | Purpose |
|------|---------|
| [`amplify.yml`](../amplify.yml) | Amplify build + SSR env injection |
| [`.env.example`](../.env.example) | Template of required secrets (no real values) |
| This guide | Step-by-step console + post-deploy Auth setup |

© 2026 Obrix Labs. HireOps is proprietary software.
