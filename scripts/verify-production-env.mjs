import dotenv from "dotenv";

dotenv.config({ path: ".env.production", quiet: true });
dotenv.config({ path: ".env.local", quiet: true });

const mandatoryVars = [
  "AI_PROVIDER",
  "AI_CHAT_MODEL",
  "AI_EMBEDDING_MODEL",
  "OPENROUTER_API_KEY",
  "APP_ENCRYPTION_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
];

console.log("=== Production Environment & Dependency Verification ===");

let missingCount = 0;

for (const key of mandatoryVars) {
  const val = process.env[key];
  if (val && val.trim().length > 0) {
    console.log(` ✓ ${key}: configured`);
  } else {
    console.error(` ✗ ${key}: MISSING`);
    missingCount++;
  }
}

// Verify PDF parsing dependencies load cleanly in SSR runtime
try {
  const pdfParse = await import("pdf-parse");
  if (!pdfParse) throw new Error("pdf-parse import returned empty module");
  console.log(" ✓ Dependency pdf-parse: loaded successfully");
} catch (err) {
  console.error(" ✗ Dependency pdf-parse: load failed:", err instanceof Error ? err.message : err);
  missingCount++;
}

try {
  const mammoth = await import("mammoth");
  if (!mammoth) throw new Error("mammoth import returned empty module");
  console.log(" ✓ Dependency mammoth: loaded successfully");
} catch (err) {
  console.error(" ✗ Dependency mammoth: load failed:", err instanceof Error ? err.message : err);
  missingCount++;
}

console.log("=========================================================");

if (missingCount > 0) {
  console.error(`FAILURE: ${missingCount} mandatory environment variables or dependencies are missing or unreadable.`);
  process.exit(1);
} else {
  console.log("SUCCESS: All production environment variables and PDF dependencies verified.");
}
