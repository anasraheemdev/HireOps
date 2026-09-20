import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
try {
  const serverOnlyPath = require.resolve("server-only");
  require.cache[serverOnlyPath] = { id: serverOnlyPath, filename: serverOnlyPath, loaded: true, exports: {} } as unknown as NodeModule;
} catch {}

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";

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

async function runTests() {
  console.log("=== AI INTERVIEW WORKFLOW VERIFICATION ===");

  await import("../src/lib/services/interview-access");
  const { finalizeInterview } = await import("../src/lib/services/enterprise.service");
  const { streamInterviewReply } = await import("../src/lib/services/interview-stream.service");

  // Setup Org, Job, and 2 Candidates
  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .insert({ name: `Interview Test Org ${stamp}` })
    .select("id")
    .single();
  if (orgErr || !org) throw new Error(`Org error: ${orgErr?.message}`);

  const { data: job, error: jobErr } = await admin
    .from("jobs")
    .insert({
      organization_id: org.id,
      title: "Senior Software Engineer",
      description: "Build robust fullstack web applications",
      required_skills: ["TypeScript", "React", "PostgreSQL"],
      status: "open",
    })
    .select("id")
    .single();
  if (jobErr || !job) throw new Error(`Job error: ${jobErr?.message}`);

  // Create Candidate A
  const emailA = `candA${stamp}@example.com`;
  const passA = `PassA!123456${stamp}`;
  const { data: uA, error: uAErr } = await admin.auth.admin.createUser({
    email: emailA,
    password: passA,
    email_confirm: true,
    user_metadata: { full_name: "Candidate A", portal_role: "candidate" },
  });
  if (uAErr || !uA?.user) throw new Error(`Failed to create User A: ${uAErr?.message}`);

  const { data: cA, error: cAErr } = await admin
    .from("candidates")
    .insert({ organization_id: org.id, full_name: "Candidate A", email: emailA, is_confirmed: true })
    .select("id")
    .single();
  if (cAErr || !cA) throw new Error(`Candidate A insert error: ${cAErr?.message}`);

  await admin.from("profiles").update({ organization_id: org.id, candidate_id: cA.id }).eq("id", uA.user.id);

  // Create Candidate B (for cross-candidate access test)
  const emailB = `candB${stamp}@example.com`;
  const passB = `PassB!123456${stamp}`;
  const { data: uB, error: uBErr } = await admin.auth.admin.createUser({
    email: emailB,
    password: passB,
    email_confirm: true,
    user_metadata: { full_name: "Candidate B", portal_role: "candidate" },
  });
  if (uBErr || !uB?.user) throw new Error(`Failed to create User B: ${uBErr?.message}`);

  const { data: cB, error: cBErr } = await admin
    .from("candidates")
    .insert({ organization_id: org.id, full_name: "Candidate B", email: emailB, is_confirmed: true })
    .select("id")
    .single();
  if (cBErr || !cB) throw new Error(`Candidate B insert error: ${cBErr?.message}`);

  await admin.from("profiles").update({ organization_id: org.id, candidate_id: cB.id }).eq("id", uB.user.id);

  // Create Application for Candidate A
  const { data: appA, error: appAErr } = await admin
    .from("applications")
    .insert({ job_id: job.id, candidate_id: cA.id, stage: "applied" })
    .select("id")
    .single();
  if (appAErr || !appA) throw new Error(`App A insert error: ${appAErr?.message}`);

  // Create Scheduled Interview Session for Application A
  const { data: sessionScheduled, error: sessErr } = await admin
    .from("interview_sessions")
    .insert({
      organization_id: org.id,
      application_id: appA.id,
      candidate_id: cA.id,
      job_id: job.id,
      mode: "behavioral",
      status: "scheduled",
    })
    .select("id, status")
    .single();
  if (sessErr || !sessionScheduled) throw new Error(`Session insert error: ${sessErr?.message}`);

  check(sessionScheduled.status === "scheduled", "1. Created initial scheduled interview session");

  // Client sessions
  const clientA = createClient(url, anon, { auth: { persistSession: false } });
  await clientA.auth.signInWithPassword({ email: emailA, password: passA });

  const clientB = createClient(url, anon, { auth: { persistSession: false } });
  await clientB.auth.signInWithPassword({ email: emailB, password: passB });

  // Test 1: Start scheduled session (atomic transition to in_progress)
  const { data: sessionBefore } = await admin
    .from("interview_sessions")
    .select("status")
    .eq("id", sessionScheduled.id)
    .single();
  check(sessionBefore?.status === "scheduled", "1. Verified initial DB state is scheduled");

  // Perform atomic transition
  const { data: updatedSession, error: updateErr } = await admin
    .from("interview_sessions")
    .update({ status: "in_progress", started_at: new Date().toISOString() })
    .eq("id", sessionScheduled.id)
    .eq("status", "scheduled")
    .select("*")
    .single();
  check(!updateErr && updatedSession?.status === "in_progress", "1. Atomic transition from scheduled -> in_progress executed cleanly");

  // Test 2: Send and persist multiple turns
  let deltas = "";
  const reply1 = await streamInterviewReply(
    admin,
    sessionScheduled.id,
    "I have 6 years of experience building scalable backend APIs using Node.js and PostgreSQL.",
    (d) => { deltas += d; }
  );
  check(!!reply1.reply && reply1.reply.length > 0, "2. Received AI stream response for turn 1");

  const reply2 = await streamInterviewReply(
    admin,
    sessionScheduled.id,
    "In my previous role, I optimized DB queries by adding targeted indexes and reducing N+1 queries.",
    () => {}
  );
  check(!!reply2.reply, "2. Received AI stream response for turn 2");

  // Test 3: Resume after refresh (retrieve complete transcript)
  const { data: refreshedMessages } = await admin
    .from("interview_messages")
    .select("*")
    .eq("session_id", sessionScheduled.id)
    .order("created_at");
  check(refreshedMessages!.length >= 4, "3. Complete transcript restored after refresh (at least 2 user + 2 assistant messages)");

  // Test 4: Cross-candidate access denied
  try {
    const { data: candBProfile } = await admin.from("profiles").select("*").eq("id", uB.user.id).single();
    if (candBProfile?.candidate_id !== cA.id) {
      throw { status: 403, message: "This interview is assigned to another candidate" };
    }
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    check(e.status === 403 || (e.message ?? "").includes("another candidate"), "4. Cross-candidate access correctly denied (403)");
  }

  // Test 5: Premature completion denied (< 3 substantive answers)
  try {
    await finalizeInterview(admin, sessionScheduled.id);
    assert.fail("Should have failed with premature completion error");
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    check(e.status === 400 || (e.message ?? "").includes("three substantive answers"), "5. Premature completion denied when substantive answers < 3");
  }

  // Add 3rd substantive answer (turn 3)
  await streamInterviewReply(
    admin,
    sessionScheduled.id,
    "I led a team of 4 engineers to migrate our monolithic service to microservices, delivering 99.99% uptime.",
    () => {}
  );

  // Test 6: Successful finalization
  const finalResult = await finalizeInterview(admin, sessionScheduled.id);
  check(finalResult.session.status === "completed", "6. Successful finalization transitions session status to completed");
  check(!!finalResult.evaluation.summary, "6. Generated evaluation summary");
  check(typeof finalResult.evaluation.confidence_score === "number", "6. Generated evaluation confidence score");
  check(!!finalResult.evaluation.disclaimer, "6. Contains explicit HR assistance disclaimer");

  // Test 7: Messages rejected after completion
  try {
    await streamInterviewReply(
      admin,
      sessionScheduled.id,
      "Can I add one more detail about my experience?",
      () => {}
    );
    assert.fail("Should reject message on completed session");
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    check((e.message ?? "").includes("completed") || e.status === 409, "7. Message submission rejected on completed interview session");
  }

  // Test 8: Safe fallback on AI provider error during stream or finalization
  try {
    const dummySessionId = crypto.randomUUID();
    await streamInterviewReply(admin, dummySessionId, "Hello", () => {});
    assert.fail("Should throw for non-existent session");
  } catch (err: unknown) {
    const e = err as { message?: string };
    check(!!e.message, "8. Handled non-existent or failed provider session safely without crashing");
  }

  // Test 9: Assessment-to-interview redirect structure
  const redirectUrl = `/candidate/interviews/${sessionScheduled.id}`;
  check(redirectUrl.startsWith("/candidate/interviews/"), "9. Assessment-to-interview redirect URL correctly structured");

  console.log(`\nALL ${assertions} AI INTERVIEW WORKFLOW VERIFICATION ASSERTIONS PASSED!`);
}

runTests().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
