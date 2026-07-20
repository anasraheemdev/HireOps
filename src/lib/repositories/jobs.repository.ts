import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;
type JobInsert = Database["public"]["Tables"]["jobs"]["Insert"];

export async function listJobsRaw(supabase: Client) {
  const [{ data: jobs, error }, { data: stats, error: statsError }] = await Promise.all([
    supabase.from("jobs").select("*, departments ( name )").order("created_at", { ascending: false }),
    supabase.from("v_job_pipeline_stats").select("*"),
  ]);
  if (error) throw error;
  if (statsError) throw statsError;
  return { jobs: jobs ?? [], stats: stats ?? [] };
}

export async function getJobByIdRaw(supabase: Client, id: string) {
  const { data, error } = await supabase.from("jobs").select("*, departments ( name )").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createJobRaw(supabase: Client, job: JobInsert) {
  const { data, error } = await supabase.from("jobs").insert(job).select().single();
  if (error) throw error;
  return data;
}

export async function updateJobRaw(
  supabase: Client,
  id: string,
  patch: Database["public"]["Tables"]["jobs"]["Update"]
) {
  const { data, error } = await supabase
    .from("jobs")
    .update(patch)
    .eq("id", id)
    .select("*, departments ( name )")
    .single();
  if (error) throw error;
  return data;
}

export async function listDepartmentsRaw(supabase: Client) {
  const { data, error } = await supabase.from("departments").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}
