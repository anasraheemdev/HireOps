import type { ApplicationStage, JobStatus, JobType, JobPriority, LanguageLevel } from "@/lib/supabase/database.types";
import type { PipelineStage } from "@/lib/types";

export const stageDbToDisplay: Record<ApplicationStage, PipelineStage> = {
  applied: "Applied",
  screening: "Screening",
  assessment: "Assessment",
  assessment_pending: "Assessment Pending",
  assessment_completed: "Assessment Completed",
  ai_interview: "AI Interview",
  interview_pending: "Interview Pending",
  interview_completed: "Interview Completed",
  under_hr_review: "Under HR Review",
  shortlisted: "Shortlisted",
  final_interview: "Final Interview",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
};

export const stageDisplayToDb: Record<PipelineStage, ApplicationStage> = {
  Applied: "applied",
  Screening: "screening",
  Assessment: "assessment",
  "Assessment Pending": "assessment_pending",
  "Assessment Completed": "assessment_completed",
  "AI Interview": "ai_interview",
  "Interview Pending": "interview_pending",
  "Interview Completed": "interview_completed",
  "Under HR Review": "under_hr_review",
  Shortlisted: "shortlisted",
  "Final Interview": "final_interview",
  Offer: "offer",
  Hired: "hired",
  Rejected: "rejected",
};

export const jobStatusDbToDisplay: Record<JobStatus, "Open" | "Closed" | "Draft" | "On Hold"> = {
  open: "Open",
  closed: "Closed",
  draft: "Draft",
  on_hold: "On Hold",
};

export const jobStatusDisplayToDb: Record<string, JobStatus> = {
  Open: "open",
  Closed: "closed",
  Draft: "draft",
  "On Hold": "on_hold",
};

export const jobTypeDbToDisplay: Record<JobType, "Full-time" | "Part-time" | "Contract"> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
};

export const jobPriorityDbToDisplay: Record<JobPriority, "Critical" | "High" | "Medium" | "Low"> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const languageLevelDbToDisplay: Record<LanguageLevel, "Native" | "Fluent" | "Professional" | "Conversational" | "Basic"> = {
  native: "Native",
  fluent: "Fluent",
  professional: "Professional",
  conversational: "Conversational",
  basic: "Basic",
};
