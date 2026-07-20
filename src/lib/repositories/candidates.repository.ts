import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export async function listCandidatesRaw(supabase: Client) {
  const { data: candidates, error } = await supabase
    .from("candidates")
    .select("*, candidate_skills ( skill )")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const ids = candidates.map((c) => c.id);
  const { data: applications, error: appError } = await supabase
    .from("v_candidate_latest_application")
    .select("*, jobs ( department_id, departments ( name ) )")
    .in("candidate_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  if (appError) throw appError;

  return { candidates, applications: applications ?? [] };
}

export async function getCandidateByIdRaw(supabase: Client, id: string) {
  const [{ data: candidate, error }, { data: experience }, { data: education }, { data: certifications }, { data: languages }, { data: skills }, { data: applications }] =
    await Promise.all([
      supabase.from("candidates").select("*").eq("id", id).maybeSingle(),
      supabase.from("candidate_experience").select("*").eq("candidate_id", id).order("sort_order"),
      supabase.from("candidate_education").select("*").eq("candidate_id", id).order("sort_order"),
      supabase.from("candidate_certifications").select("*").eq("candidate_id", id),
      supabase.from("candidate_languages").select("*").eq("candidate_id", id),
      supabase.from("candidate_skills").select("*").eq("candidate_id", id),
      supabase
        .from("applications")
        .select("*, jobs ( id, title, department_id, required_skills, min_experience_years, departments ( name ) )")
        .eq("candidate_id", id)
        .order("applied_date", { ascending: false }),
    ]);

  if (error) throw error;
  if (!candidate) return null;

  return {
    candidate,
    experience: experience ?? [],
    education: education ?? [],
    certifications: certifications ?? [],
    languages: languages ?? [],
    skills: skills ?? [],
    applications: applications ?? [],
  };
}

export async function updateCandidateRaw(
  supabase: Client,
  id: string,
  patch: Database["public"]["Tables"]["candidates"]["Update"]
) {
  const { data, error } = await supabase.from("candidates").update(patch).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateApplicationStage(
  supabase: Client,
  applicationId: string,
  fields: Partial<Database["public"]["Tables"]["applications"]["Row"]>
) {
  const { data, error } = await supabase.from("applications").update(fields).eq("id", applicationId).select().single();
  if (error) throw error;
  return data;
}
