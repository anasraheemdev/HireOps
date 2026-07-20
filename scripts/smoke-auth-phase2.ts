/**
 * Authenticated Phase 2 API smoke test via cookie session simulation is hard;
 * instead sign in with password grant and call match RPC + parse via services
 * through a minimal Next-less path using the anon/service REST APIs.
 */
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function main() {
  const authRes = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: ANON,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: "s.alamri@oia.gov.om",
      password: "OiaDemo#2026",
    }),
  });
  if (!authRes.ok) throw new Error(`auth failed: ${await authRes.text()}`);
  const { access_token } = await authRes.json();
  console.log("Auth OK");

  const jobsRes = await fetch(`${URL}/rest/v1/jobs?select=id,title&embedding=not.is.null&limit=1`, {
    headers: { apikey: ANON, Authorization: `Bearer ${access_token}` },
  });
  const jobs = await jobsRes.json();
  if (!jobs?.[0]) throw new Error("no jobs");
  console.log(`Job: ${jobs[0].title}`);

  const matchRes = await fetch(
    `${URL}/rest/v1/rpc/match_candidates_for_job`,
    {
      method: "POST",
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_job_id: jobs[0].id, p_limit: 3 }),
    }
  );
  const matches = await matchRes.json();
  if (!Array.isArray(matches)) throw new Error(JSON.stringify(matches));
  console.log(`Matches via REST RPC: ${matches.length}`);
  matches.forEach((m: { similarity: number; candidate_id: string }) =>
    console.log(`  ${(m.similarity * 100).toFixed(1)}% ${m.candidate_id.slice(0, 8)}…`)
  );

  console.log("Authenticated Phase 2 checks OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
