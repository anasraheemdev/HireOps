import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getEmbeddingProvider } from "@/lib/ai";

type Client = SupabaseClient<Database>;

export function buildCandidateEmbeddingText(input: {
  fullName: string;
  headline?: string | null;
  location?: string | null;
  experienceYears?: number | null;
  skills?: string[];
  experience?: { role: string; company: string; description?: string | null }[];
  education?: { degree: string; institution: string }[];
  certifications?: { name: string }[];
  resumeText?: string | null;
}): string {
  const parts = [
    input.fullName,
    input.headline,
    input.location,
    input.experienceYears != null ? `${input.experienceYears} years experience` : null,
    input.skills?.length ? `Skills: ${input.skills.join(", ")}` : null,
    ...(input.experience ?? []).map(
      (e) => `${e.role} at ${e.company}${e.description ? `: ${e.description}` : ""}`
    ),
    ...(input.education ?? []).map((e) => `${e.degree}, ${e.institution}`),
    ...(input.certifications ?? []).map((c) => c.name),
  ].filter(Boolean) as string[];

  const profile = parts.join(". ");
  const resumeSnippet = input.resumeText?.slice(0, 4000);
  return resumeSnippet ? `${profile}\n\n${resumeSnippet}` : profile;
}

export function buildJobEmbeddingText(input: {
  title: string;
  description?: string | null;
  requiredSkills?: string[];
  niceToHaveSkills?: string[];
  minExperienceYears?: number | null;
  level?: string | null;
  location?: string | null;
}): string {
  return [
    input.title,
    input.level,
    input.location,
    input.minExperienceYears != null ? `Requires ${input.minExperienceYears}+ years experience` : null,
    input.requiredSkills?.length ? `Required skills: ${input.requiredSkills.join(", ")}` : null,
    input.niceToHaveSkills?.length ? `Nice to have: ${input.niceToHaveSkills.join(", ")}` : null,
    input.description,
  ]
    .filter(Boolean)
    .join(". ");
}

export async function embedAndStoreCandidate(
  supabase: Client,
  candidateId: string,
  text: string
): Promise<void> {
  const provider = getEmbeddingProvider();
  const vector = await provider.embed(text.slice(0, 8000));
  const embedding = `[${vector.join(",")}]`;
  const { error } = await supabase
    .from("candidates")
    .update({
      embedding,
      embedding_updated_at: new Date().toISOString(),
    })
    .eq("id", candidateId);
  if (error) throw error;
}

export async function embedAndStoreJob(supabase: Client, jobId: string, text: string): Promise<void> {
  const provider = getEmbeddingProvider();
  const vector = await provider.embed(text.slice(0, 8000));
  const embedding = `[${vector.join(",")}]`;
  const { error } = await supabase
    .from("jobs")
    .update({
      embedding,
      embedding_updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
  if (error) throw error;
}
