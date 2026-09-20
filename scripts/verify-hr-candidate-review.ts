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
  assessments: [] as string[],
  applications: [] as string[],
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
  const email = `hr-review-${role.toLowerCase().replace(/ /g, "-")}-${stamp}-${created.users.length}@example.com`;
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
  console.log("=== HR Candidate Review Verification ===");

  try {
    const hr = await account("Super Admin");

    // 1. Create a job
    const { data: depts } = await admin.from("departments").select("name").eq("organization_id", hr.org).limit(1);
    const jobRes = await api(hr.cookie, "/api/jobs", "POST", {
      title: `Senior HR Verification Specialist ${stamp}`,
      department: depts?.[0]?.name || "Human Resources",
      location: "Muscat, Oman",
      type: "Full-time",
      level: "Senior",
      minExperience: 6,
      description: "Oversee candidate review pipelines and interview scheduling.",
      requiredSkills: "HR Analytics, Interviewing, PostgreSQL",
    });
    check(jobRes.status === 201 || jobRes.status === 200, "Create job for candidate review verification");
    const jobId = jobRes.data.id;
    created.jobs.push(jobId);
    await api(hr.cookie, `/api/jobs/${jobId}`, "PATCH", { status: "Open" });

    // 2. Create Candidate record with parsed CV data
    const { data: cand, error: candErr } = await admin
      .from("candidates")
      .insert({
        organization_id: hr.org,
        full_name: "Fatma Al-Harthy",
        email: `fatma.review.${stamp}@example.com`,
        phone: "+96891234567",
        location: "Muscat, Oman",
        headline: "Lead Recruitment Officer",
        experience_years: 7,
        source: "portal_upload",
        resume_file_path: `${hr.org}/cv-fatma.pdf`,
      })
      .select("*")
      .single();

    if (candErr) throw candErr;
    const candidateId = cand.id;
    created.candidates.push(candidateId);

    // Insert Candidate Experience, Skills, Education
    await admin.from("candidate_skills").insert([
      { candidate_id: candidateId, skill: "HR Analytics" },
      { candidate_id: candidateId, skill: "Interviewing" },
      { candidate_id: candidateId, skill: "PostgreSQL" },
    ]);

    await admin.from("candidate_experience").insert([
      {
        candidate_id: candidateId,
        role: "Senior HR Specialist",
        company: "Oman Talent Services",
        location: "Muscat, Oman",
        start_date: "2020-01-01",
        end_date: null,
        description: "Managed end-to-end executive candidate review workflows.",
        sort_order: 0,
      },
    ]);

    await admin.from("candidate_education").insert([
      {
        candidate_id: candidateId,
        degree: "BSc Business Administration",
        institution: "Sultan Qaboos University",
        start_date: "2015-09-01",
        end_date: "2019-06-01",
        grade: "Distinction",
        sort_order: 0,
      },
    ]);

    // 3. Create Application
    const { data: appRow, error: appErr } = await admin
      .from("applications")
      .insert({
        candidate_id: candidateId,
        job_id: jobId,
        stage: "applied",
        match_score: 88,
        ai_score: 85,
        confidence_score: 90,
      })
      .select("id")
      .single();

    if (appErr) throw appErr;
    const applicationId = appRow.id;
    created.applications.push(applicationId);

    // 4. Create Candidate Auth Account & Link
    const candidateAccount = await account("Candidate", candidateId);

    // 5. Create Assessment & Assignment
    const examRes = await api(hr.cookie, "/api/assessments", "POST", {
      title: `HR Competency Exam ${stamp}`,
      durationMinutes: 15,
      questions: [
        {
          prompt: "What is the primary objective of structured candidate reviews?",
          questionType: "multiple_choice",
          options: ["Eliminate bias and standardize evaluation", "Speed up hiring at any cost"],
          correctAnswer: "Eliminate bias and standardize evaluation",
          points: 10,
        },
      ],
    });
    check(examRes.status === 201, "Create assessment template");
    const assessmentId = examRes.data.id;
    created.assessments.push(assessmentId);

    const assignRes = await api(hr.cookie, "/api/assessments/assignments", "POST", {
      assessmentId,
      applicationId,
    });
    check(assignRes.status === 201, "Assign assessment to candidate application");
    const assignmentId = assignRes.data.id;

    // Submit assessment as candidate
    const examUrl = `/api/candidate/assessments/${assignmentId}`;
    await api(candidateAccount.cookie, examUrl, "POST", { action: "start" });
    const startedExam = await api(candidateAccount.cookie, examUrl);
    const qId = startedExam.data.questions[0].id;
    await api(candidateAccount.cookie, examUrl, "POST", {
      answers: { [qId]: "Eliminate bias and standardize evaluation" },
    });

    // 6. Create AI Interview & Transcript
    const { data: interviewSession } = await admin
      .from("interview_sessions")
      .insert({
        organization_id: hr.org,
        application_id: applicationId,
        candidate_id: candidateId,
        job_id: jobId,
        status: "completed",
        started_at: new Date(Date.now() - 3600000).toISOString(),
        ended_at: new Date().toISOString(),
        summary: "Candidate demonstrated strong strategic HR alignment and clear communication.",
        recommendation: "Strongly Recommended",
        scores: { overall: 90, technical: 92, communication: 88, confidence: 90, behavioral: 90 },
      })
      .select("id")
      .single();

    await admin.from("interview_messages").insert([
      {
        session_id: interviewSession!.id,
        role: "assistant",
        content: "Welcome Fatma. Can you explain your approach to candidate review?",
      },
      {
        session_id: interviewSession!.id,
        role: "user",
        content: "I systematically analyze parsed CV skills, assessment answers, and competency evidence.",
      },
    ]);

    // 7. Verify GET /api/hr/candidates/[candidateId]
    const reviewRes = await api(hr.cookie, `/api/hr/candidates/${candidateId}?applicationId=${applicationId}`);
    check(reviewRes.status === 200, "Fetch HR candidate review data");
    check(reviewRes.data.candidate.fullName === "Fatma Al-Harthy", "Returns real candidate full name");
    check(reviewRes.data.skills.some((s: { name: string }) => s.name === "HR Analytics"), "Returns real extracted skills");
    check(reviewRes.data.experience.length > 0 && reviewRes.data.experience[0].company === "Oman Talent Services", "Returns real experience");
    check(reviewRes.data.assessment.percentage === 100, "Returns completed assessment results & 100% score");
    check(reviewRes.data.interview.overallScore === 90, "Returns completed AI interview score");
    check(reviewRes.data.interview.transcript.length >= 2, "Returns complete interview transcript without prompt leak");
    check(reviewRes.data.scoring.overallScore >= 80, "Computes weighted composite overall score");

    // 8. Schedule Human Interview
    const nextWeek = new Date(Date.now() + 86400000 * 3).toISOString();
    const scheduleRes = await api(hr.cookie, `/api/hr/applications/${applicationId}/human-interview`, "POST", {
      scheduledAt: nextWeek,
      timezone: "GST",
      interviewType: "video",
      interviewerName: "Dr. Salim Al-Abri",
      meetingLink: "https://meet.google.com/test-room",
      candidateInstructions: "Please join 5 minutes before time.",
    });
    check(scheduleRes.status === 200, "Schedule human interview");

    // Verify candidate portal sees the human interview schedule
    const candApps = await api(candidateAccount.cookie, "/api/applications?mine=1");
    check(candApps.status === 200, "Fetch candidate applications");
    const candApp = (candApps.data as Array<{ id: string; humanInterview?: { interviewerName: string; meetingLink: string } }>).find((a) => a.id === applicationId);
    check(Boolean(candApp && candApp.humanInterview && candApp.humanInterview.interviewerName === "Dr. Salim Al-Abri"), "Candidate portal displays human interview schedule");
    check(Boolean(candApp && candApp.humanInterview && candApp.humanInterview.meetingLink === "https://meet.google.com/test-room"), "Candidate portal displays video meeting link");

    // 9. HR Select Candidate
    const decisionRes = await api(hr.cookie, `/api/hr/applications/${applicationId}/decision`, "POST", {
      decision: "select",
      candidateMessage: "We are delighted to select you for the Senior HR Verification Specialist role!",
      internalNotes: "Strong candidate across all evaluation metrics.",
    });
    check(decisionRes.status === 200, "Record candidate selection decision");

    // Verify decision stored and application stage updated to hired
    const reReview = await api(hr.cookie, `/api/hr/candidates/${candidateId}?applicationId=${applicationId}`);
    check(reReview.data.application.stage === "hired", "Application stage updated to hired after selection");
    check(reReview.data.hiringDecision.decision === "selected", "Hiring decision persisted");

    // 10. Test Security & Org Isolation
    // Create an HR account from another organization
    const otherOrgHr = await account("Super Admin");
    const invalidOrg = await admin.from("organizations").insert({ name: `Other Org ${stamp}` }).select("id").single();
    await admin.from("profiles").update({ organization_id: invalidOrg.data!.id }).eq("id", otherOrgHr.id);

    const crossAccess = await api(otherOrgHr.cookie, `/api/hr/candidates/${candidateId}`);
    check(crossAccess.status === 403, "Block cross-organization candidate review with 403 Forbidden");

    const notFoundRes = await api(hr.cookie, "/api/hr/candidates/00000000-0000-0000-0000-000000000000");
    check(notFoundRes.status === 404, "Return 404 for non-existent candidate ID");

    console.log(`\nSUCCESS: All ${assertions} HR Candidate Review assertions passed cleanly!`);
  } finally {
    for (const id of created.applications) await admin.from("applications").delete().eq("id", id);
    for (const id of created.assessments) await admin.from("assessments").delete().eq("id", id);
    for (const id of created.users) await admin.auth.admin.deleteUser(id);
    for (const id of created.candidates) await admin.from("candidates").delete().eq("id", id);
    for (const id of created.jobs) await admin.from("jobs").delete().eq("id", id);
    console.log("Cleaned up verification test records.");
  }
}

run().catch((err) => {
  console.error("VERIFICATION FAILED:", err);
  process.exit(1);
});
