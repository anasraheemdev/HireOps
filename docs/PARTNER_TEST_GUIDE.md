# HireOps — Partner Testing & Handoff Guide

**Product:** HireOps — AI Recruitment Operations Platform  
**Built by:** Obrix Labs  
**Website:** [www.obrixlabs.com](https://www.obrixlabs.com)  
**Support email:** [info@obrixlabs.com](mailto:info@obrixlabs.com)  
**Copyright:** © 2026 Obrix Labs. All rights reserved. Proprietary software — built for specific organizations; use only with permission.

**Branded User Usage Guide (recommended for testers):**  
[https://main.d2gei9r9nlt6ui.amplifyapp.com/user-guide.html](https://main.d2gei9r9nlt6ui.amplifyapp.com/user-guide.html) · [USER_USAGE_GUIDE.md](./USER_USAGE_GUIDE.md)

---

## 1. Live application

| Item | Value |
|------|--------|
| **Production URL** | [https://main.d2gei9r9nlt6ui.amplifyapp.com/](https://main.d2gei9r9nlt6ui.amplifyapp.com/) |
| **Login page** | [https://main.d2gei9r9nlt6ui.amplifyapp.com/login](https://main.d2gei9r9nlt6ui.amplifyapp.com/login) |
| **Candidate signup** | [https://main.d2gei9r9nlt6ui.amplifyapp.com/candidate-signup](https://main.d2gei9r9nlt6ui.amplifyapp.com/candidate-signup) |
| **Hosting** | AWS Amplify Hosting |
| **Auth / Database** | Supabase |
| **AI provider** | OpenRouter (server-side) |

Open the Production URL in Chrome or Edge (latest). Use a normal desktop viewport for HR/Admin testing.

---

## 2. Demo login credentials (for partner testing)

Use these accounts on the live URL. Passwords are case-sensitive.

| # | Portal | Role | Email | Password | Start URL after login |
|---|--------|------|-------|----------|------------------------|
| 1 | **Super Admin** | Platform admin | `s.alamri@oia.gov.om` | `OiaDemo#2026` | `/admin` |
| 2 | **HR** | Recruiter / HR workspace | `hr.demo@oia.gov.om` | `OiaHr#2026` | `/hr/dashboard` |
| 3 | **Candidate** | Job seeker portal | `candidate.demo@example.com` | `OiaCand#2026` | `/candidate` |

### How to sign in

1. Go to [https://main.d2gei9r9nlt6ui.amplifyapp.com/login](https://main.d2gei9r9nlt6ui.amplifyapp.com/login)
2. Enter the email and password from the table
3. Click **Sign In**
4. You should land in the correct portal for that account

### Sign out

Use the avatar menu (top-right) → **Sign out**, then log in as another role.

> **Security note for partners:** These are **demo application logins** for UAT only.  
> Infrastructure secrets (Supabase service role, database URLs, OpenRouter API keys) are **not** shared in this document and remain under Obrix Labs control. Request infrastructure access only via [info@obrixlabs.com](mailto:info@obrixlabs.com) if contractually required.

---

## 3. Product overview

HireOps is an enterprise **AI Recruitment Operations Platform** that helps organizations:

- Manage candidates and job requisitions
- Run AI-assisted matching and explanations
- Conduct AI interviews and assessments
- Track pipeline analytics and export reports
- Provide a candidate self-service career portal

Three portals share one product brand (**HireOps**) and one backend.

```text
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│  Super Admin    │   │  HR Workspace   │   │ Candidate Portal│
│  /admin         │   │  /hr/*          │   │ /candidate/*    │
└────────┬────────┘   └────────┬────────┘   └────────┬────────┘
         └─────────────────────┴─────────────────────┘
                               │
                    Supabase Auth + Database
                    OpenRouter AI (server)
```

---

## 4. Recommended test plan (partner UAT)

Work through these scenarios in order. Mark Pass / Fail / Blocked.

### A. Super Admin (`s.alamri@oia.gov.om` / `OiaDemo#2026`)

| ID | Test | Steps | Expected |
|----|------|-------|----------|
| A1 | Login | Login page → admin credentials | Lands on Admin overview |
| A2 | Platform KPIs | Open `/admin` | KPI tiles / health status visible |
| A3 | Users | Open Users | User list loads; invite UI available |
| A4 | Roles | Open Roles & Permissions | Roles visible |
| A5 | AI / Health | Open AI config / System health | Pages load without crash |
| A6 | Audit | Open Audit trail | Logs or empty state |
| A7 | Switch to HR | Org/workspace switcher if available → HR | Can open HR workspace |

### B. HR Workspace (`hr.demo@oia.gov.om` / `OiaHr#2026`)

| ID | Test | Steps | Expected |
|----|------|-------|----------|
| B1 | Login | Login as HR | `/hr/dashboard` |
| B2 | Dashboard | View KPIs + widgets | Numbers/charts or empty states |
| B3 | Ask AI Copilot | Click **Ask AI Copilot** | Side panel opens (**no full-screen blur**) |
| B4 | Candidates | Open Candidates → select a row | Split view / detail opens |
| B5 | Jobs | Open Jobs → select a job | Detail / matches area works |
| B6 | Create | Top bar **+ Create** | Menu links to create flows |
| B7 | AI Interview | Open AI Interviews | Queue / sessions list |
| B8 | Assessments | Open Assessments | List or create dialog |
| B9 | Analytics | Open Analytics | Charts / KPIs |
| B10 | Reports | Open Reports → export CSV or PDF | Download starts |
| B11 | Calendar | Open Calendar | Week view loads |
| B12 | Settings | Open Settings → Save if safe | Page loads |
| B13 | Language | Language / globe control | EN ↔ AR (RTL) |
| B14 | Shortcuts | Press `?` or shortcuts icon | Shortcuts dialog |
| B15 | Command palette | `⌘K` / `Ctrl+K` | Search opens |

### C. Candidate Portal (`candidate.demo@example.com` / `OiaCand#2026`)

| ID | Test | Steps | Expected |
|----|------|-------|----------|
| C1 | Login | Login as candidate | `/candidate` dashboard |
| C2 | Browse jobs | Open Jobs → Apply | Application accepted or “already applied” |
| C3 | Applications | Open My applications | Pipeline status visible |
| C4 | Interviews | Open Interviews | List / join if session exists |
| C5 | Assessments | Open Assessments | Pending items or empty state |
| C6 | Profile / Resume | Update profile or upload resume | Saves without error |
| C7 | Career Assistant | Open Assistant | Chat responds |
| C8 | Public signup | Sign out → `/candidate-signup` | Can create account (email confirmation may be required) |

### D. Cross-cutting

| ID | Test | Expected |
|----|------|----------|
| D1 | Branding | HireOps logo, name, tagline consistent |
| D2 | Mobile | Narrow viewport: sidebar sheet, AI sheet OK |
| D3 | 404 | Visit random path | Branded not-found page |
| D4 | Security | Cannot access `/admin` as candidate | Redirect / denied |

---

## 5. Portal map (quick links)

Base: `https://main.d2gei9r9nlt6ui.amplifyapp.com`

### Admin
- `/admin` — Overview  
- `/admin/users` — Users  
- `/admin/roles` — Roles  
- `/admin/health` — Health  
- `/admin/audit` — Audit  

### HR
- `/hr/dashboard` — Dashboard  
- `/hr/candidates` — Candidates  
- `/hr/jobs` — Jobs  
- `/hr/ai-matching` — AI Matching  
- `/hr/cv-parsing` — CV Parsing  
- `/hr/ai-interview` — AI Interviews  
- `/hr/assessments` — Assessments  
- `/hr/calendar` — Calendar  
- `/hr/analytics` — Analytics  
- `/hr/reports` — Reports  
- `/hr/settings` — Settings  

### Candidate
- `/candidate` — Home  
- `/candidate/jobs` — Open roles  
- `/candidate/applications` — Applications  
- `/candidate/interviews` — Interviews  
- `/candidate/assessments` — Assessments  
- `/candidate/assistant` — Career assistant  
- `/candidate/profile` — Profile  

---

## 6. Keyboard shortcuts (HR / Admin workspace)

| Shortcut | Action |
|----------|--------|
| `⌘K` / `Ctrl+K` | Command palette / search |
| `⌘B` / `Ctrl+B` | Toggle sidebar |
| `⌘J` / `Ctrl+J` | Toggle AI Copilot dock |
| `?` | Shortcuts help |

---

## 7. Tech stack (for technical reviewers)

| Layer | Technology |
|-------|------------|
| Frontend | Next.js (App Router), React, Tailwind, shadcn/ui |
| Auth | Supabase Auth (email/password; magic link / OAuth hooks available) |
| Database | Supabase Postgres + RLS |
| AI | OpenRouter (chat, matching explanations, embeddings) |
| Hosting | AWS Amplify (`main` branch auto-deploy) |
| Brand | HireOps (Obrix Labs) |

Deploy notes for Obrix engineers: [AWS_DEPLOY.md](./AWS_DEPLOY.md)

---

## 8. Known notes / expectations

- First load after idle may show a short **“Starting HireOps…”** loading state (SSR cold start on Amplify).
- AI answers depend on OpenRouter availability; if AI is slow or fails, heuristic / error messaging may appear.
- Demo data volume depends on seed state in the shared Supabase project.
- Magic link / OAuth providers may not be enabled in this demo environment — use **password** logins above.
- This build is **proprietary**. Do not redistribute source or credentials outside the partner engagement.

---

## 9. Defect reporting

Please email **[info@obrixlabs.com](mailto:info@obrixlabs.com)** with:

1. Portal + account used  
2. Exact URL  
3. Steps to reproduce  
4. Expected vs actual  
5. Screenshot / screen recording  
6. Browser + OS  

Subject line example: `[HireOps UAT] B3 AI Copilot blur — Chrome Win11`

---

## 10. Contact — Obrix Labs

| | |
|--|--|
| **Company** | Obrix Labs |
| **Website** | [www.obrixlabs.com](https://www.obrixlabs.com) |
| **Email** | [info@obrixlabs.com](mailto:info@obrixlabs.com) |
| **Product** | HireOps — AI Recruitment Operations Platform |
| **Live app** | [https://main.d2gei9r9nlt6ui.amplifyapp.com/](https://main.d2gei9r9nlt6ui.amplifyapp.com/) |

---

## 11. License reminder

HireOps is the property of **Obrix Labs**. It was built for specific organizations and may not be used, copied, modified, distributed, or commercialized without prior written permission from Obrix Labs.

See the repository `LICENSE` file for full terms.

---

*Document version: 1.0 — Partner UAT handoff — Obrix Labs — 2026*
