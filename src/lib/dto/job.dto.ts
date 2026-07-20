import type { Job } from "@/lib/types";
import { jobStatusDbToDisplay, jobTypeDbToDisplay, jobPriorityDbToDisplay } from "./enums";
import type { Database } from "@/lib/supabase/database.types";

type JobRow = Database["public"]["Tables"]["jobs"]["Row"] & { departments?: { name: string } | null };
type PipelineStats = Database["public"]["Views"]["v_job_pipeline_stats"]["Row"];

export function mapJob(job: JobRow, stats?: PipelineStats): Job {
  const salaryRange =
    job.salary_min && job.salary_max
      ? `${job.salary_currency} ${job.salary_min.toLocaleString()} – ${job.salary_max.toLocaleString()} / mo`
      : "Competitive, based on experience";

  return {
    id: job.id,
    title: job.title,
    department: job.departments?.name ?? "—",
    location: job.location,
    type: jobTypeDbToDisplay[job.employment_type],
    level: job.level ?? "",
    status: jobStatusDbToDisplay[job.status],
    postedDate: job.posted_date,
    closingDate: job.closing_date ?? "",
    applicants: stats?.applicant_count ?? 0,
    shortlisted: stats?.shortlisted_count ?? 0,
    inInterview: stats?.interviewing_count ?? 0,
    offers: stats?.offer_count ?? 0,
    hired: stats?.hired_count ?? 0,
    salaryRange,
    description: job.description ?? "",
    requiredSkills: job.required_skills,
    niceToHave: job.nice_to_have_skills,
    minExperience: job.min_experience_years,
    hiringManager: "—",
    priority: jobPriorityDbToDisplay[job.priority],
  };
}
