import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getAIProvider } from "@/lib/ai";

type Client = SupabaseClient<Database>;

export async function listAssessments(supabase: Client) {
  const { data, error } = await supabase.from("assessments" as "candidates").select("*").order("created_at", { ascending: false });
  // Use untyped fallback until Database types regenerated
  if (error) {
    const res = await (supabase as unknown as { from: (t: string) => ReturnType<Client["from"]> }).from("assessments").select("*").order("created_at", { ascending: false });
    if (res.error) throw res.error;
    return res.data ?? [];
  }
  return data ?? [];
}

export async function listAssessmentsRaw(supabase: Client) {
  const { data, error } = await (supabase as any).from("assessments").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createAssessment(
  supabase: Client,
  organizationId: string,
  createdBy: string,
  input: { title: string; description?: string; difficulty?: string; durationMinutes?: number }
) {
  const { data, error } = await (supabase as any)
    .from("assessments")
    .insert({
      organization_id: organizationId,
      title: input.title,
      description: input.description ?? null,
      difficulty: input.difficulty ?? "medium",
      duration_minutes: input.durationMinutes ?? 60,
      status: "active",
      created_by: createdBy,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listInterviewSessions(supabase: Client) {
  const { data, error } = await (supabase as any)
    .from("interview_sessions")
    .select("*, candidates ( full_name, headline ), jobs ( title )")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createInterviewSession(
  supabase: Client,
  organizationId: string,
  createdBy: string,
  input: { candidateId: string; jobId?: string; applicationId?: string; mode?: string; templateId?: string }
) {
  const { data, error } = await supabase
    .from("interview_sessions")
    .insert({
      organization_id: organizationId,
      candidate_id: input.candidateId,
      job_id: input.jobId ?? null,
      application_id: input.applicationId ?? null,
      template_id: input.templateId ?? null,
      mode: input.mode ?? "behavioral",
      status: "in_progress",
      started_at: new Date().toISOString(),
      created_by: createdBy,
    })
    .select("*")
    .single();
  if (error) throw error;

  let opener =
    "Welcome to your HireOps AI interview. I'll ask a few structured questions based on the role. Please answer thoughtfully using specific examples. Are you ready to begin?";
  if (input.templateId) {
    const { data: tmpl } = await supabase
      .from("interview_templates")
      .select("system_prompt, mode")
      .eq("id", input.templateId)
      .maybeSingle();
    if (tmpl?.system_prompt) opener = tmpl.system_prompt.slice(0, 500);
  }

  await supabase.from("interview_messages").insert({
    session_id: data.id,
    role: "assistant",
    content: opener,
  });

  return data;
}

export async function getInterviewSession(supabase: Client, sessionId: string) {
  const [{ data: session, error }, { data: messages }] = await Promise.all([
    (supabase as any).from("interview_sessions").select("*, candidates ( full_name, headline, resume_text ), jobs ( title, description, required_skills )").eq("id", sessionId).maybeSingle(),
    (supabase as any).from("interview_messages").select("*").eq("session_id", sessionId).order("created_at"),
  ]);
  if (error) throw error;
  if (!session) return null;
  return { session, messages: messages ?? [] };
}

export async function sendInterviewReply(supabase: Client, sessionId: string, userMessage: string) {
  const packed = await getInterviewSession(supabase, sessionId);
  if (!packed) throw new Error("Session not found");

  await (supabase as any).from("interview_messages").insert({
    session_id: sessionId,
    role: "user",
    content: userMessage,
  });

  const provider = getAIProvider();
  const history = [
    ...packed.messages.map((m: { role: string; content: string }) => ({
      role: m.role as "system" | "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  const job = packed.session.jobs;
  const candidate = packed.session.candidates;
  const system = {
    role: "system" as const,
    content: `You are Amina, an enterprise AI interviewer for HireOps.
Mode: ${packed.session.mode}.
Candidate: ${candidate?.full_name ?? "Unknown"} — ${candidate?.headline ?? ""}.
Role: ${job?.title ?? "General"}.
Required skills: ${(job?.required_skills ?? []).join(", ") || "n/a"}.
Ask one clear question at a time. Probe with STAR follow-ups when answers are vague.
Return ONLY JSON: { "reply": string, "followUp": boolean, "starSignals": string[], "qualityScore": number }`,
  };

  const raw = (await provider.chatJSON([system, ...history.slice(-12)], { temperature: 0.4, maxTokens: 800 })) as {
    reply?: string;
    followUp?: boolean;
    starSignals?: string[];
    qualityScore?: number;
  };

  const reply = raw.reply ?? "Thank you. Could you elaborate on the impact of that decision?";
  await (supabase as any).from("interview_messages").insert({
    session_id: sessionId,
    role: "assistant",
    content: reply,
    metadata: { starSignals: raw.starSignals ?? [], qualityScore: raw.qualityScore ?? null, followUp: raw.followUp ?? false },
  });

  try {
    await (supabase as any).from("ai_usage_logs").insert({
      organization_id: packed.session.organization_id,
      provider: process.env.AI_PROVIDER || "openrouter",
      model: process.env.AI_CHAT_MODEL || "qwen/qwen-2.5-72b-instruct",
      operation: "interview_turn",
      metadata: { sessionId },
    });
  } catch {
    /* best-effort */
  }

  return { reply, meta: raw };
}

export async function finalizeInterview(supabase: Client, sessionId: string) {
  const packed = await getInterviewSession(supabase, sessionId);
  if (!packed) throw new Error("Session not found");
  const provider = getAIProvider();
  const transcript = packed.messages.map((m: { role: string; content: string }) => `${m.role}: ${m.content}`).join("\n");
  const raw = (await provider.chatJSON(
    [
      {
        role: "system",
        content:
          'Score this interview. Return JSON: { summary: string, recommendation: "strong_hire"|"hire"|"maybe"|"no_hire", scores: { communication: number, technicalDepth: number, problemSolving: number, leadership: number, cultureFit: number, overall: number }, strengths: string[], risks: string[], reasoning: string[] }. Scores 0-100.',
      },
      { role: "user", content: transcript.slice(0, 12000) },
    ],
    { temperature: 0.2, maxTokens: 1200 }
  )) as Record<string, unknown>;

  const { data, error } = await supabase
    .from("interview_sessions")
    .update({
      status: "completed",
      ended_at: new Date().toISOString(),
      summary: (raw.summary as string) ?? null,
      recommendation: (raw.recommendation as string) ?? null,
      scores: {
        ...(typeof raw.scores === "object" && raw.scores ? (raw.scores as object) : {}),
        strengths: raw.strengths ?? [],
        risks: raw.risks ?? [],
        reasoning: raw.reasoning ?? [],
      },
    })
    .eq("id", sessionId)
    .select("*")
    .single();
  if (error) throw error;
  return { session: data, evaluation: raw };
}

export async function addInternalNote(
  supabase: Client,
  organizationId: string,
  authorId: string,
  input: { entityType: string; entityId: string; body: string }
) {
  const { data, error } = await (supabase as any)
    .from("internal_notes")
    .insert({
      organization_id: organizationId,
      entity_type: input.entityType,
      entity_id: input.entityId,
      author_id: authorId,
      body: input.body,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listInternalNotes(supabase: Client, entityType: string, entityId: string) {
  const { data, error } = await (supabase as any)
    .from("internal_notes")
    .select("*, profiles ( full_name )")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
