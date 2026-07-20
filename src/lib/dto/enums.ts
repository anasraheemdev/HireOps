import type { ApplicationStage, JobStatus, JobType, JobPriority, LanguageLevel } from "@/lib/supabase/database.types";
import type { PipelineStage } from "@/lib/types";

export const stageDbToDisplay: Record<ApplicationStage, PipelineStage> = {
  applied: "Applied",
  screening: "Screening",
  assessment: "Assessment",
  ai_interview: "AI Interview",
  final_interview: "Final Interview",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
};

export const stageDisplayToDb: Record<PipelineStage, ApplicationStage> = {
  Applied: "applied",
  Screening: "screening",
  Assessment: "assessment",
  "AI Interview": "ai_interview",
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
