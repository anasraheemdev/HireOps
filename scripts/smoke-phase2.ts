/**
 * Phase 2 smoke test — embeddings match RPC + resume parse via OpenRouter.
 * Usage: npx tsx scripts/smoke-phase2.ts
 */
import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const { rows: jobs } = await client.query(`select id, title from jobs where embedding is not null limit 1`);
  if (!jobs.length) throw new Error("No job with embedding");
  const jobId = jobs[0].id;
  console.log(`Matching against: ${jobs[0].title}`);

  const { rows: matches } = await client.query(
    `select candidate_id, similarity from match_candidates_for_job($1, 5)`,
    [jobId]
  );
  console.log(`Top matches (${matches.length}):`);
  for (const m of matches) {
    const { rows: names } = await client.query(`select full_name from candidates where id = $1`, [m.candidate_id]);
    console.log(`  ${(m.similarity * 100).toFixed(1)}% — ${names[0]?.full_name}`);
  }

  const sampleResume = `
John Doe
Senior Software Engineer
john.doe@example.com | +968 9123 4567 | Muscat, Oman

SUMMARY
Full-stack engineer with 8 years of experience in TypeScript, React, and PostgreSQL.

EXPERIENCE
Senior Software Engineer — Acme Corp (2021 — Present)
Built HR analytics platforms with Next.js and Supabase.

Software Engineer — Beta LLC (2017 — 2021)
Developed REST APIs in Node.js.

EDUCATION
BSc Computer Science — Sultan Qaboos University (2013 — 2017)

SKILLS
TypeScript, React, Next.js, PostgreSQL, Supabase, Docker

LANGUAGES
English (Fluent), Arabic (Native)

CERTIFICATIONS
AWS Solutions Architect — Amazon — 2023
`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://hireops.app",
      "X-Title": "HireOps",
    },
    body: JSON.stringify({
      model: process.env.AI_CHAT_MODEL || "qwen/qwen-2.5-72b-instruct",
      response_format: { type: "json_object" },
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            'Extract resume JSON with keys: fullName, headline, email, phone, location, experienceYears, skills (string[]), languages ([{name,level}]), certifications ([{name,issuer,year}]), experience ([{role,company,period}]), education ([{degree,institution,period}]).',
        },
        { role: "user", content: sampleResume },
      ],
    }),
  });
  if (!res.ok) throw new Error(`parse failed: ${await res.text()}`);
  const json = await res.json();
  const parsed = JSON.parse(json.choices[0].message.content);
  console.log("Parsed resume sample:");
  console.log(`  ${parsed.fullName} — ${parsed.headline}`);
  console.log(`  ${parsed.email} | skills: ${(parsed.skills || []).slice(0, 4).join(", ")}`);

  await client.end();
  console.log("Phase 2 smoke test OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
