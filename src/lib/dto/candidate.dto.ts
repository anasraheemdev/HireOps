import type { Candidate } from "@/lib/types";
import { stageDbToDisplay, languageLevelDbToDisplay } from "./enums";
import type { Database } from "@/lib/supabase/database.types";

type CandidateRow = Database["public"]["Tables"]["candidates"]["Row"];
type ExperienceRow = Database["public"]["Tables"]["candidate_experience"]["Row"];
type EducationRow = Database["public"]["Tables"]["candidate_education"]["Row"];
type CertificationRow = Database["public"]["Tables"]["candidate_certifications"]["Row"];
type LanguageRow = Database["public"]["Tables"]["candidate_languages"]["Row"];
type ApplicationRow = Database["public"]["Tables"]["applications"]["Row"];

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(d: string | null) {
  if (!d) return "Present";
  return new Date(d).getFullYear().toString();
}

export function mapCandidateListItem(
  candidate: CandidateRow & { candidate_skills: { skill: string }[] },
  application:
    | (Database["public"]["Views"]["v_candidate_latest_application"]["Row"] & {
        jobs?: { department_id: string | null; departments?: { name: string } | null } | null;
      })
    | undefined
): Candidate {
  const skills = candidate.candidate_skills?.map((s) => s.skill) ?? [];
  return {
    id: candidate.id,
    applicationId: application?.application_id,
    name: candidate.full_name,
    nameAr: candidate.full_name_ar ?? undefined,
    initials: initialsOf(candidate.full_name),
    avatarColor: candidate.avatar_color,
    title: candidate.headline ?? "",
    location: candidate.location ?? "",
    nationality: candidate.nationality ?? "",
    email: candidate.email,
    phone: candidate.phone ?? "",
    appliedFor: application?.job_title ?? "—",
    jobId: application?.job_id ?? "",
    department: application?.jobs?.departments?.name ?? "—",
    stage: application ? stageDbToDisplay[application.stage] : "Applied",
    matchScore: application?.match_score ? Math.round(Number(application.match_score)) : 0,
    aiScore: application?.ai_score ? Math.round(Number(application.ai_score)) : 0,
    confidenceScore: application?.confidence_score ? Math.round(Number(application.confidence_score)) : 0,
    experienceYears: Number(candidate.experience_years),
    skills,
    missingSkills: [],
    languages: [],
    experience: [],
    education: [],
    certifications: [],
    strengths: [],
    weaknesses: [],
    aiRecommendation: "",
    appliedDate: application?.applied_date ?? candidate.created_at.slice(0, 10),
    tags: [],
    shortlisted: application?.shortlisted ?? false,
    source: candidate.source ?? "",
  };
}

export function mapCandidateDetail(data: {
  candidate: CandidateRow;
  experience: ExperienceRow[];
  education: EducationRow[];
  certifications: CertificationRow[];
  languages: LanguageRow[];
  skills: { skill: string }[];
  applications: (ApplicationRow & {
    jobs?: { id: string; title: string; department_id: string | null; required_skills: string[]; departments?: { name: string } | null } | null;
  })[];
}): Candidate {
  const { candidate, experience, education, certifications, languages, skills, applications } = data;
  const primaryApp = applications[0];
  const requiredSkills = primaryApp?.jobs?.required_skills ?? [];
  const candidateSkillSet = new Set(skills.map((s) => s.skill));
  const missingSkills = requiredSkills.filter((s) => !candidateSkillSet.has(s));

  return {
    id: candidate.id,
    applicationId: primaryApp?.id,
    name: candidate.full_name,
    nameAr: candidate.full_name_ar ?? undefined,
    initials: initialsOf(candidate.full_name),
    avatarColor: candidate.avatar_color,
    title: candidate.headline ?? "",
    location: candidate.location ?? "",
    nationality: candidate.nationality ?? "",
    email: candidate.email,
    phone: candidate.phone ?? "",
    appliedFor: primaryApp?.jobs?.title ?? "—",
    jobId: primaryApp?.jobs?.id ?? "",
    department: primaryApp?.jobs?.departments?.name ?? "—",
    stage: primaryApp ? stageDbToDisplay[primaryApp.stage] : "Applied",
    matchScore: primaryApp?.match_score ? Math.round(Number(primaryApp.match_score)) : 0,
    aiScore: primaryApp?.ai_score ? Math.round(Number(primaryApp.ai_score)) : 0,
    confidenceScore: primaryApp?.confidence_score ? Math.round(Number(primaryApp.confidence_score)) : 0,
    experienceYears: Number(candidate.experience_years),
    skills: skills.map((s) => s.skill),
    missingSkills,
    languages: languages.map((l) => ({ name: l.name, level: languageLevelDbToDisplay[l.level] })),
    experience: experience.map((e) => ({
      role: e.role,
      company: e.company,
      start: e.start_date ? new Date(e.start_date).getFullYear().toString() : "",
      end: formatDate(e.end_date),
      location: e.location ?? "",
      description: e.description ?? "",
    })),
    education: education.map((e) => ({
      degree: e.degree,
      institution: e.institution,
      start: e.start_date ? new Date(e.start_date).getFullYear().toString() : "",
      end: e.end_date ? new Date(e.end_date).getFullYear().toString() : "",
      grade: e.grade ?? undefined,
    })),
    certifications: certifications.map((c) => ({ name: c.name, issuer: c.issuer ?? "", year: c.year ?? "" })),
    strengths: primaryApp?.strengths ?? [],
    weaknesses: primaryApp?.weaknesses ?? [],
    aiRecommendation: primaryApp?.ai_recommendation ?? "No AI evaluation on file yet.",
    appliedDate: primaryApp?.applied_date ?? candidate.created_at.slice(0, 10),
    tags: primaryApp?.tags ?? [],
    shortlisted: primaryApp?.shortlisted ?? false,
    source: candidate.source ?? "",
  };
}
