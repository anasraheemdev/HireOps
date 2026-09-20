import { ApiError } from '@/lib/api/helpers';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
﻿import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ApplicationStage } from "@/lib/supabase/database.types";
import { getAIProvider } from "@/lib/ai";

type Client = SupabaseClient<Database>;

export async function requireCandidateId(
  profile: { id: string; email: string; fullName: string | null; candidateId: string | null; organizationId: string | null }
): Promise<{ candidateId: string; organizationId: string }> {
  let orgId = profile.organizationId;
  let candidateId = profile.candidateId;

  const admin = createAdminSupabaseClient();
  if (!orgId) {
    const { data: defaultOrg } = await admin.from("organizations").select("id").order("created_at", { ascending: true }).limit(1).maybeSingle();
    if (!defaultOrg) throw new ApiError(400, "No organization configured");
    orgId = defaultOrg.id;
  }

  if (!candidateId) {
    const { data: existing } = await admin
      .from("candidates")
      .select("id")
      .eq("organization_id", orgId)
      .eq("email", profile.email)
      .maybeSingle();

    if (existing) {
      candidateId = existing.id;
    } else {
      const { data: newCand, error: candErr } = await admin
        .from("candidates")
        .insert({
          organization_id: orgId,
          full_name: profile.fullName || profile.email.split("@")[0],
          email: profile.email,
          source: "portal_auto_link",
        })
        .select("id")
        .single();
      if (candErr) throw new ApiError(500, `Could not create candidate profile: ${candErr.message}`);
      candidateId = newCand.id;
    }

    await admin.from("profiles").update({ candidate_id: candidateId, organization_id: orgId }).eq("id", profile.id);
  }

  return { candidateId, organizationId: orgId };
}

export async function listMyApplications(supabase: Client, candidateId: string) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("applications")
    .select(
      `id, stage, match_score, ai_score, shortlisted, applied_date, created_at, updated_at,
       jobs ( id, title, location, status, departments ( name ) )`
    )
    .eq("candidate_id", candidateId)
    .order("applied_date", { ascending: false });
  if (error) throw error;

  const appIds = (data ?? []).map((r) => r.id);
  const [{ data: humanInts }, { data: decisions }] = await Promise.all([
    appIds.length > 0
      ? admin
          .from("human_interviews")
          .select("application_id, scheduled_at, timezone, interview_type, meeting_link, location, candidate_instructions, interviewer_name")
          .in("application_id", appIds)
      : { data: [] },
    appIds.length > 0
      ? admin
          .from("hiring_decisions")
          .select("application_id, decision, candidate_message, decided_at")
          .in("application_id", appIds)
      : { data: [] },
  ]);

  const humanIntMap = new Map((humanInts ?? []).map((h) => [h.application_id, h]));
  const decisionMap = new Map((decisions ?? []).map((d) => [d.application_id, d]));

  return (data ?? []).map((row) => {
    const job = Array.isArray(row.jobs) ? row.jobs[0] : row.jobs;
    const dept = job && (Array.isArray(job.departments) ? job.departments[0] : job.departments);
    const humanInt = humanIntMap.get(row.id);
    const dec = decisionMap.get(row.id);

    return {
      id: row.id,
      stage: row.stage as ApplicationStage,
      matchScore: row.match_score,
      aiScore: row.ai_score,
      shortlisted: row.shortlisted,
      appliedDate: row.applied_date,
      updatedAt: row.updated_at,
      jobId: job?.id ?? null,
      jobTitle: job?.title ?? "Unknown role",
      location: job?.location ?? null,
      jobStatus: job?.status ?? null,
      department: dept?.name ?? null,
      humanInterview: humanInt
        ? {
            scheduledAt: humanInt.scheduled_at,
            timezone: humanInt.timezone,
            interviewType: humanInt.interview_type,
            meetingLink: humanInt.meeting_link,
            location: humanInt.location,
            candidateInstructions: humanInt.candidate_instructions,
            interviewerName: humanInt.interviewer_name,
          }
        : null,
      hiringDecision: dec
        ? {
            decision: dec.decision,
            candidateMessage: dec.candidate_message,
            decidedAt: dec.decided_at,
          }
        : null,
    };
  });
}

export async function applyToJob(
  supabase: Client,
  candidateId: string,
  jobId: string,
  userId: string
) {
  const admin = createAdminSupabaseClient();
  const { data: cand } = await admin
    .from("candidates")
    .select("id, organization_id")
    .eq("id", candidateId)
    .single();

  if (!cand) throw new ApiError(404, "Candidate profile not found");

  const { data: job } = await admin
    .from("jobs")
    .select("id, organization_id, status")
    .eq("id", jobId)
    .maybeSingle();

  if (!job || job.organization_id !== cand.organization_id) {
    throw new ApiError(403, "Job not found or access denied for this organization");
  }

  if (job.status !== "open") {
    throw new ApiError(400, "This job is not accepting applications");
  }

  const { data: existing } = await admin
    .from("applications")
    .select("id, stage")
    .eq("candidate_id", candidateId)
    .eq("job_id", jobId)
    .maybeSingle();

  if (existing) return { ...existing, alreadyApplied: true as const };

  let matchScore: number | null = null;
  try {
    const { getCandidateJobRecommendations } = await import("@/lib/services/job-matching.service");
    const recs = await getCandidateJobRecommendations(admin, candidateId, 0);
    const rec = [...recs.recommendations, ...recs.appliedJobs].find((r) => r.id === jobId);
    if (rec) matchScore = rec.relevanceScore;
  } catch (scoreErr) {
    console.warn("[applyToJob] Scoring warning:", scoreErr);
  }

  const { data, error } = await admin
    .from("applications")
    .insert({
      candidate_id: candidateId,
      job_id: jobId,
      stage: "applied",
      created_by: userId,
      match_score: matchScore,
    })
    .select("id, stage")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: retryExisting } = await admin
        .from("applications")
        .select("id, stage")
        .eq("candidate_id", candidateId)
        .eq("job_id", jobId)
        .single();
      return { ...retryExisting, alreadyApplied: true as const };
    }
    throw error;
  }
  return { ...data, alreadyApplied: false as const };
}

export async function listMyInterviews(supabase: Client, candidateId: string) {
  const { data, error } = await supabase
    .from("interview_sessions")
    .select("*, jobs ( title )")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listMyOffers(supabase: Client, candidateId: string) {
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function respondToOffer(
  supabase: Client,
  offerId: string,
  candidateId: string,
  status: "accepted" | "declined"
) {
  const {data:offer}=await supabase.from('offers').select('id,status').eq('id',offerId).eq('candidate_id',candidateId).single();
  if(!offer) throw new ApiError(404,'Offer not found');
  if(offer.status===status) return offer;
  if(!['sent','pending'].includes(offer.status)) throw new ApiError(409,'This offer is no longer awaiting a response');
  const { data, error } = await createAdminSupabaseClient()
    .from("offers")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", offerId)
    .eq("candidate_id", candidateId)
    .in('status',['sent','pending'])
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listNotifications(supabase: Client, userId: string) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function markNotificationRead(supabase: Client, id: string, userId: string) {
  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("recipient_id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function createNotification(
  supabase: Client,
  input: { recipientId: string; type: string; title: string; body?: string; metadata?: Record<string, unknown> }
) {
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      recipient_id: input.recipientId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listSavedJobs(supabase: Client, candidateId: string) {
  const { data, error } = await supabase
    .from("saved_jobs")
    .select("id, created_at, jobs ( id, title, location, status, departments ( name ) )")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const job = Array.isArray(row.jobs) ? row.jobs[0] : row.jobs;
    const dept = job && (Array.isArray(job.departments) ? job.departments[0] : job.departments);
    return {
      id: row.id,
      savedAt: row.created_at,
      jobId: job?.id ?? null,
      title: job?.title ?? "Role",
      location: job?.location ?? null,
      status: job?.status ?? null,
      department: dept?.name ?? null,
    };
  });
}

export async function saveJob(supabase: Client, candidateId: string, jobId: string) {
  const { data, error } = await supabase
    .from("saved_jobs")
    .upsert({ candidate_id: candidateId, job_id: jobId }, { onConflict: "candidate_id,job_id" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function unsaveJob(supabase: Client, candidateId: string, jobId: string) {
  const { error } = await supabase
    .from("saved_jobs")
    .delete()
    .eq("candidate_id", candidateId)
    .eq("job_id", jobId);
  if (error) throw error;
}

export async function getMeProfile(supabase: Client, userId: string, candidateId: string | null) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, phone, avatar_url, portal_role, candidate_id, organization_id, status")
    .eq("id", userId)
    .single();
  if (error) throw error;

  let candidate = null;
  const effectiveCandidateId = candidateId || profile?.candidate_id;
  if (effectiveCandidateId) {
    const fullSelect = "id, full_name, email, phone, location, nationality, headline, summary, is_confirmed, experience_years, resume_url, resume_file_path, resume_text";
    const baseSelect = "id, full_name, email, phone, location, nationality, headline, experience_years, resume_url, resume_file_path, resume_text";

    const { data: initialData, error: candErr } = await supabase
      .from("candidates")
      .select(fullSelect)
      .eq("id", effectiveCandidateId)
      .maybeSingle();
    let data = initialData;

    if (candErr && (candErr.code === "PGRST204" || candErr.message?.includes("column"))) {
      const { data: fallbackData } = await supabase
        .from("candidates")
        .select(baseSelect)
        .eq("id", effectiveCandidateId)
        .maybeSingle();
      data = fallbackData ? ({ ...fallbackData, summary: null, is_confirmed: true } as unknown as typeof initialData) : null;
    }

    if (!data) {
      const admin = createAdminSupabaseClient();
      const { data: initialAdminCand, error: adminErr } = await admin
        .from("candidates")
        .select(fullSelect)
        .eq("id", effectiveCandidateId)
        .maybeSingle();
      let adminCand = initialAdminCand;

      if (adminErr && (adminErr.code === "PGRST204" || adminErr.message?.includes("column"))) {
        const { data: fallbackAdmin } = await admin
          .from("candidates")
          .select(baseSelect)
          .eq("id", effectiveCandidateId)
          .maybeSingle();
        adminCand = fallbackAdmin ? ({ ...fallbackAdmin, summary: null, is_confirmed: true } as unknown as typeof initialAdminCand) : null;
      }
      candidate = adminCand;
    } else {
      candidate = data;
    }
  }
  return { profile, candidate };
}

export type ConfirmCandidateProfileInput = {
  fullName: string;
  email?: string;
  phone?: string | null;
  location?: string | null;
  nationality?: string | null;
  headline?: string | null;
  summary?: string | null;
  experienceYears?: number;
  skills?: string[];
  languages?: { name: string; level: "native" | "fluent" | "professional" | "conversational" | "basic" }[];
  certifications?: { name: string; issuer?: string | null; year?: string | null }[];
  experience?: { role: string; company: string; location?: string | null; period?: string | null; description?: string | null }[];
  education?: { degree: string; institution: string; period?: string | null; grade?: string | null }[];
  resumeFilePath?: string | null;
  resumeText?: string | null;
};

export async function confirmCandidateProfile(
  supabase: Client,
  userId: string,
  candidateId: string,
  input: ConfirmCandidateProfileInput
) {
  const admin = createAdminSupabaseClient();

  // 1. Validate security boundary: Candidate profile must match user's linked candidate_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, candidate_id, organization_id")
    .eq("id", userId)
    .single();

  if (!profile || profile.candidate_id !== candidateId) {
    throw new ApiError(403, "You are not authorized to update this candidate profile.");
  }

  // 2. Fetch existing candidate to avoid overwriting verified data with empty fields
  const { data: existingCandidate } = await admin
    .from("candidates")
    .select("*")
    .eq("id", candidateId)
    .single();

  if (!existingCandidate) throw new ApiError(404, "Candidate profile not found.");

  const fullName = input.fullName?.trim() || existingCandidate.full_name;
  const phone = input.phone !== undefined ? input.phone : existingCandidate.phone;
  const location = input.location !== undefined ? input.location : existingCandidate.location;
  const nationality = input.nationality !== undefined ? input.nationality : existingCandidate.nationality;
  const headline = input.headline !== undefined ? input.headline : existingCandidate.headline;
  const summary = input.summary !== undefined ? input.summary : existingCandidate.summary;
  const experienceYears = input.experienceYears !== undefined ? input.experienceYears : Number(existingCandidate.experience_years);
  const resumeFilePath = input.resumeFilePath || existingCandidate.resume_file_path;
  const resumeText = input.resumeText || existingCandidate.resume_text;

  // 3. Update candidate core record & set is_confirmed = true
  const { error: candErr } = await admin
    .from("candidates")
    .update({
      full_name: fullName,
      phone,
      location,
      nationality,
      headline,
      summary,
      experience_years: experienceYears,
      resume_file_path: resumeFilePath,
      resume_text: resumeText,
      is_confirmed: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", candidateId);

  if (candErr && candErr.code === "PGRST204") {
    const { error: fallbackErr } = await admin
      .from("candidates")
      .update({
        full_name: fullName,
        phone,
        location,
        nationality,
        headline,
        experience_years: experienceYears,
        resume_file_path: resumeFilePath,
        resume_text: resumeText,
        updated_at: new Date().toISOString(),
      })
      .eq("id", candidateId);
    if (fallbackErr) throw fallbackErr;
  } else if (candErr) {
    throw candErr;
  }

  // 4. Update profile record
  await admin
    .from("profiles")
    .update({
      full_name: fullName,
      phone,
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  // 5. Idempotent child table updates
  if (Array.isArray(input.skills)) {
    const cleanSkills = [...new Set(input.skills.map((s) => s.trim()).filter(Boolean))];
    await admin.from("candidate_skills").delete().eq("candidate_id", candidateId);
    if (cleanSkills.length > 0) {
      await admin
        .from("candidate_skills")
        .insert(cleanSkills.map((skill) => ({ candidate_id: candidateId, skill })));
    }
  }

  if (Array.isArray(input.languages)) {
    await admin.from("candidate_languages").delete().eq("candidate_id", candidateId);
    if (input.languages.length > 0) {
      await admin.from("candidate_languages").insert(
        input.languages.map((l) => ({
          candidate_id: candidateId,
          name: l.name,
          level: l.level,
        }))
      );
    }
  }

  if (Array.isArray(input.certifications)) {
    await admin.from("candidate_certifications").delete().eq("candidate_id", candidateId);
    if (input.certifications.length > 0) {
      await admin.from("candidate_certifications").insert(
        input.certifications.map((c) => ({
          candidate_id: candidateId,
          name: c.name,
          issuer: c.issuer || null,
          year: c.year || null,
        }))
      );
    }
  }

  if (Array.isArray(input.experience)) {
    await admin.from("candidate_experience").delete().eq("candidate_id", candidateId);
    if (input.experience.length > 0) {
      await admin.from("candidate_experience").insert(
        input.experience.map((e, idx) => ({
          candidate_id: candidateId,
          role: e.role,
          company: e.company,
          location: e.location || null,
          description: e.description || null,
          sort_order: idx,
        }))
      );
    }
  }

  if (Array.isArray(input.education)) {
    await admin.from("candidate_education").delete().eq("candidate_id", candidateId);
    if (input.education.length > 0) {
      await admin.from("candidate_education").insert(
        input.education.map((ed, idx) => ({
          candidate_id: candidateId,
          degree: ed.degree,
          institution: ed.institution,
          grade: ed.grade || null,
          sort_order: idx,
        }))
      );
    }
  }

  // 6. Recompute candidate embedding after confirmation
  try {
    const { embedAndStoreCandidate, buildCandidateEmbeddingText } = await import(
      "@/lib/services/embeddings.service"
    );
    const text = buildCandidateEmbeddingText({
      fullName,
      headline,
      location,
      experienceYears,
      skills: input.skills ?? [],
      experience: input.experience ?? [],
      education: input.education ?? [],
      certifications: input.certifications ?? [],
      resumeText,
    });
    await embedAndStoreCandidate(admin, candidateId, text);
  } catch (embedErr) {
    console.warn("[confirmCandidateProfile] Embedding recomputation warning:", embedErr);
  }

  return getMeProfile(admin, userId, candidateId);
}

export async function updateMe(
  supabase: Client,
  userId: string,
  candidateId: string | null,
  input: {
    fullName?: string;
    phone?: string;
    headline?: string;
    location?: string;
    nationality?: string;
    experienceYears?: number;
  }
) {
  if (input.fullName !== undefined || input.phone !== undefined) {
    const { error } = await supabase
      .from("profiles")
      .update({
        ...(input.fullName !== undefined ? { full_name: input.fullName } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
    if (error) throw error;
  }

  if (candidateId) {
    const { error } = await supabase
      .from("candidates")
      .update({
        ...(input.fullName !== undefined ? { full_name: input.fullName } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.headline !== undefined ? { headline: input.headline } : {}),
        ...(input.location !== undefined ? { location: input.location } : {}),
        ...(input.nationality !== undefined ? { nationality: input.nationality } : {}),
        ...(input.experienceYears !== undefined ? { experience_years: input.experienceYears } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", candidateId);
    if (error) throw error;
  }

  if(candidateId && (input.headline!==undefined || input.experienceYears!==undefined)) {
    const admin=createAdminSupabaseClient();
    const {error}=await admin.from('candidates').update({embedding:null}).eq('id',candidateId);
    if(error) throw error;
    const {error:scoreError}=await admin.from('applications').update({match_score:null,ai_score:null,confidence_score:null,match_reasoning:null,ai_recommendation:null}).eq('candidate_id',candidateId);
    if(scoreError) throw scoreError;
  }
  return getMeProfile(supabase, userId, candidateId);
}

export async function listMyDocuments(supabase: Client, candidateId: string) {
  const { data, error } = await supabase
    .from("candidate_documents")
    .select("*")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listMyMessages(supabase: Client, candidateId: string) {
  const { data, error } = await supabase
    .from("portal_messages")
    .select("*")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function sendPortalMessage(
  supabase: Client,
  input: {
    organizationId: string;
    candidateId: string;
    senderId: string;
    body: string;
    subject?: string;
    applicationId?: string;
  }
) {
  const { data, error } = await supabase
    .from("portal_messages")
    .insert({
      organization_id: input.organizationId,
      candidate_id: input.candidateId,
      sender_id: input.senderId,
      sender_role: "candidate",
      body: input.body,
      subject: input.subject ?? null,
      application_id: input.applicationId ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listMyAssessmentAssignments(supabase: Client, candidateId: string) {
  const { data: apps } = await supabase.from("applications").select("id").eq("candidate_id", candidateId);
  const appIds = (apps ?? []).map((a) => a.id);
  if (!appIds.length) return [];

  const { data, error } = await supabase
    .from("assessment_assignments")
    .select("*, assessments ( id, title, description, difficulty, duration_minutes, status )")
    .in("application_id", appIds)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listHelpArticles(supabase: Client) {
  const { data, error } = await supabase
    .from("help_articles")
    .select("*")
    .eq("published", true)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function candidateHomeStats(supabase: Client, candidateId: string, userId: string) {
  const [apps, interviews, offers, notifs, assignments] = await Promise.all([
    listMyApplications(supabase, candidateId),
    listMyInterviews(supabase, candidateId),
    listMyOffers(supabase, candidateId),
    listNotifications(supabase, userId),
    listMyAssessmentAssignments(supabase, candidateId),
  ]);
  const pendingAssessments = assignments.filter((a) => a.status === "pending" || a.status === "in_progress").length;
  const upcomingInterviews = interviews.filter((i) => i.status === "scheduled" || i.status === "in_progress");
  return {
    applicationCount: apps.length,
    activeApplications: apps.filter((a) => !["hired", "rejected"].includes(a.stage)).length,
    interviewCount: interviews.length,
    upcomingInterviews,
    offerCount: offers.filter((o) => o.status === "sent" || o.status === "pending").length,
    unreadNotifications: notifs.filter((n) => !n.is_read).length,
    pendingAssessments,
    recentApplications: apps.slice(0, 5),
  };
}

export async function careerAssistantReply(
  supabase: Client,
  candidateId: string,
  userMessage: string
) {
  const { data: candidate } = await supabase
    .from("candidates")
    .select("full_name, headline, experience_years, location")
    .eq("id", candidateId)
    .maybeSingle();
  const { data: skills } = await supabase.from("candidate_skills").select("skill").eq("candidate_id", candidateId);
  const { data: jobs } = await supabase
    .from("jobs")
    .select("title, location, required_skills")
    .eq("status", "open")
    .limit(8);

  const provider = await getAIProvider();
  const result = (await provider.chatJSON(
    [
      {
        role: "system",
        content: `You are a career assistant for HireOps candidates.
Return JSON: { reply: string, suggestions: string[] }.
Be practical and concise. Candidate: ${candidate?.full_name ?? "Candidate"} — ${candidate?.headline ?? ""}.
Skills: ${(skills ?? []).map((s) => s.skill).join(", ") || "n/a"}.
Open roles: ${(jobs ?? []).map((j) => j.title).join("; ") || "none listed"}.`,
      },
      { role: "user", content: userMessage },
    ],
    { temperature: 0.4, maxTokens: 800 }
  )) as { reply?: string; suggestions?: string[] };

  return {
    reply: result.reply ?? "I can help with resume tips, role fit, and interview prep.",
    suggestions: result.suggestions ?? [],
  };
}
