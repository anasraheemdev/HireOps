import { Client } from "pg";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new Client({ connectionString: process.env.DIRECT_URL, ssl: { rejectUnauthorized: false } });
try {
  await client.connect();
  const res = await client.query("select version(), current_database(), now();");
  console.log("CONNECTED OK");
  console.log(res.rows[0].version);
  console.log("db:", res.rows[0].current_database);
} catch (err) {
  console.error("CONNECTION FAILED:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
