import "server-only";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, LanguageLevel } from "@/lib/supabase/database.types";
import { getCandidateById } from "@/lib/services/candidates.service";
import {
  buildCandidateEmbeddingText,
  embedAndStoreCandidate,
} from "@/lib/services/embeddings.service";
import type { Candidate } from "@/lib/types";

type Client = SupabaseClient<Database>;

const AVATAR_COLORS = [
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-violet-500 to-purple-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-cyan-500 to-blue-600",
];

export const createCandidateSchema = z.object({
  fullName: z.string().min(2),
  headline: z.string().nullable().optional(),
  email: z.string().email(),
  phone: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  nationality: z.string().nullable().optional(),
  experienceYears: z.coerce.number().min(0).max(50).default(0),
  skills: z.array(z.string()).default([]),
  languages: z
    .array(
      z.object({
        name: z.string(),
        level: z.enum(["native", "fluent", "professional", "conversational", "basic"]).default("professional"),
      })
    )
    .default([]),
  certifications: z
    .array(
      z.object({
        name: z.string(),
        issuer: z.string().nullable().optional(),
        year: z.string().nullable().optional(),
      })
    )
    .default([]),
  experience: z
    .array(
      z.object({
        role: z.string(),
        company: z.string(),
        location: z.string().nullable().optional(),
        period: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
      })
    )
    .default([]),
  education: z
    .array(
      z.object({
        degree: z.string(),
        institution: z.string(),
        period: z.string().nullable().optional(),
        grade: z.string().nullable().optional(),
      })
    )
    .default([]),
  jobId: z.string().uuid().nullable().optional(),
  resumeText: z.string().nullable().optional(),
  resumeFilePath: z.string().nullable().optional(),
  source: z.string().default("cv_parse"),
});

export type CreateCandidateInput = z.infer<typeof createCandidateSchema>;

function parsePeriod(period?: string | null): { start: string | null; end: string | null } {
  if (!period) return { start: null, end: null };
  const parts = period.split(/[—–-]/).map((p) => p.trim());
  const startYear = parts[0]?.match(/\d{4}/)?.[0];
  const endRaw = parts[1] ?? "";
  const endYear = /present|current/i.test(endRaw) ? null : endRaw.match(/\d{4}/)?.[0] ?? null;
  return {
    start: startYear ? `${startYear}-01-01` : null,
    end: endYear ? `${endYear}-12-31` : null,
  };
}

export async function createCandidate(
  supabase: Client,
  organizationId: string,
  createdBy: string,
  input: CreateCandidateInput
): Promise<Candidate> {
  const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

  const { data: candidate, error } = await supabase
    .from("candidates")
    .insert({
      organization_id: organizationId,
      full_name: input.fullName,
      email: input.email,
      phone: input.phone || null,
      location: input.location || null,
      nationality: input.nationality || null,
      headline: input.headline || null,
      experience_years: input.experienceYears,
      source: input.source,
      avatar_color: color,
      resume_file_path: input.resumeFilePath || null,
      resume_text: input.resumeText || null,
      created_by: createdBy,
    })
    .select("*")
    .single();

  if (error) throw error;

  if (input.skills.length) {
    const { error: skillsError } = await supabase.from("candidate_skills").insert(
      input.skills.map((skill) => ({ candidate_id: candidate.id, skill }))
    );
    if (skillsError) throw skillsError;
  }

  if (input.languages.length) {
    const { error: langError } = await supabase.from("candidate_languages").insert(
      input.languages.map((l) => ({
        candidate_id: candidate.id,
        name: l.name,
        level: l.level as LanguageLevel,
      }))
    );
    if (langError) throw langError;
  }

  if (input.certifications.length) {
    const { error: certError } = await supabase.from("candidate_certifications").insert(
      input.certifications.map((c) => ({
        candidate_id: candidate.id,
        name: c.name,
        issuer: c.issuer || null,
        year: c.year || null,
      }))
    );
    if (certError) throw certError;
  }

  if (input.experience.length) {
    const { error: expError } = await supabase.from("candidate_experience").insert(
      input.experience.map((e, i) => {
        const { start, end } = parsePeriod(e.period);
        return {
          candidate_id: candidate.id,
          role: e.role,
          company: e.company,
          location: e.location || null,
          start_date: start,
          end_date: end,
          description: e.description || null,
          sort_order: i,
        };
      })
    );
    if (expError) throw expError;
  }

  if (input.education.length) {
    const { error: eduError } = await supabase.from("candidate_education").insert(
      input.education.map((e, i) => {
        const { start, end } = parsePeriod(e.period);
        return {
          candidate_id: candidate.id,
          degree: e.degree,
          institution: e.institution,
          start_date: start,
          end_date: end,
          grade: e.grade || null,
          sort_order: i,
        };
      })
    );
    if (eduError) throw eduError;
  }

  if (input.jobId) {
    const { error: appError } = await supabase.from("applications").insert({
      candidate_id: candidate.id,
      job_id: input.jobId,
      stage: "applied",
      created_by: createdBy,
    });
    if (appError) throw appError;
  }

  // Fire-and-forget-ish: await embedding so matching works immediately
  try {
    const text = buildCandidateEmbeddingText({
      fullName: input.fullName,
      headline: input.headline,
      location: input.location,
      experienceYears: input.experienceYears,
      skills: input.skills,
      experience: input.experience,
      education: input.education,
      certifications: input.certifications,
      resumeText: input.resumeText,
    });
    await embedAndStoreCandidate(supabase, candidate.id, text);
  } catch (err) {
    console.error("Failed to embed new candidate:", err);
  }

  const detail = await getCandidateById(supabase, candidate.id);
  if (!detail) throw new Error("Candidate created but could not be reloaded");
  return detail;
}
