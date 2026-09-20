import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
try {
  const serverOnlyPath = require.resolve("server-only");
  require.cache[serverOnlyPath] = { id: serverOnlyPath, filename: serverOnlyPath, loaded: true, exports: {} } as unknown as NodeModule;
} catch {}

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { jsPDF } from "jspdf";
import assert from "node:assert/strict";
// server-only mock stubbed below


dotenv.config({ path: ".env.local", quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const stamp = Date.now();
let assertions = 0;

function check(condition: boolean, label: string) {
  assert.ok(condition, label);
  assertions++;
  console.log(`PASS ${label}`);
}

async function createCandidateAccount(label: string) {
  const email = `onboarding-${label}-${stamp}-${Math.floor(Math.random() * 1000)}@example.com`;
  const password = `Verify!${crypto.randomUUID()}`;
  const { data: user, error: userErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Candidate ${label}`, portal_role: "candidate" },
  });
  if (userErr) throw userErr;

  const client = createClient(url, anon, { auth: { persistSession: false } });
  const { error: authErr } = await client.auth.signInWithPassword({ email, password });
  if (authErr) throw authErr;

  const { data: profile } = await admin
    .from("profiles")
    .select("id, candidate_id, organization_id")
    .eq("id", user.user.id)
    .single();

  if (!profile?.candidate_id || !profile?.organization_id) {
    throw new Error("Profile linking incomplete");
  }

  return {
    userId: user.user.id,
    candidateId: profile.candidate_id,
    orgId: profile.organization_id,
    email,
    client,
  };
}

async function runTests() {
  const { extractResumeText } = await import("../src/lib/ai/extract-text");
  const { parseResumeBuffer } = await import("../src/lib/services/resume-parse.service");
  const { confirmCandidateProfile } = await import("../src/lib/services/candidate-portal.service");

  console.log("Starting Candidate Onboarding & CV Parsing Integration Tests...\n");

  // Test 1: Valid Text PDF Extraction & AI Parsing
  console.log("Test 1: Valid Text PDF Parsing");
  const doc = new jsPDF();
  doc.text(
    [
      "Amal Al-Harthy",
      "amal.harthy@example.com",
      "Software Engineer | Muscat, Oman",
      "5 years experience building Web applications with JavaScript, React and PostgreSQL.",
      "Skills: JavaScript, React, PostgreSQL, TypeScript, Node.js",
      "Experience: Senior Developer at TechOman, 2021 - Present.",
      "Built resilient microservices and React dashboards.",
      "Education: BSc Computer Science, Sultan Qaboos University, 2017 - 2021",
    ],
    15,
    20
  );
  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  const extractRes = await extractResumeText(pdfBuffer, "application/pdf", "amal-resume.pdf");
  const pdfText = extractRes.text;
  check(pdfText.includes("Amal Al-Harthy") && pdfText.includes("JavaScript"), "Extract text from valid PDF");

  const pdfParseResult = await parseResumeBuffer(pdfBuffer, "application/pdf", "amal-resume.pdf");
  check(pdfParseResult.confidence > 50, "PDF parsing generates high confidence score");
  check(pdfParseResult.parsed.skills.some((s) => /javascript|react/i.test(s)), "PDF parsing extracts skills");

  // Test 2: Valid DOCX Format Parsing simulation
  console.log("\nTest 2: Valid Text Document");
  const docxContent = Buffer.from(
    "Full Name: Salim Rashid\nEmail: salim.rashid@example.com\nHeadline: Backend Engineer\nSkills: Python, Django, PostgreSQL, Docker\nExperience: Backend Lead at Oman Pay, 2020-2026."
  );
  const docxParseResult = await parseResumeBuffer(docxContent, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "salim-cv.docx");
  check(docxParseResult.parsed.skills.length > 0, "DOCX parsing extracts structured fields");

  // Test 3: Unsupported File Rejection
  console.log("\nTest 3: Unsupported File Type Rejection");
  try {
    await parseResumeBuffer(Buffer.from("MZ binary payload"), "application/x-msdownload", "installer.exe");
    check(false, "Should reject executable file");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    check(/unsupported file format/i.test(msg), "Rejects unsupported file format with actionable error");
  }

  // Test 4: Oversized File Rejection (>10MB)
  console.log("\nTest 4: Oversized File Rejection (>10MB)");
  try {
    const hugeBuffer = Buffer.alloc(11 * 1024 * 1024);
    await parseResumeBuffer(hugeBuffer, "application/pdf", "huge.pdf");
    check(false, "Should reject >10MB file");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    check(/exceeds 10mb limit/i.test(msg), "Rejects oversized file (>10MB) with actionable error");
  }

  // Test 5: Scanned / Empty PDF Rejection
  console.log("\nTest 5: Scanned / Empty PDF Rejection");
  try {
    const emptyDoc = new jsPDF();
    const emptyBuffer = Buffer.from(emptyDoc.output("arraybuffer"));
    await parseResumeBuffer(emptyBuffer, "application/pdf", "scanned-image.pdf");
    check(false, "Should reject empty scanned PDF");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    check(/no readable text found|scanned image/i.test(msg), "Returns actionable scanned/empty PDF error message");
  }

  // Test 6: Database Persistence & Profile Confirmation
  console.log("\nTest 6: Database Persistence & Profile Confirmation");
  const candA = await createCandidateAccount("alpha");

  const confirmResult = await confirmCandidateProfile(candA.client, candA.userId, candA.candidateId, {
    fullName: "Amal Al-Harthy",
    email: candA.email,
    phone: "+96891234567",
    location: "Muscat, Oman",
    headline: "Senior Software Engineer",
    summary: "Experienced engineer specializing in React and PostgreSQL.",
    experienceYears: 5,
    skills: ["JavaScript", "React", "PostgreSQL", "TypeScript"],
    languages: [{ name: "Arabic", level: "native" }, { name: "English", level: "fluent" }],
    certifications: [{ name: "AWS Certified Developer", issuer: "AWS", year: "2023" }],
    experience: [{ role: "Senior Developer", company: "TechOman", period: "2021 - Present" }],
    education: [{ degree: "BSc Computer Science", institution: "Sultan Qaboos University", period: "2017 - 2021" }],
    resumeFilePath: `${candA.orgId}/${candA.candidateId}/resume.pdf`,
    resumeText: pdfText,
  });

  console.log("confirmResult payload:", JSON.stringify(confirmResult, null, 2));
  check(confirmResult.candidate?.full_name === "Amal Al-Harthy", "Persists full name correctly");
  check(confirmResult.candidate?.is_confirmed === true, "Sets is_confirmed to true upon confirmation");
  check(confirmResult.candidate?.resume_file_path === `${candA.orgId}/${candA.candidateId}/resume.pdf`, "Persists private Storage path");

  // Verify child tables
  const { data: skillsRows } = await admin.from("candidate_skills").select("skill").eq("candidate_id", candA.candidateId);
  check((skillsRows ?? []).length === 4, "Persists skills in child table");

  // Test 7: Candidate Tenant & Profile Isolation
  console.log("\nTest 7: Candidate Tenant & Profile Isolation");
  const candB = await createCandidateAccount("beta");
  try {
    // Candidate B tries to update Candidate A's profile
    await confirmCandidateProfile(candB.client, candB.userId, candA.candidateId, {
      fullName: "Malicious Tamper",
    });
    check(false, "Candidate B should not be allowed to update Candidate A's profile");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    check(/not authorized/i.test(msg), "Blocks cross-candidate profile tampering");
  }

  // Test 8: Idempotent Retry & Preservation of Verified Data
  console.log("\nTest 8: Idempotent Retry & Preservation of Verified Data");
  const reconfirmedResult = await confirmCandidateProfile(candA.client, candA.userId, candA.candidateId, {
    fullName: "Amal Al-Harthy",
    skills: ["JavaScript", "React", "PostgreSQL", "TypeScript", "GraphQL"],
  });
  check(reconfirmedResult.candidate?.is_confirmed === true, "Re-confirming profile remains idempotent");
  const { data: updatedSkills } = await admin.from("candidate_skills").select("skill").eq("candidate_id", candA.candidateId);
  check((updatedSkills ?? []).length === 5, "Idempotent update correctly updates skills child records");

  // Clean up test records
  console.log("\nCleaning up test records...");
  await admin.auth.admin.deleteUser(candA.userId);
  await admin.from("candidates").delete().eq("id", candA.candidateId);
  await admin.auth.admin.deleteUser(candB.userId);
  await admin.from("candidates").delete().eq("id", candB.candidateId);

  console.log(`\nSUCCESS: ${assertions} integration test assertions passed!`);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
