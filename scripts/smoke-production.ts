/**
 * Production smoke: apply → interview → finalize → offer path (DB-level).
 * Usage: npx tsx scripts/smoke-production.ts
 */
import dotenv from "dotenv";
import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

async function main() {
  const pg = new Client({ connectionString: process.env.DIRECT_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  const { rows: orgs } = await pg.query(`select id from organizations limit 1`);
  const orgId = orgs[0]?.id;
  if (!orgId) throw new Error("No organization");

  const { rows: jobs } = await pg.query(`select id, title from jobs where organization_id = $1 and status = 'open' limit 1`, [orgId]);
  const { rows: cands } = await pg.query(`select id, full_name from candidates where organization_id = $1 limit 1`, [orgId]);
  if (!jobs[0] || !cands[0]) throw new Error("Need at least one open job and candidate");

  const jobId = jobs[0].id;
  const candidateId = cands[0].id;
  console.log(`Job: ${jobs[0].title}`);
  console.log(`Candidate: ${cands[0].full_name}`);

  const app = await pg.query(
    `insert into applications (candidate_id, job_id, stage)
     values ($1, $2, 'applied')
     on conflict (candidate_id, job_id) do update set updated_at = now()
     returning id, stage`,
    [candidateId, jobId]
  );
  console.log(`Application: ${app.rows[0].id} (${app.rows[0].stage})`);

  const session = await pg.query(
    `insert into interview_sessions (organization_id, candidate_id, job_id, application_id, mode, status, started_at)
     values ($1, $2, $3, $4, 'behavioral', 'in_progress', now())
     returning id`,
    [orgId, candidateId, jobId, app.rows[0].id]
  );
  const sessionId = session.rows[0].id;
  await pg.query(
    `insert into interview_messages (session_id, role, content) values ($1, 'assistant', 'Welcome smoke test.')`,
    [sessionId]
  );
  console.log(`Interview session: ${sessionId}`);

  await pg.query(
    `update interview_sessions set status = 'completed', ended_at = now(), summary = 'Smoke test', recommendation = 'hire',
      scores = '{"overall": 80, "communication": 78}'::jsonb where id = $1`,
    [sessionId]
  );

  const offer = await pg.query(
    `insert into offers (organization_id, application_id, candidate_id, salary_text, status)
     values ($1, $2, $3, 'OMR 1,200', 'sent')
     returning id, status`,
    [orgId, app.rows[0].id, candidateId]
  );
  console.log(`Offer: ${offer.rows[0].id} (${offer.rows[0].status})`);

  // Auth ping
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const sb = createClient(url, anon);
  const { error } = await sb.from("jobs").select("id").limit(1);
  if (error) console.warn("Anon jobs select:", error.message);
  else console.log("Anon client can read jobs (RLS permitting)");

  const { rows: search } = await pg.query(`select * from search_org_entities($1, 5)`, [jobs[0].title.split(" ")[0]]);
  console.log(`Search hits: ${search.length}`);

  await pg.end();
  console.log("Smoke production OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
