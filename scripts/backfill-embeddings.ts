/**
 * Backfill embeddings for all candidates and jobs that are missing them.
 * Uses OpenRouter (or AI_EMBEDDING_PROVIDER) via direct HTTP — no Next.js runtime.
 *
 * Usage: npx tsx scripts/backfill-embeddings.ts
 */
import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const EMBED_MODEL = process.env.AI_EMBEDDING_MODEL || "openai/text-embedding-3-small";

if (!OPENROUTER_KEY) {
  console.error("OPENROUTER_API_KEY is not set in .env.local");
  process.exit(1);
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://hireops.app",
      "X-Title": "HireOps",
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`embeddings failed (${res.status}): ${body.slice(0, 400)}`);
  }
  const json = await res.json();
  return [...json.data].sort((a, b) => a.index - b.index).map((r) => r.embedding as number[]);
}

function toVectorLiteral(v: number[]) {
  return `[${v.join(",")}]`;
}

async function main() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const { rows: candidates } = await client.query<{
    id: string;
    full_name: string;
    headline: string | null;
    location: string | null;
    experience_years: number;
    resume_text: string | null;
    skills: string | null;
  }>(`
    select c.id, c.full_name, c.headline, c.location, c.experience_years, c.resume_text,
           coalesce(string_agg(cs.skill, ', '), '') as skills
    from candidates c
    left join candidate_skills cs on cs.candidate_id = c.id
    where c.embedding is null
    group by c.id
  `);

  console.log(`Candidates needing embeddings: ${candidates.length}`);
  for (let i = 0; i < candidates.length; i += 8) {
    const batch = candidates.slice(i, i + 8);
    const texts = batch.map((c) =>
      [
        c.full_name,
        c.headline,
        c.location,
        `${c.experience_years} years experience`,
        c.skills ? `Skills: ${c.skills}` : null,
        c.resume_text?.slice(0, 3000),
      ]
        .filter(Boolean)
        .join(". ")
    );
    const vectors = await embedBatch(texts);
    for (let j = 0; j < batch.length; j++) {
      await client.query(
        `update candidates set embedding = $1::vector, embedding_updated_at = now() where id = $2`,
        [toVectorLiteral(vectors[j]), batch[j].id]
      );
      console.log(`  candidate ${batch[j].full_name}`);
    }
  }

  const { rows: jobs } = await client.query<{
    id: string;
    title: string;
    description: string | null;
    level: string | null;
    location: string;
    min_experience_years: number;
    required_skills: string[];
    nice_to_have_skills: string[];
  }>(`
    select id, title, description, level, location, min_experience_years, required_skills, nice_to_have_skills
    from jobs
    where embedding is null
  `);

  console.log(`Jobs needing embeddings: ${jobs.length}`);
  for (let i = 0; i < jobs.length; i += 8) {
    const batch = jobs.slice(i, i + 8);
    const texts = batch.map((j) =>
      [
        j.title,
        j.level,
        j.location,
        `Requires ${j.min_experience_years}+ years experience`,
        j.required_skills?.length ? `Required skills: ${j.required_skills.join(", ")}` : null,
        j.nice_to_have_skills?.length ? `Nice to have: ${j.nice_to_have_skills.join(", ")}` : null,
        j.description,
      ]
        .filter(Boolean)
        .join(". ")
    );
    const vectors = await embedBatch(texts);
    for (let j = 0; j < batch.length; j++) {
      await client.query(
        `update jobs set embedding = $1::vector, embedding_updated_at = now() where id = $2`,
        [toVectorLiteral(vectors[j]), batch[j].id]
      );
      console.log(`  job ${batch[j].title}`);
    }
  }

  await client.end();
  console.log("Backfill complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
