import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";
import { listJobsRaw, getJobByIdRaw, createJobRaw, updateJobRaw, listDepartmentsRaw } from "@/lib/repositories/jobs.repository";
import { mapJob } from "@/lib/dto/job.dto";
import { jobStatusDisplayToDb } from "@/lib/dto/enums";
import type { Job } from "@/lib/types";

type Client = SupabaseClient<Database>;

/** Parses free-text salary ranges like "OMR 1,800 – 2,500 / mo" into structured min/max/currency. */
export function parseSalaryRange(input?: string | null): { min: number; max: number; currency: string } | null {
  if (!input) return null;
  const match = input.match(/([A-Za-z]{2,5})?\s*([\d,.]+)\s*(?:[-–—]|to)+\s*([\d,.]+)/i);
  if (!match) return null;
  const min = Number(match[2].replace(/,/g, ""));
  const max = Number(match[3].replace(/,/g, ""));
  if (Number.isNaN(min) || Number.isNaN(max)) return null;
  return { min, max, currency: (match[1] || "OMR").toUpperCase() };
}

export async function listJobs(supabase: Client): Promise<Job[]> {
  const { jobs, stats } = await listJobsRaw(supabase);
  const statsByJobId = new Map(stats.map((s) => [s.job_id, s]));
  return jobs.map((j) => mapJob(j, statsByJobId.get(j.id)));
}

export async function getJobById(supabase: Client, id: string): Promise<Job | null> {
  const job = await getJobByIdRaw(supabase, id);
  if (!job) return null;
  return mapJob(job);
}

export const createJobSchema = z.object({
  title: z.string().min(3),
  department: z.string().min(1),
  location: z.string().min(2).default("Muscat, Oman"),
  type: z.enum(["Full-time", "Part-time", "Contract"]),
  level: z.string().min(1),
  minExperience: z.coerce.number().min(0).max(30),
  salaryRange: z.string().optional(),
  description: z.string().min(10),
  requiredSkills: z.string().min(2),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;

const typeToDb = { "Full-time": "full_time", "Part-time": "part_time", Contract: "contract" } as const;

export async function createJob(
  supabase: Client,
  organizationId: string,
  createdBy: string,
  input: CreateJobInput
): Promise<Job> {
  const departments = await listDepartmentsRaw(supabase);
  const dept = departments.find((d) => d.name === input.department);

  const salary = parseSalaryRange(input.salaryRange);

  const job = await createJobRaw(supabase, {
    organization_id: organizationId,
    department_id: dept?.id ?? null,
    title: input.title,
    location: input.location,
    employment_type: typeToDb[input.type],
    level: input.level,
    status: jobStatusDisplayToDb["Draft"],
    min_experience_years: input.minExperience,
    description: input.description,
    required_skills: input.requiredSkills.split(",").map((s) => s.trim()).filter(Boolean),
    created_by: createdBy,
    ...(salary ? { salary_min: salary.min, salary_max: salary.max, salary_currency: salary.currency } : {}),
  });

  try {
    const { buildJobEmbeddingText, embedAndStoreJob } = await import("@/lib/services/embeddings.service");
    await embedAndStoreJob(
      supabase,
      job.id,
      buildJobEmbeddingText({
        title: job.title,
        description: job.description,
        requiredSkills: job.required_skills,
        niceToHaveSkills: job.nice_to_have_skills,
        minExperienceYears: job.min_experience_years,
        level: job.level,
        location: job.location,
      })
    );
  } catch (err) {
    console.error("Failed to embed new job:", err);
  }

  return mapJob({ ...job, departments: dept ? { name: dept.name } : null });
}

export const updateJobSchema = z.object({
  title: z.string().min(3).optional(),
  department: z.string().min(1).optional(),
  location: z.string().min(2).optional(),
  type: z.enum(["Full-time", "Part-time", "Contract"]).optional(),
  level: z.string().min(1).optional(),
  status: z.enum(["Open", "Closed", "Draft", "On Hold"]).optional(),
  minExperience: z.coerce.number().min(0).max(30).optional(),
  salaryRange: z.string().optional(),
  description: z.string().min(10).optional(),
  requiredSkills: z.string().min(2).optional(),
});

export type UpdateJobInput = z.infer<typeof updateJobSchema>;

export async function updateJob(supabase: Client, id: string, input: UpdateJobInput): Promise<Job> {
  const patch: Database["public"]["Tables"]["jobs"]["Update"] = {};

  if (input.title !== undefined) patch.title = input.title;
  if (input.location !== undefined) patch.location = input.location;
  if (input.type !== undefined) patch.employment_type = typeToDb[input.type];
  if (input.level !== undefined) patch.level = input.level;
  if (input.status !== undefined) patch.status = jobStatusDisplayToDb[input.status];
  if (input.minExperience !== undefined) patch.min_experience_years = input.minExperience;
  if (input.description !== undefined) patch.description = input.description;
  if (input.requiredSkills !== undefined) {
    patch.required_skills = input.requiredSkills.split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (input.salaryRange !== undefined) {
    const salary = parseSalaryRange(input.salaryRange);
    if (salary) {
      patch.salary_min = salary.min;
      patch.salary_max = salary.max;
      patch.salary_currency = salary.currency;
    }
  }
  if (input.department !== undefined) {
    const departments = await listDepartmentsRaw(supabase);
    const dept = departments.find((d) => d.name === input.department);
    patch.department_id = dept?.id ?? null;
  }

  const job = await updateJobRaw(supabase, id, patch);
  if ([input.title, input.description, input.requiredSkills, input.minExperience, input.level, input.location].some(v => v !== undefined)) {
    const { error } = await supabase.from("jobs").update({ embedding: null }).eq("id", id);
    if (error) throw error;
    const {error:scoreError}=await supabase.from('applications').update({match_score:null,ai_score:null,confidence_score:null,match_reasoning:null,ai_recommendation:null}).eq('job_id',id);
    if(scoreError) throw scoreError;
  }
  return mapJob(job);
}
