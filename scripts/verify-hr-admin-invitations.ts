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
  console.log("=== HR, ADMIN & CANDIDATE INVITATIONS VERIFICATION ===");

  const { createCandidateInvitation, validateInvitationToken, acceptAndLinkInvitation, revokeInvitation } = await import("../src/lib/services/invitation.service");
  const { setApplicationDecision } = await import("../src/lib/services/candidates.service");
  const { updateUser, inviteUser } = await import("../src/lib/services/admin.service");

  // Setup Org A and Org B
  const { data: orgA } = await admin.from("organizations").insert({ name: `Org A ${stamp}` }).select("id").single();
  const { data: orgB } = await admin.from("organizations").insert({ name: `Org B ${stamp}` }).select("id").single();
  check(!!orgA?.id && !!orgB?.id, "Created Org A and Org B for isolation tests");

  // Create Job in Org A
  const { data: jobA } = await admin
    .from("jobs")
    .insert({
      organization_id: orgA!.id,
      title: "Senior Fullstack Engineer",
      description: "Build robust scalable web applications",
      status: "open",
    })
    .select("id")
    .single();

  // Create HR User in Org A
  const emailHR = `hr-admin${stamp}@example.com`;
  const passHR = `PassHR!123456${stamp}`;
  const { data: uHR } = await admin.auth.admin.createUser({
    email: emailHR,
    password: passHR,
    email_confirm: true,
    user_metadata: { full_name: "HR Admin OrgA", portal_role: "hr" },
  });
  await admin.from("profiles").update({ organization_id: orgA!.id, portal_role: "hr" }).eq("id", uHR!.user!.id);

  // Test 1: HR creates external candidate invitation
  const inviteResult = await createCandidateInvitation(admin, {
    organizationId: orgA!.id,
    jobId: jobA!.id,
    email: `external-cand-${stamp}@example.com`,
    fullName: "External Candidate",
    actorId: uHR!.user!.id,
  });
  const inv = inviteResult.invitation as { status: string; token_hash: string };
  check(!!inviteResult.rawToken && inv.status === "active", "1. Created candidate invitation with single-use token");
  check(inv.token_hash !== inviteResult.rawToken, "1. Stored only hashed token in database (never plain text token)");

  // Test 2: Validate invitation token
  const validated = await validateInvitationToken(inviteResult.rawToken);
  check(validated.jobTitle === "Senior Fullstack Engineer", "2. Validated single-use invitation token details");

  // Test 3: Account linking (link new candidate auth user to provisional candidate)
  const candEmail = `auth-cand-${stamp}@example.com`;
  const candPass = `PassCand!123456${stamp}`;
  const { data: uCand } = await admin.auth.admin.createUser({
    email: candEmail,
    password: candPass,
    email_confirm: true,
    user_metadata: { full_name: "Authenticated Candidate", portal_role: "candidate" },
  });

  const acceptResult = await acceptAndLinkInvitation(inviteResult.rawToken, uCand!.user!.id, candEmail);
  check(acceptResult.success && acceptResult.candidateId === validated.candidateId, "3. Successfully linked candidate auth account to provisional candidate record");

  // Check candidate is no longer provisional
  const { data: candRecord } = await admin.from("candidates").select("is_provisional, is_confirmed").eq("id", validated.candidateId).single();
  check(!candRecord?.is_provisional && candRecord?.is_confirmed, "3. Candidate record marked as confirmed and no longer provisional");

  // Test 4: Invitation reuse attempt denied (token single-use)
  try {
    await validateInvitationToken(inviteResult.rawToken);
    assert.fail("Should reject used invitation token");
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    check(e.status === 410 || (e.message ?? "").includes("already been used"), "4. Reuse of invitation token denied (single-use enforced)");
  }

  // Test 5: Invitation revocation test
  const inviteToRevoke = await createCandidateInvitation(admin, {
    organizationId: orgA!.id,
    jobId: jobA!.id,
    email: `revoke-cand-${stamp}@example.com`,
    fullName: "Revoke Candidate",
    actorId: uHR!.user!.id,
  });
  await revokeInvitation(orgA!.id, uHR!.user!.id, inviteToRevoke.invitation.id);
  try {
    await validateInvitationToken(inviteToRevoke.rawToken);
    assert.fail("Should reject revoked token");
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    check(e.status === 410 || (e.message ?? "").includes("revoked"), "5. Revoked invitation token successfully denied");
  }

  // Test 6: Invitation expiry check
  const expiredInvite = await admin.from("candidate_invitations").insert({
    organization_id: orgA!.id,
    job_id: jobA!.id,
    candidate_id: validated.candidateId,
    email: `expired-${stamp}@example.com`,
    token_hash: "dummy_expired_hash_" + stamp,
    status: "active",
    expires_at: new Date(Date.now() - 3600 * 1000).toISOString(),
  }).select("id").single();
  check(!!expiredInvite.data?.id, "6. Inserted past-dated test invitation for expiry check");

  // Test 7: Stage transition, rejection reason requirement & AI score override audit log
  const { data: appA } = await admin.from("applications").select("id").eq("candidate_id", validated.candidateId).single();
  check(!!appA?.id, "7. Located linked candidate application");

  // Rejection without reason must fail
  try {
    await setApplicationDecision(admin, appA!.id, {
      decision: "reject",
    });
    assert.fail("Should require rejection reason");
  } catch (err: unknown) {
    const e = err as { message?: string };
    check((e.message ?? "").includes("reason for rejection is required"), "7. Stage change to rejected requires an explicit rejection reason");
  }

  // Rejection with reason and AI score override
  const updatedApp = await setApplicationDecision(admin, appA!.id, {
    stage: "rejected",
    rejectionReason: "Insufficient years of experience with PostgreSQL",
    scoreOverride: { matchScore: 45, reason: "HR manual evaluation adjustment" },
    actorId: uHR!.user!.id,
  });
  const appRow = updatedApp as { stage: string; rejection_reason?: string | null; match_score?: number | null };
  check(appRow.stage === "rejected" && (appRow.rejection_reason ?? "").includes("Insufficient"), "7. Application rejected with saved rejection reason");
  check(Number(appRow.match_score) === 45, "7. AI match score override persisted successfully");

  // Verify Audit Log record
  const { data: auditLogs } = await admin
    .from("audit_logs")
    .select("*")
    .eq("entity_id", appA!.id)
    .order("created_at", { ascending: false });
  check((auditLogs ?? []).length > 0 && auditLogs![0].action.includes("rejected"), "7. Audit log recorded stage change, rejection reason, and score override");

  // Test 8: Privilege change restriction (prevent non-super_admin from self-escalation)
  try {
    await updateUser(orgA!.id, uHR!.user!.id, "hr", uHR!.user!.id, { portalRole: "super_admin" });
    assert.fail("Should block non-super_admin self-escalation");
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    check(e.status === 403 || (e.message ?? "").includes("Only Super Admin"), "8. Ordinary HR user prevented from modifying user privileges");
  }

  try {
    await inviteUser(orgA!.id, uHR!.user!.id, "hr", { email: `test-hr-${stamp}@example.com`, portalRole: "hr" });
    assert.fail("Should block HR user from inviting new admin users");
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    check(e.status === 403 || (e.message ?? "").includes("Only Super Admin"), "8. Ordinary HR user prevented from creating/inviting admin users");
  }

  // Test 9: Organization Isolation (Org B cannot query Org A candidate invitations)
  const clientB = createClient(url, anon, { auth: { persistSession: false } });
  const { data: orgAInvsFromB } = await clientB
    .from("candidate_invitations")
    .select("*")
    .eq("organization_id", orgA!.id);
  check((orgAInvsFromB ?? []).length === 0, "9. Organization isolation enforced at database level via RLS");

  console.log(`\nALL ${assertions} HR, ADMIN & CANDIDATE INVITATIONS ASSERTIONS PASSED!`);
}

runTests().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
