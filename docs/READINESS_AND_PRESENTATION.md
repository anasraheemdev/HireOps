# HireOps presentation and release guide

The in-app walkthrough is available at `/hr/presentation` from the HR sidebar. It covers the seven requested topics and links directly to the working modules.

## Vendor background

Obrix Labs: **15 years of experience**, as confirmed by the project owner. No client references, certifications or past-project claims have been invented. Add verified case studies separately if the presentation requires them.

## Demonstration sequence

1. Create a job with its actual required skills and experience level, then change its status to Open.
2. Upload a text-based PDF or DOCX in CV Parsing. Review and correct extracted information before saving. The displayed completeness score measures populated fields, not validated extraction accuracy. Scanned images require a text-based replacement; OCR is not implemented.
3. Select the job in AI Matching. Review the percentage, actual skills matched and gaps. Open the explanation. Shortlist explicitly to link a talent-pool candidate to the job.
4. Open the candidate's scoring panel and evaluate job fit. Pending exams and interviews remain pending rather than receiving fabricated scores.
5. Create an exam with questions, distinct choices and answer keys, or written-answer rubrics. Assign it to a candidate application. Sign in as that candidate, start the timed attempt and submit. Completed scores are immutable to candidate resubmission. A failed AI grading request preserves submitted answers for grading retry.
6. Start an interview linked to the application. Give at least three substantive responses and end the interview. Review the transcript, strengths, risks and scored evaluation. Text input is supported; speech recognition and read-aloud depend on the browser.
7. Explain the implemented organization/owner permissions, server-managed exam keys and scores, encrypted AI settings, and human review. Government SSO, HRIS and external calendars require separate configuration and acceptance tests; they are not preconfigured services.

## Scoring

Job fit uses 55% semantic similarity, 30% distinct required-skill coverage and 15% experience against the requirement. Without required skills, the remaining weights are rescaled. Percentages are bounded to 0–100. They are fit indicators, not statistically calibrated hiring probabilities.

The application evidence score uses job fit (40%), completed assessments (30%) and completed interviews (30%). Missing evidence is excluded and available weights are rescaled. Do not interpret a provisional result as a completed evaluation or an automated hiring decision.

## Repeatable checks

- `npm run verify:core`: deterministic scoring/exam validation and workspace snapshot regressions.
- `node scripts/verify-secrets.cjs`: encryption round-trip and tamper detection.
- `npm run verify:readiness -- http://localhost:3001`: real database, CV parsing, matching, exams and AI interview checks. It creates dedicated records and removes only records created by that invocation.
- `node scripts/verify-pages.mjs http://localhost:3001`: authenticated server rendering of key portal pages using the documented demo accounts.
- `npm run lint`, `npx tsc --noEmit`, and `npm run build -- --webpack`.

Live checks exercise external Supabase and AI services and can incur inference usage. Do not substitute successful API checks for browser and accessibility checks.

## Deployment coordination

Migrations 020 and 021 add ownership policies, signup provisioning, profile-authority protection, answer storage and grading integrity. These changes and the application code must be deployed together: older candidate exam/interview handlers do not support the tightened policies.

AI settings are encrypted with AES-256-GCM. Set a stable `APP_ENCRYPTION_KEY` in the hosting environment; if omitted, encryption derives a domain-separated key from `SUPABASE_SERVICE_ROLE_KEY`. Changing either effective key requires re-encrypting saved settings before rotation. Never expose these server keys to browser environment variables. Legacy base64 settings must be re-saved; the current database had no legacy settings when checked.

Chat provider/model settings apply to subsequent organization requests. The embedding provider remains deployment-configured and its model is fixed to preserve the existing 1536-dimensional vector comparison space. A model change requires rebuilding all embeddings. Only AI interviews, semantic matching and the career assistant are offered as runtime feature toggles.

`NEXT_PUBLIC_ENABLE_AZURE_SSO=true` reveals the Azure sign-in control only after that provider has been configured and verified. No MFA-enforcement claim is made by the application.

Webpack is used for local development following a reproducible Turbopack failure during the refresh loop. After changing bundlers, perform one hard browser reload to discard old development chunks.
