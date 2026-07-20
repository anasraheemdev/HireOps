import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ApplicationStage } from "@/lib/supabase/database.types";
import { getAIProvider } from "@/lib/ai";

type Client = SupabaseClient<Database>;

export async function requireCandidateId(
  profile: { candidateId: string | null; organizationId: string | null }
): Promise<{ candidateId: string; organizationId: string }> {
  if (!profile.candidateId) throw new Error("No candidate profile linked to this account");
  if (!profile.organizationId) throw new Error("No organization assigned");
  return { candidateId: profile.candidateId, organizationId: profile.organizationId };
}

export async function listMyApplications(supabase: Client, candidateId: string) {
  const { data, error } = await supabase
    .from("applications")
    .select(
      `id, stage, match_score, ai_score, shortlisted, applied_date, created_at, updated_at,
       jobs ( id, title, location, status, departments ( name ) )`
    )
    .eq("candidate_id", candidateId)
    .order("applied_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const job = Array.isArray(row.jobs) ? row.jobs[0] : row.jobs;
    const dept = job && (Array.isArray(job.departments) ? job.departments[0] : job.departments);
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
    };
  });
}

export async function applyToJob(
  supabase: Client,
  candidateId: string,
  jobId: string,
  userId: string
) {
  const { data: existing } = await supabase
    .from("applications")
    .select("id, stage")
    .eq("candidate_id", candidateId)
    .eq("job_id", jobId)
    .maybeSingle();
  if (existing) return { ...existing, alreadyApplied: true as const };

  const { data, error } = await supabase
    .from("applications")
    .insert({
      candidate_id: candidateId,
      job_id: jobId,
      stage: "applied",
      created_by: userId,
    })
    .select("id, stage")
    .single();
  if (error) throw error;
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
  const { data, error } = await supabase
    .from("offers")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", offerId)
    .eq("candidate_id", candidateId)
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
    .select("id, email, full_name, phone, avatar_url, portal_role, candidate_id, organization_id")
    .eq("id", userId)
    .single();
  if (error) throw error;

  let candidate = null;
  if (candidateId) {
    const { data } = await supabase
      .from("candidates")
      .select("id, full_name, email, phone, location, nationality, headline, experience_years, resume_url, resume_file_path")
      .eq("id", candidateId)
      .maybeSingle();
    candidate = data;
  }
  return { profile, candidate };
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

  const provider = getAIProvider();
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
