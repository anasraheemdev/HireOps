import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
try {
  const serverOnlyPath = require.resolve("server-only");
  require.cache[serverOnlyPath] = { id: serverOnlyPath, filename: serverOnlyPath, loaded: true, exports: {} } as unknown as NodeModule;
} catch {}

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";
import { confirmCandidateProfile } from "../src/lib/services/candidate-portal.service";
import { getCandidateJobRecommendations, calculateDetailedJobMatch } from "../src/lib/services/job-matching.service";
import { applyToJob } from "../src/lib/services/candidate-portal.service";

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

async function createOrgAndUser(label: string) {
  const email = `job-rec-${label}-${stamp}-${Math.floor(Math.random() * 1000)}@example.com`;
  const password = `Verify!${crypto.randomUUID()}`;

  // Create unique org for test isolation
  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .insert({ name: `Test Org ${label} ${stamp}` })
    .select("id")
    .single();
  if (orgErr) throw orgErr;

  const { data: user, error: userErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Candidate ${label}`, portal_role: "candidate" },
  });
  if (userErr) throw userErr;

  // Link profile to org
  await admin.from("profiles").update({ organization_id: org.id }).eq("id", user.user.id);

  const client = createClient(url, anon, { auth: { persistSession: false } });
  const { error: authErr } = await client.auth.signInWithPassword({ email, password });
  if (authErr) throw authErr;

  // Ensure candidate profile exists
  const { data: candidate } = await admin
    .from("candidates")
    .insert({
      organization_id: org.id,
      full_name: `Candidate ${label}`,
      email,
      experience_years: 5,
      is_confirmed: true,
    })
    .select("id")
    .single();

  await admin.from("profiles").update({ candidate_id: candidate!.id }).eq("id", user.user.id);

  return {
    userId: user.user.id,
    candidateId: candidate!.id,
    orgId: org.id,
    email,
    client,
  };
}

async function createTestJob(orgId: string, title: string, status: "open" | "closed" | "draft", requiredSkills: string[], minExp = 3) {
  const { data: job, error } = await admin
    .from("jobs")
    .insert({
      organization_id: orgId,
      title,
      status,
      required_skills: requiredSkills,
      min_experience_years: minExp,
      description: `Test role for ${title}`,
      location: "Muscat, Oman",
    })
    .select("id, title, status, organization_id")
    .single();
  if (error) throw error;
  return job;
}

async function runTests() {
  console.log("Starting Candidate Job Recommendation & Application Integration Tests...\n");

  const candA = await createOrgAndUser("orgA");
  const candB = await createOrgAndUser("orgB");

  // Populate Candidate A profile details (JavaScript, React, PostgreSQL)
  await confirmCandidateProfile(candA.client, candA.userId, candA.candidateId, {
    fullName: "Amal Al-Harthy",
    headline: "Senior React Developer",
    summary: "Experienced software engineer specializing in JavaScript, React, and PostgreSQL",
    experienceYears: 5,
    skills: ["JavaScript", "React", "PostgreSQL", "TypeScript", "Node.js"],
  });

  // Create Jobs in Org A
  const relevantJob = await createTestJob(candA.orgId, "Senior Frontend Developer", "open", ["JavaScript", "React", "TypeScript"], 4);
  const irrelevantJob = await createTestJob(candA.orgId, "Lead Petroleum Geologist", "open", ["Geology", "Seismic Modeling", "Reservoir Simulation"], 12);
  const closedJob = await createTestJob(candA.orgId, "Archived React Role", "closed", ["React"], 2);

  // Create Job in Org B
  const orgBJob = await createTestJob(candB.orgId, "Org B Confidential Role", "open", ["JavaScript"], 2);

  // Test 1: Relevant Job Returned (>= 55 Threshold)
  console.log("Test 1: Relevant Job Returned (>= 55 Threshold)");
  const recs = await getCandidateJobRecommendations(candA.client, candA.candidateId, 55);
  const foundRelevant = recs.recommendations.find((r) => r.id === relevantJob.id);
  check(Boolean(foundRelevant), "Relevant job is included in recommendations");
  check((foundRelevant?.relevanceScore ?? 0) >= 55, "Relevant job score is >= 55 threshold");

  // Test 2: Irrelevant Job Hidden (< 55 Threshold)
  console.log("\nTest 2: Irrelevant Job Hidden (< 55 Threshold)");
  const foundIrrelevant = recs.recommendations.find((r) => r.id === irrelevantJob.id);
  check(!foundIrrelevant, "Irrelevant job (<55 score) is hidden from recommendations");

  // Test 3: Closed Job Hidden
  console.log("\nTest 3: Closed Job Hidden");
  const foundClosed = recs.recommendations.find((r) => r.id === closedJob.id);
  check(!foundClosed, "Closed job is hidden from candidate recommendations");

  // Test 4: Cross-Organization Access & Application Denied
  console.log("\nTest 4: Cross-Organization Access & Application Denied");
  const crossOrgInRecs = recs.recommendations.find((r) => r.id === orgBJob.id);
  check(!crossOrgInRecs, "Org B job is hidden from Org A candidate recommendations query");

  try {
    // Candidate A attempts to apply to Org B's job
    await applyToJob(candA.client, candA.candidateId, orgBJob.id, candA.userId);
    check(false, "Should deny cross-organization job application");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    check(/access denied|not found/i.test(msg), "Blocks cross-organization job application with access error");
  }

  // Test 5: Idempotent Application & Duplicate Application Prevented
  console.log("\nTest 5: Idempotent Application & Duplicate Application Prevented");
  const appResult1 = await applyToJob(candA.client, candA.candidateId, relevantJob.id, candA.userId);
  check(appResult1.alreadyApplied === false, "First job application succeeds");

  const appResult2 = await applyToJob(candA.client, candA.candidateId, relevantJob.id, candA.userId);
  check(appResult2.alreadyApplied === true, "Repeated application request is idempotent and returns alreadyApplied");

  // Test 6: Score Bounds (0 - 100)
  console.log("\nTest 6: Match Score Bounds (0 - 100)");
  const scoreResult = calculateDetailedJobMatch(
    { id: "c1", organizationId: "o1", fullName: "Test", experienceYears: 100, skills: Array(50).fill("skill") },
    { id: "j1", organizationId: "o1", title: "Test Job", status: "open", requiredSkills: ["skill"], minExperienceYears: 1 }
  );
  check(scoreResult.overallScore >= 0 && scoreResult.overallScore <= 100, "Calculated score is bounded between 0 and 100");

  // Test 7: Score Recalculation After Candidate Skill Update
  console.log("\nTest 7: Score Recalculation After Candidate Skill Update");
  await confirmCandidateProfile(candA.client, candA.userId, candA.candidateId, {
    fullName: "Amal Al-Harthy",
    headline: "Geologist Expert",
    experienceYears: 15,
    skills: ["Geology", "Seismic Modeling", "Reservoir Simulation", "JavaScript", "React"],
  });

  const updatedRecs = await getCandidateJobRecommendations(candA.client, candA.candidateId, 55);
  const nowMatchingGeo = updatedRecs.recommendations.find((r) => r.id === irrelevantJob.id);
  check(Boolean(nowMatchingGeo), "Previously hidden job now matches after candidate acquires skills");

  // Clean up
  console.log("\nCleaning up test records...");
  await admin.from("applications").delete().eq("candidate_id", candA.candidateId);
  await admin.from("jobs").delete().in("id", [relevantJob.id, irrelevantJob.id, closedJob.id, orgBJob.id]);
  await admin.auth.admin.deleteUser(candA.userId);
  await admin.from("candidates").delete().eq("id", candA.candidateId);
  await admin.from("organizations").delete().eq("id", candA.orgId);
  await admin.auth.admin.deleteUser(candB.userId);
  await admin.from("candidates").delete().eq("id", candB.candidateId);
  await admin.from("organizations").delete().eq("id", candB.orgId);

  console.log(`\nSUCCESS: ${assertions} job recommendation & application test assertions passed!`);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
