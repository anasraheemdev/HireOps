import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
try {
  const serverOnlyPath = require.resolve("server-only");
  require.cache[serverOnlyPath] = { id: serverOnlyPath, filename: serverOnlyPath, loaded: true, exports: {} } as unknown as NodeModule;
} catch {}

import dotenv from "dotenv";
import { jsPDF } from "jspdf";
import assert from "node:assert/strict";

dotenv.config({ path: ".env.production", quiet: true });
dotenv.config({ path: ".env.local", quiet: true });

let assertions = 0;
function check(condition: boolean, label: string) {
  assert.ok(condition, label);
  assertions++;
  console.log(` [PASS] ${label}`);
}

async function runTests() {
  console.log("=== Comprehensive Production CV Pipeline Verification ===\n");

  const { extractResumeText, isSupportedResumeMime } = await import("../src/lib/ai/extract-text.js");
  const { parseResumeBuffer, parseResumeTextLocally } = await import("../src/lib/services/resume-parse.service.js");
  const { resolveAIConfig, validateAIConfiguration } = await import("../src/lib/ai/index.js");
  const { encryptSecret, decryptSecret } = await import("../src/lib/ai/secrets.js");

  // Test 1: Supported resume mime validation
  check(isSupportedResumeMime("application/pdf", "resume.pdf"), "Validate supported PDF mime");
  check(isSupportedResumeMime("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "cv.docx"), "Validate supported DOCX mime");
  check(!isSupportedResumeMime("image/png", "photo.png"), "Reject unsupported PNG mime");

  // Test 2: Valid Text PDF Extraction & AI Parsing
  const doc = new jsPDF();
  doc.text(
    [
      "Tariq Al-Lawati",
      "tariq.lawati@example.com",
      "+968 9876 5432",
      "Lead DevOps & Cloud Engineer | Muscat, Oman",
      "8 years experience building AWS Cloud and Kubernetes infrastructures.",
      "Skills: AWS, Kubernetes, Terraform, Docker, Python, PostgreSQL, CI/CD",
      "Experience: Senior Cloud Architect at TechOman, 2019 - Present.",
      "Built resilient microservices and automated deployment pipelines.",
      "Education: BSc Computer Engineering, Sultan Qaboos University, 2015 - 2019",
    ],
    15,
    20
  );
  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  const extractRes = await extractResumeText(pdfBuffer, "application/pdf", "tariq-cv.pdf");
  check(extractRes.text.includes("Tariq Al-Lawati") && extractRes.text.includes("Kubernetes"), "PDF text extraction returns clean text");
  check(extractRes.characterCount > 100, "PDF text character count > 100");

  // Test 3: Local Deterministic Parser Accuracy
  const localParsed = parseResumeTextLocally(extractRes.text, "Tariq_AlLawati_CV.pdf");
  check(localParsed.fullName.includes("Tariq"), "Local parser extracts full name");
  check(localParsed.email === "tariq.lawati@example.com", "Local parser extracts email");
  check(localParsed.experienceYears === 8, "Local parser extracts 8 years experience");
  check(localParsed.skills.includes("AWS") && localParsed.skills.includes("Kubernetes"), "Local parser extracts recognized skills");

  // Test 4: Full parseResumeBuffer integration
  const parseResult = await parseResumeBuffer(pdfBuffer, "application/pdf", "tariq-cv.pdf");
  check(!!parseResult.parsed && typeof parseResult.confidence === "number", "parseResumeBuffer succeeds on real PDF buffer");
  check(parseResult.confidence >= 15 && parseResult.confidence <= 98, "Confidence score is bounded between 15% and 98%");
  check(Array.isArray(parseResult.warnings), "Warnings array is returned");
  check(!!parseResult.correlationId && parseResult.correlationId.startsWith("req_"), "Returns request correlation ID");
  check(!!parseResult.diagnostics && typeof parseResult.diagnostics.totalDurationMs === "number", "Returns structured diagnostics object");

  // Test 5: Secret Encryption & Decryption
  const testSecretVal = "sk-or-v1-test-secret-key-123456789";
  const encrypted = encryptSecret(testSecretVal);
  check(encrypted.startsWith("v1:"), "Encrypted secret starts with v1: format prefix");
  const decrypted = decryptSecret(encrypted);
  check(decrypted === testSecretVal, "Decrypted secret matches original value");

  // Test 6: Safe Configuration Precedence Resolution
  const config = await resolveAIConfig();
  check(config.source === "environment" || config.source === "organization", "AI configuration resolves source cleanly");
  const validation = await validateAIConfiguration();
  check(typeof validation.hasApiKey === "boolean", "AI configuration validator checks API key presence");

  // Test 7: Verify PDF Dependencies Load Cleanly
  const pdfParseMod = await import("pdf-parse");
  check(!!pdfParseMod, "pdf-parse imports in production SSR runtime");
  const mammothMod = await import("mammoth");
  check(!!mammothMod, "mammoth imports in production SSR runtime");

  // Test 8: Verify Node.js runtime exports on API routes
  const candidateRoute = await import("../src/app/api/candidate/resume/route.js");
  check(candidateRoute.runtime === "nodejs" && candidateRoute.maxDuration === 60, "Candidate resume route exports nodejs runtime");
  const hrRoute = await import("../src/app/api/candidates/parse-resume/route.js");
  check(hrRoute.runtime === "nodejs" && hrRoute.maxDuration === 60, "HR parse resume route exports nodejs runtime");
  const applyRoute = await import("../src/app/api/candidate/applications/apply/route.js");
  check(applyRoute.runtime === "nodejs" && applyRoute.maxDuration === 60, "Candidate apply route exports nodejs runtime");

  console.log(`\n==================================================`);
  console.log(`SUCCESS: ${assertions} pipeline verification assertions passed!`);
  console.log(`==================================================\n`);
}

runTests().catch((err) => {
  console.error("Pipeline verification failed:", err);
  process.exit(1);
});
