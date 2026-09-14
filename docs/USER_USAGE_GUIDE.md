# HireOps — User Usage Guide

**Product:** HireOps — AI Recruitment Operations Platform  
**Built by:** [Obrix Labs](https://www.obrixlabs.com)  
**Support:** [info@obrixlabs.com](mailto:info@obrixlabs.com)  
**Copyright:** © 2026 Obrix Labs. All rights reserved.

> **Branded HTML version (recommended for sharing):** open on the live site →  
> [https://main.d2gei9r9nlt6ui.amplifyapp.com/user-guide.html](https://main.d2gei9r9nlt6ui.amplifyapp.com/user-guide.html)

---

## 1. Live application URL

| Item | Value |
|------|--------|
| **Production URL** | [https://main.d2gei9r9nlt6ui.amplifyapp.com/](https://main.d2gei9r9nlt6ui.amplifyapp.com/) |
| **Login page** | [https://main.d2gei9r9nlt6ui.amplifyapp.com/login](https://main.d2gei9r9nlt6ui.amplifyapp.com/login) |
| **Candidate signup** | [https://main.d2gei9r9nlt6ui.amplifyapp.com/candidate-signup](https://main.d2gei9r9nlt6ui.amplifyapp.com/candidate-signup) |
| **This guide (HTML)** | [https://main.d2gei9r9nlt6ui.amplifyapp.com/user-guide.html](https://main.d2gei9r9nlt6ui.amplifyapp.com/user-guide.html) |
| **Hosting** | AWS Amplify |
| **Browser** | Chrome or Edge (latest), desktop recommended for Admin/HR |

---

## 2. Demo credentials (all roles)

Passwords are **case-sensitive**. Use only on the live URL for authorized testing.

| Portal | Role | Email | Password | Lands on |
|--------|------|-------|----------|----------|
| **Super Admin** | Platform admin | `s.alamri@oia.gov.om` | `OiaDemo#2026` | `/admin` |
| **HR** | Recruiter workspace | `hr.demo@oia.gov.om` | `OiaHr#2026` | `/hr/dashboard` |
| **Candidate** | Job seeker portal | `candidate.demo@example.com` | `OiaCand#2026` | `/candidate` |

### Sign in

1. Go to [https://main.d2gei9r9nlt6ui.amplifyapp.com/login](https://main.d2gei9r9nlt6ui.amplifyapp.com/login)
2. Enter email + password for the role you want to test
3. Click **Sign In**
4. To switch roles: avatar (top-right) → **Sign out** → log in as another user

> **Security:** Demo app logins only. Infrastructure secrets are not shared and remain under Obrix Labs control.

---

## 3. Super Admin — usage checklist

**Login:** `s.alamri@oia.gov.om` / `OiaDemo#2026`

1. Confirm Admin overview KPIs / health load  
2. **Users** — list + invite UI  
3. **Roles & Permissions** — roles visible  
4. **AI / System health** — pages load  
5. **Audit trail** — logs or empty state  
6. Later: verify Candidate cannot open `/admin`

| Path | Purpose |
|------|---------|
| `/admin` | Overview |
| `/admin/users` | Users |
| `/admin/roles` | Roles |
| `/admin/health` | Health |
| `/admin/audit` | Audit |

---

## 4. HR Workspace — usage checklist

**Login:** `hr.demo@oia.gov.om` / `OiaHr#2026`

1. Land on `/hr/dashboard`  
2. **Ask AI Copilot** — side panel (no full-screen blur)  
3. **Candidates** — select a row, review detail  
4. **Jobs** — select a job, review matches  
5. Top bar **+ Create**  
6. Visit AI Matching, CV Parsing, AI Interviews, Assessments  
7. Analytics + Reports (export if available)  
8. Calendar + Settings  
9. Language EN ↔ AR if available  
10. Shortcuts: `Ctrl+K` search, `Ctrl+B` sidebar, `Ctrl+J` AI dock  

| Path | Purpose |
|------|---------|
| `/hr/dashboard` | Dashboard |
| `/hr/candidates` | Candidates |
| `/hr/jobs` | Jobs |
| `/hr/ai-matching` | AI matching |
| `/hr/cv-parsing` | CV parsing |
| `/hr/ai-interview` | AI interviews |
| `/hr/assessments` | Assessments |
| `/hr/calendar` | Calendar |
| `/hr/analytics` | Analytics |
| `/hr/reports` | Reports |
| `/hr/settings` | Settings |

---

## 5. Candidate Portal — usage checklist

**Login:** `candidate.demo@example.com` / `OiaCand#2026`

1. Land on `/candidate`  
2. **Jobs** — browse and apply  
3. **My applications** — status visible  
4. Interviews + Assessments  
5. Profile / resume upload  
6. Career Assistant chat  
7. Sign out → try `/candidate-signup` (email confirmation may be required)

| Path | Purpose |
|------|---------|
| `/candidate` | Home |
| `/candidate/jobs` | Open roles |
| `/candidate/applications` | Applications |
| `/candidate/interviews` | Interviews |
| `/candidate/assessments` | Assessments |
| `/candidate/assistant` | Career assistant |
| `/candidate/profile` | Profile |

---

## 6. Report defects

Email **[info@obrixlabs.com](mailto:info@obrixlabs.com)** with: portal + account, URL, steps, expected vs actual, screenshot, browser/OS.

Subject example: `[HireOps UAT] HR AI Copilot — Chrome Win11`

---

## 7. Obrix Labs contact & branding

| | |
|--|--|
| **Company** | Obrix Labs |
| **Website** | [www.obrixlabs.com](https://www.obrixlabs.com) |
| **Email** | [info@obrixlabs.com](mailto:info@obrixlabs.com) |
| **Product** | HireOps — AI Recruitment Operations Platform |
| **Live app** | [https://main.d2gei9r9nlt6ui.amplifyapp.com/](https://main.d2gei9r9nlt6ui.amplifyapp.com/) |

HireOps is proprietary software owned by **Obrix Labs**. Use only with permission.

---

*Document version: 1.0 — User Usage Guide — Obrix Labs — 2026*
