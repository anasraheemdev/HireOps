import { Client } from "pg";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "..", "supabase", "migrations");

const client = new Client({ connectionString: process.env.DIRECT_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  await client.query(`
    create table if not exists _migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    );
  `);

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const { rows: applied } = await client.query("select name from _migrations");
  const appliedSet = new Set(applied.map((r) => r.name));

  let ranAny = false;
  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`skip   ${file} (already applied)`);
      continue;
    }
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    console.log(`apply  ${file} ...`);
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into _migrations (name) values ($1)", [file]);
      await client.query("commit");
      console.log(`  ok`);
      ranAny = true;
    } catch (err) {
      await client.query("rollback");
      console.error(`  FAILED: ${err.message}`);
      process.exitCode = 1;
      break;
    }
  }

  if (!ranAny && process.exitCode !== 1) console.log("Nothing to do — all migrations already applied.");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
