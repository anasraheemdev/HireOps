import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getAIProvider } from "@/lib/ai";
import type { ChatMessage } from "@/lib/ai";

type Client = SupabaseClient<Database>;

export function buildInterviewSystemPrompt(session: {
  mode: string;
  candidates?: { full_name?: string | null; headline?: string | null; resume_text?: string | null } | null;
  jobs?: { title?: string | null; description?: string | null; required_skills?: string[] | null } | null;
}) {
  const job = session.jobs;
  const candidate = session.candidates;
  return `You are Amina, an enterprise AI interviewer for HireOps.
Mode: ${session.mode}.
Candidate: ${candidate?.full_name ?? "Unknown"} — ${candidate?.headline ?? ""}.
Resume excerpt: ${(candidate?.resume_text ?? "").slice(0, 2500) || "n/a"}.
Role: ${job?.title ?? "General"}.
Job description: ${(job?.description ?? "").slice(0, 1500) || "n/a"}.
Required skills: ${(job?.required_skills ?? []).join(", ") || "n/a"}.
Ask one clear question at a time. Probe with STAR follow-ups when answers are vague.
Speak naturally in plain text (not JSON). Keep replies under 120 words.`;
}

export async function streamInterviewReply(
  supabase: Client,
  sessionId: string,
  userMessage: string,
  onDelta: (text: string) => void,
  signal?: AbortSignal
) {
  const packed = await getInterviewSessionTyped(supabase, sessionId);
  if (!packed) throw new Error("Session not found");

  await supabase.from("interview_messages").insert({
    session_id: sessionId,
    role: "user",
    content: userMessage,
  });

  const provider = getAIProvider();
  const history: ChatMessage[] = [
    { role: "system", content: buildInterviewSystemPrompt(packed.session) },
    ...packed.messages.map((m) => ({
      role: m.role as "system" | "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ];

  const reply = await provider.chatStream(history.slice(-14), onDelta, {
    temperature: 0.45,
    maxTokens: 700,
    signal,
  });

  // Adaptive meta via lightweight JSON call
  let meta: Record<string, unknown> = {};
  try {
    meta = (await provider.chatJSON(
      [
        {
          role: "system",
          content:
            'Given the interviewer reply and candidate answer, return JSON: { followUp: boolean, starSignals: string[], qualityScore: number }',
        },
        { role: "user", content: `Candidate: ${userMessage}\nInterviewer: ${reply}` },
      ],
      { temperature: 0.1, maxTokens: 200 }
    )) as Record<string, unknown>;
  } catch {
    meta = { followUp: true, starSignals: [], qualityScore: null };
  }

  const { data: saved } = await supabase
    .from("interview_messages")
    .insert({
      session_id: sessionId,
      role: "assistant",
      content: reply,
      metadata: meta,
    })
    .select("*")
    .single();

  await supabase.from("ai_usage_logs").insert({
    organization_id: packed.session.organization_id,
    provider: process.env.AI_PROVIDER || "openrouter",
    model: process.env.AI_CHAT_MODEL || null,
    operation: "interview_stream",
    metadata: { sessionId },
  });

  return { reply, meta, message: saved };
}

async function getInterviewSessionTyped(supabase: Client, sessionId: string) {
  const [{ data: session, error }, { data: messages }] = await Promise.all([
    supabase
      .from("interview_sessions")
      .select("*, candidates ( full_name, headline, resume_text ), jobs ( title, description, required_skills )")
      .eq("id", sessionId)
      .maybeSingle(),
    supabase.from("interview_messages").select("*").eq("session_id", sessionId).order("created_at"),
  ]);
  if (error) throw error;
  if (!session) return null;

  const cand = Array.isArray(session.candidates) ? session.candidates[0] : session.candidates;
  const job = Array.isArray(session.jobs) ? session.jobs[0] : session.jobs;

  let resume_text: string | null = null;
  if (cand && "id" in (cand as object) === false && session.candidate_id) {
    const { data: fullCand } = await supabase
      .from("candidates")
      .select("id")
      .eq("id", session.candidate_id)
      .maybeSingle();
    void fullCand;
  }
  // Pull resume text from candidate_documents/path is not text — use headline as context fallback
  // If a resume_text column exists in future it will be selected; for now compose from profile fields
  const candidate = cand
    ? { ...cand, resume_text: resume_text ?? (cand as { headline?: string }).headline ?? null }
    : null;

  return {
    session: { ...session, candidates: candidate, jobs: job },
    messages: messages ?? [],
  };
}

// Re-export helpers used by route by wrapping existing file functions via re-implementations below
export { getInterviewSessionTyped as getInterviewSessionForStream };
