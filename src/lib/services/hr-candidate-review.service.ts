import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { ApiError } from "@/lib/api/helpers";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type Client = SupabaseClient<Database>;

export interface HrCandidateReviewData {
  candidate: {
    id: string;
    profileId: string | null;
    userId: string | null;
    fullName: string;
    email: string;
    phone: string | null;
    location: string | null;
    nationality: string | null;
    headline: string | null;
    summary: string | null;
    currentRole: string | null;
    experienceYears: number;
    avatarColor: string;
  };
  resume: {
    id: string | null;
    fileName: string | null;
    fileUrl: string | null;
    signedUrl: string | null;
    uploadedAt: string | null;
    parsingStatus: "not_uploaded" | "parsed" | "pending";
  };
  skills: Array<{
    id: string;
    name: string;
    category?: string;
    proficiency?: string;
    yearsOfExperience?: number;
    source?: string;
  }>;
  experience: Array<{
    id: string;
    jobTitle: string;
    company: string;
    location: string | null;
    startDate: string | null;
    endDate: string | null;
    isCurrent: boolean;
    duration: string;
    description: string | null;
    responsibilities: string[];
  }>;
  education: Array<{
    id: string;
    degree: string;
    institution: string;
    startDate: string | null;
    endDate: string | null;
    grade: string | null;
  }>;
  certifications: Array<{
    id: string;
    name: string;
    issuer: string | null;
    year: string | null;
  }>;
  languages: Array<{
    id: string;
    name: string;
    level: string;
  }>;
  applicationsList: Array<{
    id: string;
    jobId: string;
    jobTitle: string;
    department: string | null;
    stage: string;
    appliedAt: string;
  }>;
  application: {
    id: string;
    jobId: string;
    jobTitle: string;
    department: string | null;
    location: string | null;
    status: string;
    stage: string;
    appliedAt: string;
    matchScore: number | null;
    aiScore: number | null;
    confidenceScore: number | null;
    matchExplanation: string | null;
    strengths: string[];
    weaknesses: string[];
    aiRecommendation: string | null;
  } | null;
  assessment: {
    id: string;
    assignmentId: string;
    title: string;
    status: string;
    startedAt: string | null;
    submittedAt: string | null;
    totalQuestions: number;
    answeredQuestions: number;
    earnedPoints: number;
    totalPoints: number;
    percentage: number | null;
    passed: boolean | null;
    aiSummary: string | null;
    questions: Array<{
      id: string;
      prompt: string;
      questionType: string;
      candidateAnswer: string | null;
      correctAnswer: string | null;
      points: number;
      earnedPoints: number | null;
      feedback: string | null;
      isCorrect: boolean | null;
    }>;
  } | null;
  interview: {
    id: string;
    status: string;
    startedAt: string | null;
    endedAt: string | null;
    durationMinutes: number | null;
    overallScore: number | null;
    technicalScore: number | null;
    communicationScore: number | null;
    confidenceScore: number | null;
    behavioralScore: number | null;
    strengths: string[];
    weaknesses: string[];
    summary: string | null;
    recommendation: string | null;
    transcript: Array<{
      id: string;
      role: "assistant" | "user" | "system";
      content: string;
      timestamp: string;
    }>;
  } | null;
  scoring: {
    cvScore: number | null;
    matchScore: number | null;
    skillsScore: number | null;
    experienceScore: number | null;
    assessmentScore: number | null;
    interviewScore: number | null;
    technicalScore: number | null;
    communicationScore: number | null;
    confidenceScore: number | null;
    overallScore: number | null;
    recommendation: string;
    explanation: string;
    isComplete: boolean;
    stageStatuses: {
      cv: "completed" | "pending";
      match: "completed" | "pending";
      assessment: "completed" | "in_progress" | "pending";
      interview: "completed" | "in_progress" | "pending";
    };
  };
  hiringDecision: {
    id: string;
    decision: string;
    decidedAt: string;
    decidedBy: string | null;
    candidateMessage: string | null;
    internalNotes: string | null;
  } | null;
  humanInterview: {
    id: string;
    status: string;
    scheduledAt: string;
    timezone: string;
    interviewType: string;
    meetingLink: string | null;
    location: string | null;
    interviewerName: string;
    interviewerEmail: string | null;
    candidateInstructions: string | null;
    internalNotes: string | null;
  } | null;
  timeline: Array<{
    id: string;
    title: string;
    date: string;
    description: string;
    type: string;
  }>;
}

function calculateDuration(start: string | null, end: string | null): string {
  if (!start) return "";
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
  if (months <= 0) return "1 mo";
  const yrs = Math.floor(months / 12);
  const remMonths = months % 12;
  let res = "";
  if (yrs > 0) res += `${yrs} yr${yrs > 1 ? "s" : ""}`;
  if (remMonths > 0) res += `${yrs > 0 ? " " : ""}${remMonths} mo${remMonths > 1 ? "s" : ""}`;
  return res || "1 mo";
}

export async function getHrCandidateReviewData(
  supabase: Client,
  candidateId: string,
  targetApplicationId?: string | null,
  userOrgId?: string | null
): Promise<HrCandidateReviewData> {
  const admin = createAdminSupabaseClient();

  // 1. Fetch Candidate core info & profile link
  const { data: cand, error: candErr } = await admin
    .from("candidates")
    .select("*")
    .eq("id", candidateId)
    .single();

  if (candErr || !cand) {
    throw new ApiError(404, "Candidate not found");
  }

  if (userOrgId && cand.organization_id !== userOrgId) {
    throw new ApiError(403, "Access denied: Candidate belongs to another organization");
  }

  // Fetch linked profile / user if available
  const { data: linkedProfile } = await admin
    .from("profiles")
    .select("id, candidate_id")
    .eq("candidate_id", candidateId)
    .maybeSingle();

  // 2. Fetch candidate details (experience, education, certs, languages, skills)
  const [
    { data: expList },
    { data: eduList },
    { data: certList },
    { data: langList },
    { data: skillList },
    { data: appList },
  ] = await Promise.all([
    admin.from("candidate_experience").select("*").eq("candidate_id", candidateId).order("sort_order", { ascending: true }),
    admin.from("candidate_education").select("*").eq("candidate_id", candidateId).order("sort_order", { ascending: true }),
    admin.from("candidate_certifications").select("*").eq("candidate_id", candidateId),
    admin.from("candidate_languages").select("*").eq("candidate_id", candidateId),
    admin.from("candidate_skills").select("*").eq("candidate_id", candidateId),
    admin.from("applications")
      .select("*, jobs ( id, title, location, status, departments ( name ), required_skills, min_experience_years )")
      .eq("candidate_id", candidateId)
      .order("applied_date", { ascending: false }),
  ]);

  // Map Applications List for selector
  const mappedAppsList = (appList ?? []).map((a) => {
    const job = Array.isArray(a.jobs) ? a.jobs[0] : a.jobs;
    const dept = job && (Array.isArray(job.departments) ? job.departments[0] : job.departments);
    return {
      id: a.id,
      jobId: a.job_id,
      jobTitle: job?.title ?? "Role",
      department: dept?.name ?? null,
      stage: a.stage,
      appliedAt: a.applied_date || a.created_at.slice(0, 10),
    };
  });

  // Selected application: either specified by targetApplicationId or latest application
  const rawSelectedApp = targetApplicationId
    ? (appList ?? []).find((a) => a.id === targetApplicationId)
    : (appList ?? [])[0];

  let selectedApp = null;
  if (rawSelectedApp) {
    const job = Array.isArray(rawSelectedApp.jobs) ? rawSelectedApp.jobs[0] : rawSelectedApp.jobs;
    const dept = job && (Array.isArray(job.departments) ? job.departments[0] : job.departments);
    selectedApp = {
      id: rawSelectedApp.id,
      jobId: rawSelectedApp.job_id,
      jobTitle: job?.title ?? "Role",
      department: dept?.name ?? null,
      location: job?.location ?? null,
      status: job?.status ?? "open",
      stage: rawSelectedApp.stage,
      appliedAt: rawSelectedApp.applied_date || rawSelectedApp.created_at.slice(0, 10),
      matchScore: rawSelectedApp.match_score ? Math.round(Number(rawSelectedApp.match_score)) : null,
      aiScore: rawSelectedApp.ai_score ? Math.round(Number(rawSelectedApp.ai_score)) : null,
      confidenceScore: rawSelectedApp.confidence_score ? Math.round(Number(rawSelectedApp.confidence_score)) : null,
      matchExplanation: (rawSelectedApp as unknown as { match_reasoning?: string }).match_reasoning ?? null,
      strengths: rawSelectedApp.strengths ?? [],
      weaknesses: rawSelectedApp.weaknesses ?? [],
      aiRecommendation: rawSelectedApp.ai_recommendation ?? null,
    };
  }

  // 3. Resume & Signed URL
  let signedUrl: string | null = null;
  if (cand.resume_file_path) {
    try {
      const { data: signed } = await admin.storage
        .from("resumes")
        .createSignedUrl(cand.resume_file_path, 3600);
      signedUrl = signed?.signedUrl ?? null;
    } catch {
      signedUrl = null;
    }
  }

  const resume = {
    id: cand.id,
    fileName: cand.resume_file_path ? cand.resume_file_path.split("/").pop() ?? "CV.pdf" : null,
    fileUrl: cand.resume_url ?? null,
    signedUrl,
    uploadedAt: cand.created_at.slice(0, 10),
    parsingStatus: cand.resume_file_path ? ("parsed" as const) : ("not_uploaded" as const),
  };

  // 4. Skills, Experience, Education, Certifications, Languages
  const skills = (skillList ?? []).map((s) => ({
    id: s.id,
    name: s.skill,
    source: "extracted",
  }));

  const sortedExp = [...(expList ?? [])].sort((a, b) => {
    if (!a.start_date) return 1;
    if (!b.start_date) return -1;
    return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
  });

  const experience = sortedExp.map((e) => ({
    id: e.id,
    jobTitle: e.role,
    company: e.company,
    location: e.location ?? null,
    startDate: e.start_date ?? null,
    endDate: e.end_date ?? null,
    isCurrent: !e.end_date,
    duration: calculateDuration(e.start_date, e.end_date),
    description: e.description ?? null,
    responsibilities: e.description ? [e.description] : [],
  }));

  const latestRole = experience.find((e) => e.isCurrent)?.jobTitle || experience[0]?.jobTitle || cand.headline;

  const education = (eduList ?? []).map((ed) => ({
    id: ed.id,
    degree: ed.degree,
    institution: ed.institution,
    startDate: ed.start_date ?? null,
    endDate: ed.end_date ?? null,
    grade: ed.grade ?? null,
  }));

  const certifications = (certList ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    issuer: c.issuer ?? null,
    year: c.year ?? null,
  }));

  const languages = (langList ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    level: l.level,
  }));

  // 5. Assessment details (if selected application exists)
  let assessment: HrCandidateReviewData["assessment"] = null;
  if (selectedApp) {
    const { data: assignmentRow } = await admin
      .from("assessment_assignments")
      .select("*, assessments ( id, title, description, question_count )")
      .eq("application_id", selectedApp.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (assignmentRow) {
      const parentAssessment = Array.isArray(assignmentRow.assessments)
        ? assignmentRow.assessments[0]
        : assignmentRow.assessments;

      const { data: qList } = await admin
        .from("assessment_questions")
        .select("id, prompt, question_type, options, correct_answer, points, sort_order")
        .eq("assessment_id", assignmentRow.assessment_id)
        .order("sort_order", { ascending: true });

      const candidateAnswers = (assignmentRow.answers as Record<string, string>) || {};
      const gradingDetails = (assignmentRow.grading_details as Record<
        string,
        { earned: number; max: number; correct: boolean; feedback?: string }
      >) || {};

      let totalPoints = 0;
      let earnedPoints = 0;
      let answeredCount = 0;

      const mappedQuestions = (qList ?? []).map((q) => {
        const candidateAns = candidateAnswers[q.id] || null;
        if (candidateAns && candidateAns.trim()) answeredCount++;
        const gradeInfo = gradingDetails[q.id];
        const qPoints = q.points || 10;
        totalPoints += qPoints;
        const qEarned = gradeInfo?.earned ?? 0;
        earnedPoints += qEarned;

        return {
          id: q.id,
          prompt: q.prompt,
          questionType: q.question_type,
          candidateAnswer: candidateAns,
          correctAnswer: q.correct_answer || null,
          points: qPoints,
          earnedPoints: gradeInfo ? gradeInfo.earned : null,
          feedback: gradeInfo?.feedback ?? null,
          isCorrect: gradeInfo ? gradeInfo.correct : null,
        };
      });

      const percentage = assignmentRow.score !== null ? Number(assignmentRow.score) : totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : null;
      const passed = percentage !== null ? percentage >= 70 : null;

      assessment = {
        id: assignmentRow.assessment_id,
        assignmentId: assignmentRow.id,
        title: parentAssessment?.title ?? "Assessment",
        status: assignmentRow.status,
        startedAt: assignmentRow.started_at,
        submittedAt: assignmentRow.completed_at,
        totalQuestions: qList?.length ?? 0,
        answeredQuestions: answeredCount,
        earnedPoints: Math.round(earnedPoints * 10) / 10,
        totalPoints,
        percentage,
        passed,
        aiSummary: assignmentRow.status === "completed" ? `Scored ${percentage}% on assessment.` : "Evaluation pending.",
        questions: mappedQuestions,
      };
    }
  }

  // 6. AI Interview details (if selected application exists)
  let interview: HrCandidateReviewData["interview"] = null;
  if (selectedApp) {
    const { data: sessionRow } = await admin
      .from("interview_sessions")
      .select("*")
      .eq("application_id", selectedApp.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionRow) {
      const { data: msgs } = await admin
        .from("interview_messages")
        .select("id, role, content, created_at")
        .eq("session_id", sessionRow.id)
        .order("created_at", { ascending: true });

      const scores = (sessionRow.scores as Record<string, number>) || {};
      const duration = sessionRow.started_at && sessionRow.ended_at
        ? Math.max(1, Math.round((new Date(sessionRow.ended_at).getTime() - new Date(sessionRow.started_at).getTime()) / 60000))
        : null;

      const transcript = (msgs ?? [])
        .filter((m) => m.role === "assistant" || m.role === "user")
        .map((m) => ({
          id: m.id,
          role: m.role as "assistant" | "user",
          content: m.content,
          timestamp: m.created_at,
        }));

      interview = {
        id: sessionRow.id,
        status: sessionRow.status,
        startedAt: sessionRow.started_at,
        endedAt: sessionRow.ended_at,
        durationMinutes: duration,
        overallScore: scores.overall ? Math.round(scores.overall) : null,
        technicalScore: scores.technical ? Math.round(scores.technical) : null,
        communicationScore: scores.communication ? Math.round(scores.communication) : null,
        confidenceScore: scores.confidence ? Math.round(scores.confidence) : null,
        behavioralScore: scores.behavioral ? Math.round(scores.behavioral) : null,
        strengths: sessionRow.summary ? [sessionRow.summary] : [],
        weaknesses: [],
        summary: sessionRow.summary ?? null,
        recommendation: sessionRow.recommendation ?? null,
        transcript,
      };
    }
  }

  // 7. Hiring decision & Human interview
  let hiringDecision: HrCandidateReviewData["hiringDecision"] = null;
  let humanInterview: HrCandidateReviewData["humanInterview"] = null;

  if (selectedApp) {
    const [{ data: decRow }, { data: hIntRow }] = await Promise.all([
      admin.from("hiring_decisions").select("*").eq("application_id", selectedApp.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("human_interviews").select("*").eq("application_id", selectedApp.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    if (decRow) {
      hiringDecision = {
        id: decRow.id,
        decision: decRow.decision,
        decidedAt: decRow.decided_at,
        decidedBy: decRow.decided_by,
        candidateMessage: decRow.candidate_message ?? null,
        internalNotes: decRow.internal_notes ?? null,
      };
    }

    if (hIntRow) {
      humanInterview = {
        id: hIntRow.id,
        status: hIntRow.status,
        scheduledAt: hIntRow.scheduled_at,
        timezone: hIntRow.timezone,
        interviewType: hIntRow.interview_type,
        meetingLink: hIntRow.meeting_link ?? null,
        location: hIntRow.location ?? null,
        interviewerName: hIntRow.interviewer_name,
        interviewerEmail: hIntRow.interviewer_email ?? null,
        candidateInstructions: hIntRow.candidate_instructions ?? null,
        internalNotes: hIntRow.internal_notes ?? null,
      };
    }
  }

  // 8. Weighted Scoring Calculation
  const matchScore = selectedApp?.matchScore ?? null;
  const cvScore = matchScore !== null ? Math.min(100, Math.max(0, matchScore + 5)) : null;
  const skillsScore = matchScore;
  const experienceScore = cand.experience_years ? Math.min(100, Math.round((Number(cand.experience_years) / 5) * 100)) : null;
  const assessmentScore = assessment?.percentage ?? null;
  const interviewScore = interview?.overallScore ?? null;
  const technicalScore = interview?.technicalScore ?? assessmentScore;
  const communicationScore = interview?.communicationScore ?? null;
  const confidenceScore = interview?.confidenceScore ?? null;

  // Weightings: Match/CV 25%, Skills/Exp 20%, Assessment 30%, AI Interview 25%
  let totalWeight = 0;
  let weightedSum = 0;

  if (matchScore !== null) {
    weightedSum += matchScore * 0.25;
    totalWeight += 0.25;
  }
  if (experienceScore !== null) {
    weightedSum += experienceScore * 0.20;
    totalWeight += 0.20;
  }
  if (assessmentScore !== null) {
    weightedSum += assessmentScore * 0.30;
    totalWeight += 0.30;
  }
  if (interviewScore !== null) {
    weightedSum += interviewScore * 0.25;
    totalWeight += 0.25;
  }

  const isComplete = assessment?.status === "completed" && interview?.status === "completed";
  const overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null;

  let recommendation = "Pending Evaluation";
  if (overallScore !== null) {
    if (overallScore >= 85) recommendation = "Strongly Recommended";
    else if (overallScore >= 70) recommendation = "Recommended";
    else if (overallScore >= 55) recommendation = "Consider";
    else recommendation = "Not Recommended";
  }

  let explanation = "Weighted composite of CV match (25%), experience (20%), assessment (30%), and AI interview (25%).";
  if (!isComplete) {
    explanation += " Note: Some recruitment stages remain pending.";
  }

  const scoring: HrCandidateReviewData["scoring"] = {
    cvScore,
    matchScore,
    skillsScore,
    experienceScore,
    assessmentScore,
    interviewScore,
    technicalScore,
    communicationScore,
    confidenceScore,
    overallScore,
    recommendation,
    explanation,
    isComplete,
    stageStatuses: {
      cv: cand.resume_file_path ? "completed" : "pending",
      match: matchScore !== null ? "completed" : "pending",
      assessment: assessment?.status === "completed" ? "completed" : assessment?.status === "in_progress" ? "in_progress" : "pending",
      interview: interview?.status === "completed" ? "completed" : interview?.status === "in_progress" ? "in_progress" : "pending",
    },
  };

  // 9. Timeline construction
  const timeline: HrCandidateReviewData["timeline"] = [];

  if (cand.created_at) {
    timeline.push({
      id: "t-cand-created",
      title: "Candidate record created",
      date: cand.created_at.slice(0, 10),
      description: `Source: ${cand.source || "System"}`,
      type: "candidate",
    });
  }

  if (cand.resume_file_path) {
    timeline.push({
      id: "t-cv-parsed",
      title: "CV Uploaded & Parsed",
      date: cand.created_at.slice(0, 10),
      description: cand.resume_file_path.split("/").pop() ?? "CV.pdf",
      type: "cv",
    });
  }

  if (selectedApp) {
    timeline.push({
      id: "t-app-submitted",
      title: `Applied for ${selectedApp.jobTitle}`,
      date: selectedApp.appliedAt,
      description: `Stage: ${selectedApp.stage}`,
      type: "application",
    });

    if (selectedApp.matchScore !== null) {
      timeline.push({
        id: "t-match-generated",
        title: "AI Match Score Generated",
        date: selectedApp.appliedAt,
        description: `Match Score: ${selectedApp.matchScore}%`,
        type: "match",
      });
    }

    if (assessment) {
      if (assessment.startedAt) {
        timeline.push({
          id: "t-assess-started",
          title: "Assessment Started",
          date: assessment.startedAt.slice(0, 10),
          description: assessment.title,
          type: "assessment",
        });
      }
      if (assessment.submittedAt) {
        timeline.push({
          id: "t-assess-submitted",
          title: "Assessment Submitted",
          date: assessment.submittedAt.slice(0, 10),
          description: `Score: ${assessment.percentage ?? 0}%`,
          type: "assessment",
        });
      }
    }

    if (interview) {
      if (interview.startedAt) {
        timeline.push({
          id: "t-interview-started",
          title: "AI Interview Started",
          date: interview.startedAt.slice(0, 10),
          description: "Candidate initiated AI conversation.",
          type: "interview",
        });
      }
      if (interview.endedAt) {
        timeline.push({
          id: "t-interview-completed",
          title: "AI Interview Evaluated",
          date: interview.endedAt.slice(0, 10),
          description: `Score: ${interview.overallScore ?? "N/A"}%`,
          type: "interview",
        });
      }
    }

    if (humanInterview) {
      timeline.push({
        id: "t-human-scheduled",
        title: "Human Interview Scheduled",
        date: humanInterview.scheduledAt.slice(0, 10),
        description: `Interviewer: ${humanInterview.interviewerName} (${humanInterview.interviewType})`,
        type: "human_interview",
      });
    }

    if (hiringDecision) {
      timeline.push({
        id: "t-decision-made",
        title: `Hiring Decision: ${hiringDecision.decision.toUpperCase()}`,
        date: hiringDecision.decidedAt.slice(0, 10),
        description: hiringDecision.candidateMessage ?? "Decision recorded by HR.",
        type: "decision",
      });
    }
  }

  // Sort timeline by date descending
  timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    candidate: {
      id: cand.id,
      profileId: linkedProfile?.id ?? null,
      userId: linkedProfile?.id ?? null,
      fullName: cand.full_name,
      email: cand.email,
      phone: cand.phone ?? null,
      location: cand.location ?? null,
      nationality: cand.nationality ?? null,
      headline: cand.headline ?? null,
      summary: (cand as unknown as { summary?: string }).summary ?? null,
      currentRole: latestRole ?? null,
      experienceYears: Number(cand.experience_years || 0),
      avatarColor: cand.avatar_color || "from-blue-500 to-indigo-600",
    },
    resume,
    skills,
    experience,
    education,
    certifications,
    languages,
    applicationsList: mappedAppsList,
    application: selectedApp,
    assessment,
    interview,
    scoring,
    hiringDecision,
    humanInterview,
    timeline,
  };
}

export async function submitHiringDecision(
  supabase: Client,
  applicationId: string,
  input: {
    decision: "select" | "reject";
    candidateMessage?: string;
    internalNotes?: string;
    actorId?: string;
  }
) {
  const admin = createAdminSupabaseClient();

  const { data: app, error: appErr } = await admin
    .from("applications")
    .select("id, candidate_id, job_id, stage, jobs ( organization_id, title ), candidates ( id, full_name, email )")
    .eq("id", applicationId)
    .single();

  if (appErr || !app) throw new ApiError(404, "Application not found");

  const job = Array.isArray(app.jobs) ? app.jobs[0] : app.jobs;
  const cand = Array.isArray(app.candidates) ? app.candidates[0] : app.candidates;

  if (!job?.organization_id) throw new ApiError(400, "Application missing organization");

  const newDecisionStr = input.decision === "select" ? "selected" : "rejected";
  const newStage = input.decision === "select" ? "hired" : "rejected";

  // 1. Upsert into hiring_decisions table
  const { data: decisionRecord, error: decErr } = await admin
    .from("hiring_decisions")
    .upsert(
      {
        organization_id: job.organization_id,
        application_id: applicationId,
        decision: newDecisionStr,
        decided_by: input.actorId || null,
        candidate_message: input.candidateMessage?.trim() || null,
        internal_notes: input.internalNotes?.trim() || null,
        decided_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "application_id" }
    )
    .select("*")
    .single();

  if (decErr) throw decErr;

  // 2. Update Application stage
  const { error: appUpdateErr } = await admin
    .from("applications")
    .update({
      stage: newStage as unknown as Database["public"]["Enums"]["application_stage"],
      shortlisted: input.decision === "select",
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (appUpdateErr) throw appUpdateErr;

  // 3. Create Candidate Notification
  const { data: candProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("candidate_id", app.candidate_id)
    .maybeSingle();

  if (candProfile) {
    const notifTitle = input.decision === "select"
      ? `Congratulations! Selected for ${job.title}`
      : `Update on your application for ${job.title}`;
    const notifBody = input.candidateMessage?.trim() || (input.decision === "select"
      ? `Congratulations! You have been selected for the ${job.title} role. HR will contact you soon.`
      : `Thank you for taking the time to apply and interview for the ${job.title} position.`);

    await admin.from("notifications").insert({
      recipient_id: candProfile.id,
      type: input.decision === "select" ? "candidate_selected" : "candidate_rejected",
      title: notifTitle,
      body: notifBody,
      metadata: { applicationId, jobId: app.job_id, decision: newDecisionStr },
    });

    await admin.from("portal_messages").insert({
      organization_id: job.organization_id,
      candidate_id: app.candidate_id,
      application_id: applicationId,
      sender_id: input.actorId || null,
      sender_role: "hr",
      subject: notifTitle,
      body: notifBody,
    });
  }

  // 4. Audit Log Entry
  try {
    await admin.from("audit_logs").insert({
      organization_id: job.organization_id,
      actor_id: input.actorId || null,
      action: `Candidate ${input.decision === "select" ? "selected" : "rejected"} for role ${job.title}`,
      entity_type: "application",
      entity_id: applicationId,
      metadata: {
        decision: newDecisionStr,
        candidateName: cand?.full_name,
        candidateMessage: input.candidateMessage,
      },
    });
  } catch {
    /* best effort audit log */
  }

  return decisionRecord;
}

export async function scheduleHumanInterview(
  supabase: Client,
  applicationId: string,
  input: {
    scheduledAt: string;
    timezone?: string;
    interviewType: string;
    interviewerName: string;
    interviewerEmail?: string;
    meetingLink?: string;
    location?: string;
    candidateInstructions?: string;
    internalNotes?: string;
    actorId?: string;
  }
) {
  const admin = createAdminSupabaseClient();

  const { data: app, error: appErr } = await admin
    .from("applications")
    .select("id, candidate_id, job_id, stage, jobs ( organization_id, title ), candidates ( id, full_name, email )")
    .eq("id", applicationId)
    .single();

  if (appErr || !app) throw new ApiError(404, "Application not found");

  const job = Array.isArray(app.jobs) ? app.jobs[0] : app.jobs;
  const cand = Array.isArray(app.candidates) ? app.candidates[0] : app.candidates;

  if (!job?.organization_id) throw new ApiError(400, "Application missing organization");

  const scheduledDate = new Date(input.scheduledAt);
  if (isNaN(scheduledDate.getTime())) {
    throw new ApiError(400, "Invalid scheduled date and time");
  }

  // 1. Insert or update human interview record
  const { data: intRecord, error: intErr } = await admin
    .from("human_interviews")
    .insert({
      organization_id: job.organization_id,
      application_id: applicationId,
      scheduled_by: input.actorId || null,
      interviewer_name: input.interviewerName.trim(),
      interviewer_email: input.interviewerEmail?.trim() || null,
      interview_type: input.interviewType || "video",
      scheduled_at: scheduledDate.toISOString(),
      timezone: input.timezone || "GST",
      meeting_link: input.meetingLink?.trim() || null,
      location: input.location?.trim() || null,
      candidate_instructions: input.candidateInstructions?.trim() || null,
      internal_notes: input.internalNotes?.trim() || null,
      status: "scheduled",
    })
    .select("*")
    .single();

  if (intErr) throw intErr;

  // 2. Update Application stage to final_interview
  await admin
    .from("applications")
    .update({
      stage: "final_interview",
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  // 3. Notify Candidate
  const { data: candProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("candidate_id", app.candidate_id)
    .maybeSingle();

  if (candProfile) {
    const formattedTime = `${scheduledDate.toLocaleDateString()} at ${scheduledDate.toLocaleTimeString()}`;
    const notifTitle = `Human Interview Scheduled for ${job.title}`;
    const notifBody = `Your human interview for ${job.title} has been scheduled for ${formattedTime} (${input.timezone || "GST"}). Interview type: ${input.interviewType}. Please check your candidate portal for details.`;

    await admin.from("notifications").insert({
      recipient_id: candProfile.id,
      type: "human_interview_scheduled",
      title: notifTitle,
      body: notifBody,
      metadata: { applicationId, jobId: app.job_id, scheduledAt: input.scheduledAt },
    });

    await admin.from("portal_messages").insert({
      organization_id: job.organization_id,
      candidate_id: app.candidate_id,
      application_id: applicationId,
      sender_id: input.actorId || null,
      sender_role: "hr",
      subject: notifTitle,
      body: notifBody,
    });
  }

  // 4. Audit Log
  try {
    await admin.from("audit_logs").insert({
      organization_id: job.organization_id,
      actor_id: input.actorId || null,
      action: `Human interview scheduled for candidate ${cand?.full_name ?? "Candidate"} (${job.title})`,
      entity_type: "application",
      entity_id: applicationId,
      metadata: {
        scheduledAt: input.scheduledAt,
        interviewerName: input.interviewerName,
        interviewType: input.interviewType,
      },
    });
  } catch {
    /* best effort audit log */
  }

  return intRecord;
}
