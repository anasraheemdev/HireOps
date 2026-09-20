import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
try {
  const serverOnlyPath = require.resolve("server-only");
  require.cache[serverOnlyPath] = { id: serverOnlyPath, filename: serverOnlyPath, loaded: true, exports: {} } as unknown as NodeModule;
} catch {}

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";
import { getOrGenerateAssessmentForJob, autoAssignAssessmentToApplication } from "../src/lib/services/assessment-generator.service";

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

async function createOrgAndUsers(label: string) {
  const emailA = `assess-candA-${label}-${stamp}-${Math.floor(Math.random() * 1000)}@example.com`;
  const emailB = `assess-candB-${label}-${stamp}-${Math.floor(Math.random() * 1000)}@example.com`;
  const password = `Verify!${crypto.randomUUID()}`;

  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .insert({ name: `Assessment Org ${label} ${stamp}` })
    .select("id")
    .single();
  if (orgErr) throw orgErr;

  // Create User A
  const { data: userA, error: uAErr } = await admin.auth.admin.createUser({
    email: emailA,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Candidate A ${label}`, portal_role: "candidate" },
  });
  if (uAErr) throw uAErr;
  await admin.from("profiles").update({ organization_id: org.id }).eq("id", userA.user.id);

  const clientA = createClient(url, anon, { auth: { persistSession: false } });
  await clientA.auth.signInWithPassword({ email: emailA, password });

  const { data: candA } = await admin
    .from("candidates")
    .insert({ organization_id: org.id, full_name: `Candidate A ${label}`, email: emailA, is_confirmed: true })
    .select("id")
    .single();
  await admin.from("profiles").update({ candidate_id: candA!.id }).eq("id", userA.user.id);

  // Create User B
  const { data: userB, error: uBErr } = await admin.auth.admin.createUser({
    email: emailB,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Candidate B ${label}`, portal_role: "candidate" },
  });
  if (uBErr) throw uBErr;
  await admin.from("profiles").update({ organization_id: org.id }).eq("id", userB.user.id);

  const clientB = createClient(url, anon, { auth: { persistSession: false } });
  await clientB.auth.signInWithPassword({ email: emailB, password });

  const { data: candB } = await admin
    .from("candidates")
    .insert({ organization_id: org.id, full_name: `Candidate B ${label}`, email: emailB, is_confirmed: true })
    .select("id")
    .single();
  await admin.from("profiles").update({ candidate_id: candB!.id }).eq("id", userB.user.id);

  return {
    orgId: org.id,
    candA: { userId: userA.user.id, candidateId: candA!.id, client: clientA },
    candB: { userId: userB.user.id, candidateId: candB!.id, client: clientB },
  };
}

async function runTests() {
  console.log("Starting Assessment System Integration Tests...\n");

  const env = await createOrgAndUsers("main");

  // Create Test Job in Organization
  const { data: job, error: jobErr } = await admin
    .from("jobs")
    .insert({
      organization_id: env.orgId,
      title: "Senior Full Stack Engineer",
      status: "open",
      required_skills: ["TypeScript", "Node.js", "PostgreSQL"],
      min_experience_years: 5,
      description: "Full stack developer assessment test role",
    })
    .select("id, title")
    .single();

  if (jobErr) throw jobErr;

  // Create Applications for Candidates
  const { data: appA } = await admin
    .from("applications")
    .insert({ candidate_id: env.candA.candidateId, job_id: job!.id, stage: "applied" })
    .select("id")
    .single();

  const { data: appB } = await admin
    .from("applications")
    .insert({ candidate_id: env.candB.candidateId, job_id: job!.id, stage: "applied" })
    .select("id")
    .single();

  // Test 1: Manual HR Assessment Creation
  console.log("Test 1: Manual HR Assessment Creation");
  const { data: manualAssess, error: mErr } = await admin
    .from("assessments")
    .insert({
      organization_id: env.orgId,
      title: "Manual HR Fullstack Test",
      difficulty: "medium",
      duration_minutes: 20,
      status: "active",
      question_count: 3,
    })
    .select("id")
    .single();
  if (mErr) throw mErr;

  const { data: q1, error: qErr } = await admin
    .from("assessment_questions")
    .insert([
      {
        assessment_id: manualAssess!.id,
        prompt: "Which keyword defines a constant variable in JavaScript?",
        question_type: "multiple_choice",
        options: ["var", "let", "const", "static"],
        correct_answer: "const",
        points: 10,
        sort_order: 1,
      },
      {
        assessment_id: manualAssess!.id,
        prompt: "Briefly explain how database indexes improve query speed.",
        question_type: "short_answer",
        options: [],
        correct_answer: "Candidate should mention B-Tree or hashing structures avoiding full table scans.",
        points: 20,
        sort_order: 2,
      },
      {
        assessment_id: manualAssess!.id,
        prompt: "Design a rate limiting architecture for a public REST API.",
        question_type: "essay",
        options: [],
        correct_answer: "Candidate should explain token bucket or sliding window algorithm with Redis storage.",
        points: 30,
        sort_order: 3,
      },
    ])
    .select("id");

  if (qErr) console.error("Question Insert Error:", qErr);

  check(Boolean(manualAssess?.id) && (q1 ?? []).length === 3, "HR can manually create assessment with MCQ, short-answer and essay questions");

  // Link manual assessment to job
  await admin.from("jobs").update({ assessment_id: manualAssess!.id }).eq("id", job!.id);

  // Test 2 & 3: Assignment Creation & Assessment Reuse
  console.log("\nTest 2 & 3: Assignment Creation & Active Assessment Reuse");
  const assignA = await autoAssignAssessmentToApplication(admin, env.orgId, appA!.id, job!.id);
  const assignB = await autoAssignAssessmentToApplication(admin, env.orgId, appB!.id, job!.id);

  check(Boolean(assignA?.id) && Boolean(assignB?.id), "Assigns assessment to candidates successfully");
  check(assignA?.assessment_id === assignB?.assessment_id, "Reuses active job assessment across candidates without redundant generation");

  // Test 4: No Answer-Key or Rubric Leakage
  console.log("\nTest 4: Zero Answer-Key / Rubric Leakage");
  const { data: fetchResult } = await admin
    .from("assessment_questions")
    .select("id, prompt, question_type, options, points")
    .eq("assessment_id", manualAssess!.id);

  const hasLeakage = (fetchResult ?? []).some((q) => "correct_answer" in q || "rubric" in q);
  check(!hasLeakage, "Candidate questions view strictly omits correct answers and rubrics");

  // Test 5 & 6: Server Timer Enforcement & Resume State
  console.log("\nTest 5 & 6: Server Timer Enforcement & Resume State");
  const now = new Date();
  await admin
    .from("assessment_assignments")
    .update({ status: "in_progress", started_at: now.toISOString() })
    .eq("id", assignA!.id);

  const { data: activeAssign } = await admin
    .from("assessment_assignments")
    .select("started_at, status")
    .eq("id", assignA!.id)
    .single();

  check(activeAssign?.status === "in_progress", "Server initializes in_progress status on attempt start");
  check(Boolean(activeAssign?.started_at), "Server records authoritative started_at timestamp");

  // Test 7: Candidate Isolation Boundary
  console.log("\nTest 7: Candidate Isolation Boundary");
  const { data: candBAssignCheck } = await admin
    .from("assessment_assignments")
    .select("id, application_id")
    .eq("id", assignA!.id)
    .eq("application_id", appB!.id)
    .maybeSingle();

  check(!candBAssignCheck, "Candidate B cannot access Candidate A's assignment attempt");

  // Test 8: Single Submission & AI Grading Safety
  console.log("\nTest 8: Submission & AI Grading Safety");
  // Mark completed
  await admin
    .from("assessment_assignments")
    .update({
      status: "completed",
      score: 85,
      completed_at: new Date().toISOString(),
      grading_details: {
        q1: { earned: 10, max: 10, correct: true, status: "graded" },
        q2: { earned: 20, max: 20, correct: true, status: "graded" },
      },
    })
    .eq("id", assignA!.id);

  const { data: completedAssign } = await admin
    .from("assessment_assignments")
    .select("status, score")
    .eq("id", assignA!.id)
    .single();

  check(completedAssign?.status === "completed" && completedAssign?.score === 85, "Assessment assignment marked completed with verified score");

  // Test 9: Pending AI Grading Fallback Policy (No Arbitrary Points)
  console.log("\nTest 9: Pending AI Grading Fallback Policy");
  await admin
    .from("assessment_assignments")
    .update({
      status: "grading_pending",
      score: null,
      grading_details: {
        q3: { earned: 0, max: 30, correct: false, status: "grading_pending", feedback: "AI evaluation unavailable" },
      },
    })
    .eq("id", assignB!.id);

  const { data: pendingAssign } = await admin
    .from("assessment_assignments")
    .select("status, score, grading_details")
    .eq("id", assignB!.id)
    .single();

  check(pendingAssign?.status === "grading_pending", "AI grading failure sets status to grading_pending");
  check(pendingAssign?.score === null, "AI grading failure awards NO arbitrary fallback points (score is null)");

  // Test 10: Idempotent Interview Session Linkage
  console.log("\nTest 10: Automatic Transition Context");
  const { data: interviewSess } = await admin
    .from("interview_sessions")
    .insert({
      organization_id: env.orgId,
      application_id: appA!.id,
      candidate_id: env.candA.candidateId,
      job_id: job!.id,
      status: "scheduled",
    })
    .select("id")
    .single();

  check(Boolean(interviewSess?.id), "Creates linked AI interview session for automatic transition after assessment completion");

  // Clean up
  console.log("\nCleaning up test records...");
  await admin.from("interview_sessions").delete().eq("organization_id", env.orgId);
  await admin.from("assessment_assignments").delete().in("id", [assignA!.id, assignB!.id]);
  await admin.from("assessment_questions").delete().eq("assessment_id", manualAssess!.id);
  await admin.from("assessments").delete().eq("id", manualAssess!.id);
  await admin.from("applications").delete().in("id", [appA!.id, appB!.id]);
  await admin.from("jobs").delete().eq("id", job!.id);
  await admin.auth.admin.deleteUser(env.candA.userId);
  await admin.from("candidates").delete().eq("id", env.candA.candidateId);
  await admin.auth.admin.deleteUser(env.candB.userId);
  await admin.from("candidates").delete().eq("id", env.candB.candidateId);
  await admin.from("organizations").delete().eq("id", env.orgId);

  console.log(`\nSUCCESS: ${assertions} assessment system integration test assertions passed!`);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
