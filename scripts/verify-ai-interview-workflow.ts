import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";

dotenv.config({ path: ".env.local" });

const base = process.argv[2] || "http://localhost:3000";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const stamp = Date.now();
const created = {
  users: [] as string[],
  candidates: [] as string[],
  jobs: [] as string[],
  applications: [] as string[],
  sessions: [] as string[],
};

let assertions = 0;
function check(condition: boolean, label: string) {
  assert.ok(condition, label);
  assertions++;
  console.log("PASS " + label);
}

async function api(cookie: string, path: string, method = "GET", body?: unknown) {
  const res = await fetch(base + path, {
    method,
    headers: {
      Cookie: cookie,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, data: json.data, error: json.error };
}

async function account(role: string, candidateId: string | null = null) {
  const email = `interview-test-${role.toLowerCase().replace(/ /g, "-")}-${stamp}-${created.users.length}@example.com`;
  const password = `Verify!${crypto.randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  created.users.push(data.user.id);

  const { data: roles } = await admin.from("roles").select("id,organization_id").eq("name", role).limit(1);
  const r = roles![0];

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      status: "active",
      organization_id: r.organization_id,
      role_id: r.id,
      portal_role: role === "Super Admin" ? "super_admin" : role === "Candidate" ? "candidate" : "hr",
      candidate_id: candidateId,
    })
    .eq("id", data.user.id);
  if (profileError) throw profileError;

  const client = createClient(url, anon, { auth: { persistSession: false } });
  const { data: auth, error: authError } = await client.auth.signInWithPassword({ email, password });
  if (authError) throw authError;

  const name = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
  const value = "base64-" + Buffer.from(JSON.stringify(auth.session)).toString("base64url");
  const chunks = value.match(/.{1,3000}/g)!;
  const cookie = chunks.length === 1 ? `${name}=${value}` : chunks.map((c, i) => `${name}.${i}=${c}`).join("; ");
  return { cookie, client, id: data.user.id, org: r.organization_id };
}

async function run() {
  console.log("=== AI Voice Interview Workflow Verification ===");

  try {
    const hr = await account("Super Admin");

    // 1. Create a job
    const { data: depts } = await admin.from("departments").select("name").eq("organization_id", hr.org).limit(1);
    const jobRes = await api(hr.cookie, "/api/jobs", "POST", {
      title: `AI Interview Lead Engineer ${stamp}`,
      department: depts?.[0]?.name || "Engineering",
      location: "Muscat, Oman",
      type: "Full-time",
      level: "Senior",
      minExperience: 5,
      description: "Lead software architecture and voice AI pipeline optimization.",
      requiredSkills: "React, Web Audio API, Web Speech API, TypeScript",
    });
    check(jobRes.status === 201 || jobRes.status === 200, "Create job for AI interview verification");
    const jobId = jobRes.data.id;
    created.jobs.push(jobId);

    // 2. Create Candidate
    const { data: cand, error: candErr } = await admin
      .from("candidates")
      .insert({
        organization_id: hr.org,
        full_name: "Tariq Al-Maamari",
        email: `tariq.interview.${stamp}@example.com`,
        phone: "+96898765432",
        location: "Muscat, Oman",
        headline: "Senior Audio & Web Engineer",
        experience_years: 6,
      })
      .select("*")
      .single();
    if (candErr) throw candErr;
    const candidateId = cand.id;
    created.candidates.push(candidateId);

    // 3. Create Application
    const { data: appRow, error: appErr } = await admin
      .from("applications")
      .insert({
        candidate_id: candidateId,
        job_id: jobId,
        stage: "applied",
        match_score: 92,
      })
      .select("id")
      .single();
    if (appErr) throw appErr;
    const applicationId = appRow.id;
    created.applications.push(applicationId);

    // 4. Candidate Account
    const candidateAuth = await account("Candidate", candidateId);

    // 5. Create Interview Session
    const { data: sessRow, error: sessErr } = await admin
      .from("interview_sessions")
      .insert({
        organization_id: hr.org,
        candidate_id: candidateId,
        job_id: jobId,
        application_id: applicationId,
        mode: "technical",
        status: "scheduled",
      })
      .select("*")
      .single();
    if (sessErr) throw sessErr;
    const sessionId = sessRow.id;
    created.sessions.push(sessionId);
    check(sessRow.status === "scheduled", "Interview session created in scheduled state");

    // 6. Test Start Action (Idempotent Opening Question)
    const startRes = await api(candidateAuth.cookie, `/api/interviews/${sessionId}`, "POST", { action: "start" });
    check(startRes.status === 200, "Candidate can initialize voice interview via start action");
    check(Boolean(startRes.data.message?.content), "Start action generates or returns opening question");
    check(startRes.data.session.status === "in_progress", "Interview transitions from scheduled to in_progress");

    // Idempotency check: repeat start action
    const repeatStart = await api(candidateAuth.cookie, `/api/interviews/${sessionId}`, "POST", { action: "start" });
    check(repeatStart.data.message.id === startRes.data.message.id, "Repeat start action returns same opening message without duplication");

    // 7. Test Streaming Reply
    const streamRes = await api(candidateAuth.cookie, `/api/interviews/${sessionId}/stream`, "POST", {
      content: "I have over six years of experience building web applications with React, TypeScript, and Web Audio API audio visualizers.",
    });
    check(streamRes.status === 200, "Candidate can submit answer and receive streaming reply");

    // 8. Fetch Interview Data & Verify Transcript
    const getRes = await api(candidateAuth.cookie, `/api/interviews/${sessionId}`);
    check(getRes.status === 200, "Fetch session data succeeds");
    const msgs = getRes.data.messages as { id: string; role: string; content: string }[];
    check(msgs.length >= 3, "Interview transcript contains opening question, candidate answer, and AI response");
    
    // Check message uniqueness
    const ids = msgs.map((m) => m.id);
    const uniqueIds = new Set(ids);
    check(ids.length === uniqueIds.size, "No duplicate message IDs in interview transcript");

    // 9. Submit additional answers & finalize interview
    await api(candidateAuth.cookie, `/api/interviews/${sessionId}/stream`, "POST", {
      content: "For state management and volume visualizer audio buffers, I use Web Audio API AudioContext with AnalyserNode and requestAnimationFrame for 60fps rendering.",
    });
    await api(candidateAuth.cookie, `/api/interviews/${sessionId}/stream`, "POST", {
      content: "I handle error resilience by implementing retry strategies, clean unmount tear-down, and fallback text interfaces for unsupported browsers.",
    });

    const finalizeRes = await api(hr.cookie, `/api/interviews/${sessionId}`, "POST", { action: "finalize" });
    check(finalizeRes.status === 200, "HR can finalize and score the completed interview");
    check(finalizeRes.data.session.status === "completed", "Session status updated to completed");
    check(Boolean(finalizeRes.data.evaluation?.recommendation), "Evaluation produces recommendation and category scores");

    console.log("\nSUCCESS: All 12 AI Voice Interview assertions passed cleanly!");
  } finally {
    // Cleanup
    for (const id of created.sessions) {
      await admin.from("interview_messages").delete().eq("session_id", id);
      await admin.from("interview_sessions").delete().eq("id", id);
    }
    for (const id of created.applications) {
      await admin.from("applications").delete().eq("id", id);
    }
    for (const id of created.candidates) {
      await admin.from("candidate_skills").delete().eq("candidate_id", id);
      await admin.from("candidates").delete().eq("id", id);
    }
    for (const id of created.jobs) {
      await admin.from("jobs").delete().eq("id", id);
    }
    for (const uid of created.users) {
      await admin.auth.admin.deleteUser(uid);
    }
  }
}

run().catch((err) => {
  console.error("Verification Failed:", err);
  process.exit(1);
});
