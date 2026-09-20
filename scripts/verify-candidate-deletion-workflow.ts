import dotenv from "dotenv";
import { createAdminSupabaseClient } from "../src/lib/supabase/admin";
import {
  getCandidateDeletionPreview,
  deleteCandidatePermanently,
} from "../src/lib/services/admin.service";

dotenv.config({ path: ".env.local" });

async function runVerification() {
  console.log("=== Super Admin Permanent Candidate Deletion Verification ===");

  const adminClient = createAdminSupabaseClient();
  let assertions = 0;

  function assert(condition: boolean, message: string) {
    if (!condition) {
      console.error(`FAIL: ${message}`);
      process.exit(1);
    }
    assertions++;
    console.log(`PASS ${message}`);
  }

  // 1. Fetch organization & super admin profile
  const { data: org } = await adminClient.from("organizations").select("id").limit(1).single();
  assert(!!org?.id, "Found target organization");

  const { data: superAdmin } = await adminClient
    .from("profiles")
    .select("id, email, portal_role, organization_id")
    .eq("portal_role", "super_admin")
    .limit(1)
    .single();

  assert(!!superAdmin?.id, "Found super_admin actor profile");

  // 2. Create a dedicated test candidate & auth user
  const testEmail = `test-delete-${Date.now()}@hireops-test.internal`;
  const { data: authUser, error: authErr } = await adminClient.auth.admin.createUser({
    email: testEmail,
    password: "Password123!",
    email_confirm: true,
  });
  assert(!authErr && !!authUser.user?.id, "Created test Supabase Auth user");
  const authUserId = authUser.user!.id;

  // Create candidate record
  const { data: cand, error: candErr } = await adminClient
    .from("candidates")
    .insert({
      organization_id: org!.id,
      full_name: "Test Delete Candidate",
      email: testEmail,
      resume_file_path: `${org!.id}/${authUserId}/test-cv.pdf`,
    })
    .select()
    .single();

  assert(!candErr && !!cand?.id, "Created candidate database record");
  const candidateId = cand!.id;

  // Create linked profile
  const { error: profErr } = await adminClient.from("profiles").upsert({
    id: authUserId,
    organization_id: org!.id,
    full_name: "Test Delete Candidate",
    email: testEmail,
    portal_role: "candidate",
    candidate_id: candidateId,
    status: "active",
  });
  assert(!profErr, "Created candidate profile record");

  // 3. Create candidate relational dependencies
  // Job
  const { data: job } = await adminClient
    .from("jobs")
    .insert({
      organization_id: org!.id,
      title: "Test Job for Deletion",
    })
    .select()
    .single();
  assert(!!job?.id, "Created job record");

  // Application
  const { data: app } = await adminClient
    .from("applications")
    .insert({
      candidate_id: candidateId,
      job_id: job!.id,
      stage: "applied",
    })
    .select()
    .single();
  assert(!!app?.id, "Created application record");

  // Human interview & hiring decision
  await adminClient.from("human_interviews").insert({
    organization_id: org!.id,
    application_id: app!.id,
    interviewer_name: "Test Interviewer",
    scheduled_at: new Date().toISOString(),
  });

  await adminClient.from("hiring_decisions").insert({
    organization_id: org!.id,
    application_id: app!.id,
    decision: "selected",
  });

  // Assessment
  const { data: assessment } = await adminClient
    .from("assessments")
    .insert({
      organization_id: org!.id,
      title: "Test Assessment",
    })
    .select()
    .single();

  await adminClient.from("assessment_assignments").insert({
    assessment_id: assessment!.id,
    application_id: app!.id,
    status: "pending",
  });

  // Interview session & message
  const { data: session } = await adminClient
    .from("interview_sessions")
    .insert({
      organization_id: org!.id,
      candidate_id: candidateId,
      application_id: app!.id,
      mode: "behavioral",
    })
    .select()
    .single();

  await adminClient.from("interview_messages").insert({
    session_id: session!.id,
    role: "assistant",
    content: "Opening question...",
  });

  // Candidate sub-entities & documents
  await adminClient.from("candidate_skills").insert({ candidate_id: candidateId, skill: "Testing" });
  await adminClient.from("saved_jobs").insert({ candidate_id: candidateId, job_id: job!.id });
  await adminClient.from("candidate_documents").insert({
    organization_id: org!.id,
    candidate_id: candidateId,
    label: "ID Copy",
    file_path: `${org!.id}/${candidateId}/id.pdf`,
  });

  // Upload test storage file
  const fileBuffer = Buffer.from("Test resume content");
  await adminClient.storage.from("resumes").upload(`${org!.id}/${authUserId}/test-cv.pdf`, fileBuffer, {
    contentType: "application/pdf",
    upsert: true,
  });

  // 4. Test Deletion Preview
  const preview = await getCandidateDeletionPreview(candidateId, {
    id: superAdmin!.id,
    portalRole: "super_admin",
  });

  assert(preview.candidate.id === candidateId, "Preview returns correct candidate ID");
  assert(preview.candidate.email === testEmail, "Preview returns correct email");
  assert(preview.dependencies.applications === 1, "Preview reports 1 application");
  assert(preview.dependencies.interviewSessions === 1, "Preview reports 1 interview session");
  assert(preview.dependencies.documents === 1, "Preview reports 1 document");
  assert(preview.canDelete === true, "Preview marks candidate as deletable");

  // 5. Test Authorization & Input Validation Rejections
  try {
    await deleteCandidatePermanently(
      candidateId,
      { id: superAdmin!.id, email: superAdmin!.email, portalRole: "hr" },
      { confirmation: "DELETE", candidateEmail: testEmail, reason: "Test deletion" }
    );
    assert(false, "Non-super-admin should be rejected with 403");
  } catch (err: unknown) {
    assert((err as { status?: number }).status === 403, "Non-super-admin correctly rejected with 403");
  }

  try {
    await deleteCandidatePermanently(
      candidateId,
      { id: superAdmin!.id, email: superAdmin!.email, portalRole: "super_admin" },
      { confirmation: "DELETE", candidateEmail: "wrong@email.com", reason: "Test deletion" }
    );
    assert(false, "Mismatched email should be rejected");
  } catch (err: unknown) {
    assert((err as { status?: number }).status === 400, "Mismatched email correctly rejected with 400");
  }

  // 6. Execute Permanent Candidate Deletion
  const deleteResult = await deleteCandidatePermanently(
    candidateId,
    { id: superAdmin!.id, email: superAdmin!.email, portalRole: "super_admin" },
    { confirmation: "DELETE", candidateEmail: testEmail, reason: "Automated test deletion" }
  );

  assert(deleteResult.success === true, "Permanent deletion returned success");
  assert(deleteResult.authDeleted === true, "Supabase Auth user deleted");

  // 7. Verify Data Integrity Post-Deletion
  const { data: checkCand } = await adminClient.from("candidates").select("id").eq("id", candidateId).maybeSingle();
  assert(!checkCand, "Candidate record completely removed from database");

  const { data: checkProf } = await adminClient.from("profiles").select("id").eq("id", authUserId).maybeSingle();
  assert(!checkProf, "Candidate profile completely removed from database");

  const { data: checkApp } = await adminClient.from("applications").select("id").eq("id", app!.id).maybeSingle();
  assert(!checkApp, "Candidate application completely removed");

  const { data: checkSession } = await adminClient.from("interview_sessions").select("id").eq("id", session!.id).maybeSingle();
  assert(!checkSession, "Candidate interview session completely removed");

  const { data: checkAuth } = await adminClient.auth.admin.getUserById(authUserId);
  assert(!checkAuth?.user, "Supabase Auth account confirmed deleted");

  // Verify audit log record
  const { data: auditLogs } = await adminClient
    .from("audit_logs")
    .select("action, entity_id, metadata")
    .eq("action", "candidate_permanently_deleted")
    .eq("entity_id", candidateId);

  assert(Boolean(auditLogs && auditLogs.length > 0), "Permanent audit log entry retained in database");
  assert(auditLogs![0].metadata.candidate_email === testEmail, "Audit log contains candidate email");
  assert(auditLogs![0].metadata.reason === "Automated test deletion", "Audit log contains deletion reason");

  // Verify shared job definitions remain intact
  const { data: checkJob } = await adminClient.from("jobs").select("id").eq("id", job!.id).maybeSingle();
  assert(!!checkJob?.id, "Shared job definition remains intact and untouched");

  // Cleanup test job
  await adminClient.from("jobs").delete().eq("id", job!.id);

  console.log(`\nSUCCESS: All ${assertions} permanent candidate deletion assertions passed cleanly!`);
}

runVerification().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
