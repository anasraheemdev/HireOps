import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getAIProvider } from "@/lib/ai";
import { listCandidates } from "@/lib/services/candidates.service";
import { getJobById } from "@/lib/services/jobs.service";
import {
  buildJobEmbeddingText,
  embedAndStoreJob,
} from "@/lib/services/embeddings.service";
import type { Candidate, Job } from "@/lib/types";
import type { MatchReasoning, MatchResult } from "@/lib/types/matching";

export type { MatchReasoning, MatchResult };

type Client = SupabaseClient<Database>;

function skillOverlap(candidateSkills: string[], required: string[]) {
  const normalize = (s: string) => s.trim().toLowerCase();
  const cand = new Set(candidateSkills.map(normalize));
  const matched = required.filter((s) => cand.has(normalize(s)));
  const missing = required.filter((s) => !cand.has(normalize(s)));
  // Also surface candidate skills that fuzzy-contain required terms
  const softMatched = candidateSkills.filter((cs) =>
    required.some((r) => normalize(cs).includes(normalize(r)) || normalize(r).includes(normalize(cs)))
  );
  const matchedSet = new Set([...matched, ...softMatched]);
  return {
    matchedSkills: [...matchedSet],
    missingSkills: missing.filter((m) => !softMatched.some((s) => normalize(s).includes(normalize(m)))),
  };
}

async function ensureJobEmbedding(supabase: Client, job: Job): Promise<void> {
  const { data } = await supabase.from("jobs").select("embedding").eq("id", job.id).maybeSingle();
  if (data?.embedding) return;

  const text = buildJobEmbeddingText({
    title: job.title,
    description: job.description,
    requiredSkills: job.requiredSkills,
    minExperienceYears: job.minExperience,
    level: job.level,
    location: job.location,
  });
  await embedAndStoreJob(supabase, job.id, text);
}

export async function matchCandidatesForJob(
  supabase: Client,
  jobId: string,
  limit = 50
): Promise<{ job: Job; matches: MatchResult[] }> {
  const job = await getJobById(supabase, jobId);
  if (!job) throw new Error("Job not found");

  await ensureJobEmbedding(supabase, job);

  const { data: rows, error } = await supabase.rpc("match_candidates_for_job", {
    p_job_id: jobId,
    p_limit: limit,
  });
  if (error) throw error;

  const ranked = (Array.isArray(rows) ? rows : rows ? [rows] : []) as {
    candidate_id: string;
    similarity: number;
  }[];

  const allCandidates = await listCandidates(supabase);
  const byId = new Map(allCandidates.map((c) => [c.id, c]));

  const matches: MatchResult[] = [];
  for (const row of ranked) {
    const candidate = byId.get(row.candidate_id);
    if (!candidate) continue;
    const { matchedSkills, missingSkills } = skillOverlap(candidate.skills, job.requiredSkills);
    const similarity = Math.round((row.similarity ?? 0) * 1000) / 10;
    const skillsPct =
      job.requiredSkills.length === 0
        ? 80
        : Math.round((matchedSkills.length / job.requiredSkills.length) * 100);
    const expPct = Math.min(
      100,
      Math.round((candidate.experienceYears / Math.max(job.minExperience, 1)) * 70 + 30)
    );
    const overall = Math.round(similarity * 0.55 + skillsPct * 0.3 + expPct * 0.15);

    const { data: app } = await supabase
      .from("applications")
      .select("id, shortlisted")
      .eq("candidate_id", candidate.id)
      .eq("job_id", jobId)
      .maybeSingle();

    matches.push({
      ...candidate,
      applicationId: app?.id ?? candidate.applicationId,
      shortlisted: app?.shortlisted ?? candidate.shortlisted,
      jobId: job.id,
      appliedFor: job.title,
      department: job.department,
      matchScore: overall,
      similarity,
      matchedSkills,
      missingSkills,
      skills: matchedSkills.length ? matchedSkills : candidate.skills,
    });
  }

  matches.sort((a, b) => b.matchScore - a.matchScore);

  // Persist match scores onto existing applications for this job (best-effort)
  await Promise.all(
    matches.map(async (m) => {
      if (!m.applicationId && m.jobId !== jobId) return;
      const { data: app } = await supabase
        .from("applications")
        .select("id")
        .eq("candidate_id", m.id)
        .eq("job_id", jobId)
        .maybeSingle();
      if (!app) return;
      await supabase
        .from("applications")
        .update({
          match_score: m.matchScore,
          ai_score: m.similarity,
          confidence_score: Math.min(98, Math.round(m.matchScore * 0.95)),
        })
        .eq("id", app.id);
    })
  );

  return { job, matches };
}

export async function explainMatch(
  supabase: Client,
  jobId: string,
  candidateId: string
): Promise<MatchReasoning> {
  const [{ job, matches }, detail] = await Promise.all([
    matchCandidatesForJob(supabase, jobId, 100),
    listCandidates(supabase).then((all) => all.find((c) => c.id === candidateId) ?? null),
  ]);

  const match = matches.find((m) => m.id === candidateId);
  const candidate = match ?? detail;
  if (!candidate || !job) throw new Error("Candidate or job not found");

  const { matchedSkills, missingSkills } = skillOverlap(candidate.skills, job.requiredSkills);
  const semantic = match?.similarity ?? candidate.matchScore;
  const skillsPct =
    job.requiredSkills.length === 0
      ? 80
      : Math.round((matchedSkills.length / job.requiredSkills.length) * 100);
  const expPct = Math.min(
    100,
    Math.round((candidate.experienceYears / Math.max(job.minExperience, 1)) * 70 + 30)
  );
  const overall = match?.matchScore ?? Math.round(semantic * 0.55 + skillsPct * 0.3 + expPct * 0.15);

  const heuristicReasoning = [
    `Semantic similarity score of ${semantic}% against the job profile.`,
    `Skills coverage: ${matchedSkills.length}/${job.requiredSkills.length || 0} required skills matched.`,
    missingSkills.length
      ? `Notable gaps: ${missingSkills.slice(0, 4).join(", ")}.`
      : "No critical required-skill gaps detected.",
  ];
  const heuristicRecommendation =
    overall >= 75
      ? "Strong match — recommend advancing to screening."
      : overall >= 55
        ? "Partial match — review skill gaps before shortlisting."
        : "Weak match — consider only if pipeline is thin.";

  let raw: unknown = null;
  try {
    const provider = getAIProvider();
    raw = await provider.chatJSON(
      [
        {
          role: "system",
          content:
            "You are an explainable AI recruitment assistant for HireOps. Return ONLY JSON: { reasoning: string[], recommendation: string }. reasoning is 3-5 short bullet sentences. recommendation is one concise hiring recommendation paragraph.",
        },
        {
          role: "user",
          content: JSON.stringify({
            job: {
              title: job.title,
              requiredSkills: job.requiredSkills,
              minExperience: job.minExperience,
              description: job.description?.slice(0, 800),
            },
            candidate: {
              name: candidate.name,
              title: candidate.title,
              experienceYears: candidate.experienceYears,
              skills: candidate.skills,
              matchedSkills,
              missingSkills,
              scores: { semantic, skills: skillsPct, experience: expPct, overall },
            },
          }),
        },
      ],
      { temperature: 0.3, maxTokens: 800 }
    );
  } catch (err) {
    // Never fail the match explanation UI when the LLM provider is down / misrouted.
    console.warn("[explainMatch] AI unavailable, using heuristic explanation:", err);
  }

  const reasoning =
    raw && typeof raw === "object" && Array.isArray((raw as { reasoning?: unknown }).reasoning)
      ? ((raw as { reasoning: string[] }).reasoning as string[])
      : heuristicReasoning;

  const recommendation =
    raw && typeof raw === "object" && typeof (raw as { recommendation?: unknown }).recommendation === "string"
      ? (raw as { recommendation: string }).recommendation
      : heuristicRecommendation;

  const result: MatchReasoning = {
    matchedSkills,
    missingSkills,
    scoreBreakdown: { semantic, skills: skillsPct, experience: expPct, overall },
    reasoning,
    recommendation,
  };

  // Persist onto application if one exists (best-effort)
  try {
    const { data: app } = await supabase
      .from("applications")
      .select("id")
      .eq("candidate_id", candidateId)
      .eq("job_id", jobId)
      .maybeSingle();

    if (app) {
      await supabase
        .from("applications")
        .update({
          match_reasoning: result,
          ai_recommendation: recommendation,
          match_score: overall,
          strengths: matchedSkills.slice(0, 6),
          weaknesses: missingSkills.slice(0, 6),
        })
        .eq("id", app.id);
    }
  } catch (err) {
    console.warn("[explainMatch] failed to persist reasoning:", err);
  }

  return result;
}
