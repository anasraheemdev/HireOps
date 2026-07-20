# HireOps — AI Recruitment Operations Platform

Enterprise AI recruitment platform with three portals:

| Portal | Base path | Role |
|--------|-----------|------|
| Super Admin Console | `/admin` | Platform governance, AI config, audit, health |
| HR Workspace | `/hr/*` | Recruitment lifecycle, matching, interviews, assessments |
| Candidate Portal | `/candidate/*` | Apply, track, assessments, AI interviews, career assistant |

**Tagline:** AI Recruitment Operations Platform

## Demo accounts

| Email | Password | Portal |
|-------|----------|--------|
| `s.alamri@oia.gov.om` | `OiaDemo#2026` | Super Admin |
| `hr.demo@oia.gov.om` | `OiaHr#2026` | HR |
| `candidate.demo@example.com` | `OiaCand#2026` | Candidate |

Public candidate signup: `/candidate-signup`

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Legacy flat URLs (`/candidates`, `/jobs`, …) redirect to `/hr/*`.

## Key scripts

```bash
node scripts/migrate.mjs              # apply SQL migrations
npx tsx scripts/seed.ts               # seed org/jobs/candidates
npx tsx scripts/seed-v2-users.ts      # seed portal demo users
npx tsx scripts/backfill-embeddings.ts
node scripts/generate-hireops-icons.mjs  # regenerate favicons / PWA icons from public/HireOps.png
```

## Branding

- Product name: **HireOps**
- Logo: `public/HireOps.png`
- Brand constants: `src/lib/brand.ts`
- Icons / manifest: `public/site.webmanifest`, favicon set in `public/`

## Architecture

- **Auth:** Supabase Auth (email/password, magic link, OAuth hooks)
- **RBAC:** `profiles.portal_role` + `permissions` / `role_permissions`; UI `<Can>` + API `requirePermission`
- **AI:** OpenRouter (configurable via `AI_PROVIDER`) for parsing, matching, interviews
- **Design system:** `design-system/hireops/MASTER.md`

## License

**Proprietary — Obrix Labs.** © 2026 Obrix Labs. All rights reserved.

HireOps is the property of Obrix Labs. It was built for specific organizations and **may not be used, copied, modified, distributed, or commercialized without prior written permission** from Obrix Labs.

See [LICENSE](./LICENSE) for the full terms.
