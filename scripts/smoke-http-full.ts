/**
 * Full-app HTTP smoke against local Next (default :3001).
 * Signs in as admin / HR / candidate and hits pages + APIs.
 * Usage: npx tsx scripts/smoke-http-full.ts [baseUrl]
 */
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const BASE = process.argv[2] || "http://localhost:3001";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];
const cookieName = `sb-${projectRef}-auth-token`;

type Result = { ok: boolean; status: number; label: string; detail?: string };

const results: Result[] = [];

function record(label: string, status: number, ok: boolean, detail?: string) {
  results.push({ label, status, ok, detail });
  const mark = ok ? "OK" : "FAIL";
  console.log(`${mark.padEnd(4)} ${status}  ${label}${detail ? ` — ${detail}` : ""}`);
}

async function signIn(email: string, password: string) {
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!authRes.ok) throw new Error(`auth ${email}: ${await authRes.text()}`);
  return authRes.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    expires_at?: number;
    token_type: string;
    user: { id: string; email?: string };
  }>;
}

function toBase64Url(str: string) {
  return Buffer.from(str, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function sessionCookie(session: Awaited<ReturnType<typeof signIn>>) {
  const payload = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    expires_at: session.expires_at ?? Math.floor(Date.now() / 1000) + session.expires_in,
    token_type: session.token_type ?? "bearer",
    user: session.user,
  });
  // Match @supabase/ssr cookie encoding
  const encoded = `base64-${toBase64Url(payload)}`;
  return `${cookieName}=${encoded}`;
}

async function hit(
  path: string,
  opts: { cookie?: string; method?: string; body?: unknown; expect?: number | number[]; label?: string } = {}
) {
  const expect = opts.expect ?? [200, 204];
  const allowed = Array.isArray(expect) ? expect : [expect];
  const headers: Record<string, string> = { Accept: "application/json,text/html" };
  if (opts.cookie) headers.Cookie = opts.cookie;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    redirect: "manual",
  });
  const label = opts.label ?? `${opts.method ?? "GET"} ${path}`;
  const ok = allowed.includes(res.status);
  let detail: string | undefined;
  if (!ok) {
    const text = await res.text().catch(() => "");
    detail = text.slice(0, 160).replace(/\s+/g, " ");
  }
  record(label, res.status, ok, detail);
  return res;
}

async function main() {
  console.log(`\n=== HTTP smoke @ ${BASE} ===\n`);

  // Public
  await hit("/login", { expect: 200, label: "GET /login (public)" });
  await hit("/candidate/signup", { expect: [200, 404, 307, 308], label: "GET /candidate/signup" });
  await hit("/hr/dashboard", { expect: [307, 302, 303], label: "GET /hr/dashboard (unauth → login)" });

  const users = [
    {
      name: "admin",
      email: "s.alamri@oia.gov.om",
      password: "OiaDemo#2026",
      pages: ["/admin", "/admin/users", "/admin/roles", "/admin/health", "/admin/features"],
      apis: ["/api/admin/health", "/api/admin/users", "/api/admin/roles", "/api/admin/feature-flags", "/api/dashboard", "/api/search?q=invest"],
    },
    {
      name: "hr",
      email: "hr.demo@oia.gov.om",
      password: "OiaHr#2026",
      pages: [
        "/hr/dashboard",
        "/hr/candidates",
        "/hr/jobs",
        "/hr/ai-matching",
        "/hr/ai-interview",
        "/hr/assessments",
        "/hr/calendar",
        "/hr/reports",
        "/hr/analytics",
        "/hr/settings",
      ],
      apis: [
        "/api/dashboard",
        "/api/candidates",
        "/api/jobs",
        "/api/interviews",
        "/api/assessments",
        "/api/analytics",
        "/api/notifications",
        "/api/me",
        "/api/search?q=analyst",
      ],
    },
    {
      name: "candidate",
      email: "candidate.demo@example.com",
      password: "OiaCand#2026",
      pages: [
        "/candidate",
        "/candidate/jobs",
        "/candidate/applications",
        "/candidate/profile",
        "/candidate/resume",
        "/candidate/documents",
        "/candidate/saved",
        "/candidate/assessments",
        "/candidate/interviews",
        "/candidate/offers",
        "/candidate/messages",
        "/candidate/notifications",
        "/candidate/assistant",
        "/candidate/help",
        "/candidate/settings",
      ],
      apis: [
        "/api/me",
        "/api/candidate/home",
        "/api/applications",
        "/api/jobs",
        "/api/saved-jobs",
        "/api/offers",
        "/api/notifications",
        "/api/candidate/messages",
        "/api/candidate/documents",
        "/api/help",
        "/api/interviews",
      ],
    },
  ] as const;

  for (const u of users) {
    console.log(`\n--- ${u.name.toUpperCase()} (${u.email}) ---`);
    let cookie: string;
    try {
      const session = await signIn(u.email, u.password);
      cookie = sessionCookie(session);
      record(`auth ${u.name}`, 200, true);
    } catch (e) {
      record(`auth ${u.name}`, 0, false, e instanceof Error ? e.message : String(e));
      continue;
    }

    for (const p of u.pages) {
      await hit(p, { cookie, expect: [200], label: `PAGE ${p}` });
    }
    for (const a of u.apis) {
      await hit(a, { cookie, expect: [200, 201], label: `API  ${a}` });
    }

    // Portal boundary: candidate must not access admin
    if (u.name === "candidate") {
      await hit("/admin", { cookie, expect: [307, 302, 303], label: "BOUNDARY candidate→/admin redirect" });
      await hit("/hr/dashboard", { cookie, expect: [307, 302, 303], label: "BOUNDARY candidate→/hr redirect" });
    }
  }

  // Candidate assistant POST
  console.log("\n--- candidate assistant POST ---");
  try {
    const session = await signIn("candidate.demo@example.com", "OiaCand#2026");
    const cookie = sessionCookie(session);
    await hit("/api/candidate/assistant", {
      cookie,
      method: "POST",
      body: { message: "What roles fit me?" },
      expect: [200],
      label: "POST /api/candidate/assistant",
    });
  } catch (e) {
    record("POST /api/candidate/assistant", 0, false, e instanceof Error ? e.message : String(e));
  }

  const fails = results.filter((r) => !r.ok);
  const oks = results.filter((r) => r.ok);
  console.log(`\n=== SUMMARY: ${oks.length} ok / ${fails.length} fail / ${results.length} total ===`);
  if (fails.length) {
    console.log("\nFailures:");
    for (const f of fails) console.log(`  - ${f.status} ${f.label}${f.detail ? ` :: ${f.detail}` : ""}`);
    process.exit(1);
  }
  console.log("All HTTP smoke checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
