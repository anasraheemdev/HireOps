import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";
import { listCandidatesRaw, getCandidateByIdRaw, updateCandidateRaw } from "@/lib/repositories/candidates.repository";
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
  if(input.headline!==undefined || input.experienceYears!==undefined) patch.embedding=null;

  await updateCandidateRaw(supabase, id, patch);
  if(patch.embedding===null) {
    const {error}=await supabase.from('applications').update({match_score:null,ai_score:null,confidence_score:null,match_reasoning:null,ai_recommendation:null}).eq('candidate_id',id);
    if(error) throw error;
  }
  const detail = await getCandidateById(supabase, id);
  if (!detail) throw new Error("Candidate updated but could not be reloaded");
  return detail;
}

export async function setApplicationDecision(
  supabase: Client,
  applicationId: string,
  input: {
    stage?: string;
    decision?: "shortlist" | "reject";
    rejectionReason?: string;
    scoreOverride?: { matchScore?: number; reason: string };
    actorId?: string;
  }
) {
  const { data: rawApp, error: getErr } = await supabase
    .from("applications")
    .select("id, stage, candidate_id, job_id, jobs ( organization_id, title ), candidates ( full_name )")
    .eq("id", applicationId)
    .single();

  if (getErr || !rawApp) throw new Error("Application not found");
  const existing = rawApp as unknown as {
    id: string;
    stage: string;
    candidate_id: string;
    job_id: string;
    score_overrides?: Record<string, unknown> | null;
    jobs?: { organization_id?: string; title?: string } | { organization_id?: string; title?: string }[];
    candidates?: { full_name?: string } | { full_name?: string }[];
  };

  let targetStage = input.stage;
  let isShortlisted = false;

  if (input.decision) {
    if (input.decision === "reject") {
      targetStage = "rejected";
    } else if (input.decision === "shortlist") {
      targetStage = "shortlisted";
      isShortlisted = true;
    }
  }

  if (targetStage === "rejected" && !input.rejectionReason?.trim()) {
    throw new Error("A reason for rejection is required when rejecting an application");
  }

  const patch: Database["public"]["Tables"]["applications"]["Update"] = {};
  if (targetStage) {
    patch.stage = targetStage as unknown as Database["public"]["Enums"]["application_stage"];
    patch.shortlisted = targetStage === "shortlisted" || isShortlisted;
  }

  if (input.rejectionReason?.trim()) {
    (patch as Record<string, unknown>).rejection_reason = input.rejectionReason.trim();
  }

  let updatedOverrides = (existing.score_overrides as Record<string, unknown>) || {};
  if (input.scoreOverride) {
    if (!input.scoreOverride.reason?.trim()) {
      throw new Error("Reason is required when overriding AI match scores");
    }
    updatedOverrides = {
      ...updatedOverrides,
      matchScore: input.scoreOverride.matchScore ?? null,
      reason: input.scoreOverride.reason.trim(),
      updatedAt: new Date().toISOString(),
      updatedBy: input.actorId || null,
    };
    (patch as Record<string, unknown>).score_overrides = updatedOverrides;
    if (typeof input.scoreOverride.matchScore === "number") {
      patch.match_score = input.scoreOverride.matchScore;
    }
  }

  const { data: updated, error: updateErr } = await supabase
    .from("applications")
    .update(patch)
    .eq("id", applicationId)
    .select("*")
    .single();

  if (updateErr) throw updateErr;

  const job = Array.isArray(existing.jobs) ? existing.jobs[0] : existing.jobs;
  const cand = Array.isArray(existing.candidates) ? existing.candidates[0] : existing.candidates;
  const orgId = job?.organization_id;

  // Record audit log entry
  if (orgId) {
    try {
      await supabase.from("audit_logs").insert({
        organization_id: orgId,
        actor_id: input.actorId || null,
        action: `Application stage changed to "${targetStage || existing.stage}" for candidate ${cand?.full_name ?? "Candidate"}`,
        entity_type: "application",
        entity_id: applicationId,
        metadata: {
          previousStage: existing.stage,
          newStage: targetStage || existing.stage,
          rejectionReason: input.rejectionReason || null,
          scoreOverride: input.scoreOverride || null,
        },
      });
    } catch {
      /* best-effort audit log */
    }
  }

  return updated;
}
