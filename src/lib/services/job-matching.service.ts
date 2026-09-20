import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { normalizeSkill, percent } from "@/lib/scoring";

type Client = SupabaseClient<Database>;

export interface DetailedMatchResult {
  jobId: string;
  candidateId: string;
  overallScore: number; // 0 - 100
  semanticScore: number;
  requiredSkillsScore: number;
  preferredSkillsScore: number;
  experienceScore: number;
  educationScore: number;
  matchedRequiredSkills: string[];
  missingRequiredSkills: string[];
  matchedPreferredSkills: string[];
  missingPreferredSkills: string[];
  experienceComparison: {
    candidateYears: number;
    requiredYears: number;
    isMet: boolean;
  };
  explanation: string;
  reasoningBullets: string[];
}

export interface CandidateProfileInput {
  id: string;
  organizationId: string;
  fullName: string;
  headline?: string | null;
  summary?: string | null;
  experienceYears: number;
  skills: string[];
  education?: { degree: string; institution: string }[];
  certifications?: { name: string; issuer?: string | null }[];
  resumeText?: string | null;
}

export interface JobInput {
  id: string;
  organizationId: string;
  title: string;
  description?: string | null;
  department?: string | null;
  location?: string | null;
  employmentType?: string | null;
  level?: string | null;
  status: string;
  requiredSkills: string[];
  niceToHaveSkills?: string[];
  minExperienceYears: number;
}

/**
 * Calculates a deterministic, unbiased job relevance match score between 0 and 100.
 * Strictly uses job-relevant evidence: skills, experience, education, certifications, and semantic text fit.
 * Does NOT evaluate or infer age, gender, ethnicity, religion, disability, or protected characteristics.
 * Scores are fit indicators, not hiring probabilities.
 */
export function calculateDetailedJobMatch(
  candidate: CandidateProfileInput,
  job: JobInput,
  similarityOverride?: number | null
): DetailedMatchResult {
  const candidateSkillsSet = new Set(candidate.skills.map(normalizeSkill));

  // 1. Required Skills (30% weight)
  const normRequired = [...new Set(job.requiredSkills.map(normalizeSkill))].filter(Boolean);
  const matchedRequired: string[] = [];
  const missingRequired: string[] = [];

  for (const reqSkill of normRequired) {
    const rawOriginal = job.requiredSkills.find((s) => normalizeSkill(s) === reqSkill) || reqSkill;
    if (candidateSkillsSet.has(reqSkill)) {
      matchedRequired.push(rawOriginal);
    } else {
      missingRequired.push(rawOriginal);
    }
  }

  const requiredCount = normRequired.length;
  const requiredSkillsScore = requiredCount > 0
    ? percent((matchedRequired.length / requiredCount) * 100)
    : 100;

  // 2. Preferred / Nice-to-have Skills (10% weight)
  const normPreferred = [...new Set((job.niceToHaveSkills || []).map(normalizeSkill))].filter(Boolean);
  const matchedPreferred: string[] = [];
  const missingPreferred: string[] = [];

  for (const prefSkill of normPreferred) {
    const rawOriginal = (job.niceToHaveSkills || []).find((s) => normalizeSkill(s) === prefSkill) || prefSkill;
    if (candidateSkillsSet.has(prefSkill)) {
      matchedPreferred.push(rawOriginal);
    } else {
      missingPreferred.push(rawOriginal);
    }
  }

  const preferredCount = normPreferred.length;
  const preferredSkillsScore = preferredCount > 0
    ? percent((matchedPreferred.length / preferredCount) * 100)
    : 100;

  // 3. Experience Comparison (15% weight)
  const candidateYears = Math.max(0, candidate.experienceYears || 0);
  const requiredYears = Math.max(0, job.minExperienceYears || 0);
  const isExpMet = requiredYears === 0 || candidateYears >= requiredYears;
  const experienceScore = requiredYears > 0
    ? percent(Math.min(1.0, candidateYears / requiredYears) * 100)
    : 100;

  // 4. Education & Certification Alignment (10% weight)
  let educationScore = 100;
  const jobTextLower = `${job.title} ${job.description || ""}`.toLowerCase();
  const explicitDegreeRequired = /bachelor|master|bsc|msc|phd|degree|diploma/i.test(jobTextLower);
  const explicitCertRequired = /certification|certified|pmp|aws|cpa|cissp/i.test(jobTextLower);

  if (explicitDegreeRequired || explicitCertRequired) {
    let metEdu = false;
    let metCert = false;

    if (explicitDegreeRequired) {
      metEdu = (candidate.education || []).some((e) =>
        /bachelor|master|bsc|msc|phd|degree|diploma/i.test(`${e.degree} ${e.institution}`)
      );
    } else {
      metEdu = true; // Not required
    }

    if (explicitCertRequired) {
      metCert = (candidate.certifications || []).some((c) =>
        /certification|certified|pmp|aws|cpa|cissp/i.test(`${c.name} ${c.issuer || ""}`)
      );
    } else {
      metCert = true; // Not required
    }

    if (metEdu && metCert) educationScore = 100;
    else if (metEdu || metCert) educationScore = 75;
    else educationScore = 50;
  }

  // 5. Semantic Similarity (35% weight)
  let semanticScore = 50;
  if (typeof similarityOverride === "number" && !Number.isNaN(similarityOverride)) {
    semanticScore = percent(similarityOverride);
  } else {
    // Heuristic TF-IDF / Keyword overlap for semantic fit fallback
    const candFullText = `${candidate.headline || ""} ${candidate.summary || ""} ${candidate.skills.join(" ")} ${candidate.resumeText || ""}`.toLowerCase();
    const jobKeywords = `${job.title} ${job.description || ""} ${job.requiredSkills.join(" ")}`.toLowerCase().split(/[\s,.;:-]+/).filter((w) => w.length > 3);
    const uniqueKeywords = [...new Set(jobKeywords)];

    if (uniqueKeywords.length > 0) {
      const matchedKw = uniqueKeywords.filter((kw) => candFullText.includes(kw));
      semanticScore = percent((matchedKw.length / uniqueKeywords.length) * 100);
    }
  }

  // Calculate Weighted Overall Score
  // Weights: Semantic 35%, Required Skills 30%, Preferred Skills 10%, Experience 15%, Education 10%
  let wSemantic = 0.35;
  let wRequired = 0.30;
  let wPreferred = 0.10;
  let wExp = 0.15;
  const wEdu = 0.10;

  // Redistribute if job has no preferred skills
  if (preferredCount === 0) {
    wRequired += 0.05;
    wSemantic += 0.05;
    wPreferred = 0;
  }

  // Redistribute if job has no required skills
  if (requiredCount === 0) {
    wSemantic += 0.20;
    wExp += 0.10;
    wRequired = 0;
  }

  const rawOverall =
    semanticScore * wSemantic +
    requiredSkillsScore * wRequired +
    preferredSkillsScore * wPreferred +
    experienceScore * wExp +
    educationScore * wEdu;

  const overallScore = Math.min(100, Math.max(0, Math.round(rawOverall)));

  // Generate Reasoning & Explanation
  const reasoningBullets: string[] = [];
  reasoningBullets.push(`Semantic profile fit score of ${semanticScore}% against the role description.`);
  if (requiredCount > 0) {
    reasoningBullets.push(`Matched ${matchedRequired.length}/${requiredCount} required skills (${matchedRequired.slice(0, 4).join(", ") || "none"}).`);
  }
  if (missingRequired.length > 0) {
    reasoningBullets.push(`Missing required skills: ${missingRequired.slice(0, 4).join(", ")}.`);
  }
  reasoningBullets.push(
    isExpMet
      ? `Experience requirement met (${candidateYears} yrs candidate vs ${requiredYears} yrs min required).`
      : `Experience gap: ${candidateYears} yrs candidate vs ${requiredYears} yrs min required.`
  );

  const explanation =
    overallScore >= 75
      ? "Strong role alignment with high skill coverage and experience fit."
      : overallScore >= 55
      ? "Moderate role alignment with acceptable skill overlap."
      : "Lower role alignment due to missing required skills or experience gaps.";

  return {
    jobId: job.id,
    candidateId: candidate.id,
    overallScore,
    semanticScore,
    requiredSkillsScore,
    preferredSkillsScore,
    experienceScore,
    educationScore,
    matchedRequiredSkills: matchedRequired,
    missingRequiredSkills: missingRequired,
    matchedPreferredSkills: matchedPreferred,
    missingPreferredSkills: missingPreferred,
    experienceComparison: {
      candidateYears,
      requiredYears,
      isMet: isExpMet,
    },
    explanation,
    reasoningBullets,
  };
}

/**
 * Lists recommended jobs for a candidate within their organization/tenant,
 * filtered by status='open' and relevance threshold (default 55).
 */
export async function getCandidateJobRecommendations(
  supabase: Client,
  candidateId: string,
  minThreshold = 55
) {
  // 1. Fetch Candidate Profile & Child Records
  const { data: cand, error: candErr } = await supabase
    .from("candidates")
    .select("id, organization_id, full_name, headline, summary, experience_years, resume_text, is_confirmed")
    .eq("id", candidateId)
    .single();

  if (candErr || !cand) {
    throw new Error("Candidate profile not found");
  }

  // Fetch candidate skills, education, certifications
  const [skillsRes, eduRes, certRes, appRes] = await Promise.all([
    supabase.from("candidate_skills").select("skill").eq("candidate_id", candidateId),
    supabase.from("candidate_education").select("degree, institution").eq("candidate_id", candidateId),
    supabase.from("candidate_certifications").select("name, issuer").eq("candidate_id", candidateId),
    supabase.from("applications").select("id, job_id, stage, applied_date").eq("candidate_id", candidateId),
  ]);

  const candidateSkills = (skillsRes.data || []).map((s) => s.skill);
  const candidateEdu = eduRes.data || [];
  const candidateCerts = certRes.data || [];
  const existingApplications = appRes.data || [];
  const appliedJobIds = new Set(existingApplications.map((a) => a.job_id));
  const applicationMap = new Map(existingApplications.map((a) => [a.job_id, a]));

  const candidateInput: CandidateProfileInput = {
    id: cand.id,
    organizationId: cand.organization_id,
    fullName: cand.full_name,
    headline: cand.headline,
    summary: cand.summary,
    experienceYears: Number(cand.experience_years || 0),
    skills: candidateSkills,
    education: candidateEdu,
    certifications: candidateCerts,
    resumeText: cand.resume_text,
  };

  // 2. Fetch ALL open jobs strictly for candidate's organization_id
  const { data: openJobs, error: jobsErr } = await supabase
    .from("jobs")
    .select("*, departments ( name )")
    .eq("organization_id", cand.organization_id)
    .eq("status", "open")
    .order("posted_date", { ascending: false });

  if (jobsErr) throw jobsErr;

  // 3. Compute detailed match scores for each open job
  const recommendations = [];
  const appliedJobsList = [];

  for (const rawJob of openJobs || []) {
    const jobInput: JobInput = {
      id: rawJob.id,
      organizationId: rawJob.organization_id,
      title: rawJob.title,
      description: rawJob.description,
      department: Array.isArray(rawJob.departments) ? rawJob.departments[0]?.name : (rawJob.departments as { name?: string })?.name,
      location: rawJob.location,
      employmentType: rawJob.employment_type,
      level: rawJob.level,
      status: rawJob.status,
      requiredSkills: rawJob.required_skills || [],
      niceToHaveSkills: rawJob.nice_to_have_skills || [],
      minExperienceYears: Number(rawJob.min_experience_years || 0),
    };

    const matchDetail = calculateDetailedJobMatch(candidateInput, jobInput);
    const existingApp = applicationMap.get(rawJob.id);
    const isApplied = appliedJobIds.has(rawJob.id);

    const formattedJobItem = {
      ...jobInput,
      matchDetail,
      relevanceScore: matchDetail.overallScore,
      isApplied,
      applicationId: existingApp?.id || null,
      appliedDate: existingApp?.applied_date || null,
      stage: existingApp?.stage || null,
    };

    if (isApplied) {
      appliedJobsList.push(formattedJobItem);
    } else if (matchDetail.overallScore >= minThreshold) {
      recommendations.push(formattedJobItem);
    }
  }

  // Sort recommendations by relevance score descending
  recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore);
  appliedJobsList.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return {
    candidateId,
    organizationId: cand.organization_id,
    isConfirmed: Boolean(cand.is_confirmed),
    minThreshold,
    recommendations,
    appliedJobs: appliedJobsList,
    totalOpenJobsCount: (openJobs || []).length,
  };
}
