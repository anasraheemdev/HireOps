/**
 * Extra API checks. Usage: npx tsx scripts/smoke-http-extra.ts
 */
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const BASE = process.argv[2] || "http://localhost:3001";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];
const cookieName = `sb-${projectRef}-auth-token`;

function toBase64Url(str: string) {
  return Buffer.from(str, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function cookieFor(email: string, password: string) {
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!authRes.ok) throw new Error(await authRes.text());
  const s = await authRes.json();
  const payload = JSON.stringify({
    access_token: s.access_token,
    refresh_token: s.refresh_token,
    expires_in: s.expires_in,
    expires_at: s.expires_at ?? Math.floor(Date.now() / 1000) + s.expires_in,
    token_type: "bearer",
    user: s.user,
  });
  return `${cookieName}=base64-${toBase64Url(payload)}`;
}

async function main() {
  let fails = 0;
  const hr = await cookieFor("hr.demo@oia.gov.om", "OiaHr#2026");
  const admin = await cookieFor("s.alamri@oia.gov.om", "OiaDemo#2026");
  const cand = await cookieFor("candidate.demo@example.com", "OiaCand#2026");

  const checks: Array<{ cookie: string; path: string; ok: (s: number) => boolean }> = [
    { cookie: hr, path: "/api/reports/recruitment?format=csv", ok: (s) => s === 200 },
    { cookie: hr, path: "/api/reports/kpi?format=csv", ok: (s) => s === 200 },
    { cookie: hr, path: "/api/organization", ok: (s) => s === 200 },
    { cookie: hr, path: "/api/workflows", ok: (s) => s === 200 },
    { cookie: admin, path: "/admin/ai", ok: (s) => s === 200 },
    { cookie: admin, path: "/admin/audit", ok: (s) => s === 200 },
    { cookie: admin, path: "/api/admin/templates", ok: (s) => s === 200 },
    { cookie: cand, path: "/api/candidate/resume", ok: (s) => s === 405 },
    { cookie: cand, path: "/api/assessments", ok: (s) => s === 200 },
    { cookie: cand, path: "/hr/dashboard", ok: (s) => s === 307 || s === 302 },
  ];

  for (const c of checks) {
    const res = await fetch(`${BASE}${c.path}`, {
      headers: { Cookie: c.cookie, Accept: "*/*" },
      redirect: "manual",
    });
    const pass = c.ok(res.status);
    console.log(`${pass ? "OK" : "FAIL"} ${res.status} GET ${c.path}`);
    if (!pass) fails++;
  }

  console.log(`\nExtra checks complete. fails=${fails}`);
  process.exit(fails ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
