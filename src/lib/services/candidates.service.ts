import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";
import { listCandidatesRaw, getCandidateByIdRaw, updateCandidateRaw, updateApplicationStage } from "@/lib/repositories/candidates.repository";
import { mapCandidateListItem, mapCandidateDetail } from "@/lib/dto/candidate.dto";
import type { Candidate } from "@/lib/types";

type Client = SupabaseClient<Database>;

export async function listCandidates(supabase: Client): Promise<Candidate[]> {
  const { candidates, applications } = await listCandidatesRaw(supabase);
  const appByCandidateId = new Map(applications.map((a) => [a.candidate_id, a]));
  return candidates.map((c) => mapCandidateListItem(c, appByCandidateId.get(c.id)));
}

export async function getCandidateById(supabase: Client, id: string): Promise<Candidate | null> {
  const raw = await getCandidateByIdRaw(supabase, id);
  if (!raw) return null;
  return mapCandidateDetail(raw);
}

export const updateCandidateSchema = z.object({
  fullName: z.string().min(2).optional(),
  headline: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  nationality: z.string().nullable().optional(),
  experienceYears: z.coerce.number().min(0).max(50).optional(),
});

export type UpdateCandidateInput = z.infer<typeof updateCandidateSchema>;

export async function updateCandidate(supabase: Client, id: string, input: UpdateCandidateInput): Promise<Candidate> {
  const patch: Database["public"]["Tables"]["candidates"]["Update"] = {};
  if (input.fullName !== undefined) patch.full_name = input.fullName;
  if (input.headline !== undefined) patch.headline = input.headline;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.location !== undefined) patch.location = input.location;
  if (input.nationality !== undefined) patch.nationality = input.nationality;
  if (input.experienceYears !== undefined) patch.experience_years = input.experienceYears;

  await updateCandidateRaw(supabase, id, patch);
  const detail = await getCandidateById(supabase, id);
  if (!detail) throw new Error("Candidate updated but could not be reloaded");
  return detail;
}

export async function setApplicationDecision(
  supabase: Client,
  applicationId: string,
  decision: "shortlist" | "reject"
) {
  return updateApplicationStage(supabase, applicationId, {
    shortlisted: decision === "shortlist",
    stage: decision === "reject" ? "rejected" : undefined,
  });
}
