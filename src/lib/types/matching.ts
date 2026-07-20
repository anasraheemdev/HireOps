import type { Candidate, Job } from "@/lib/types";

export type MatchResult = Candidate & {
  similarity: number;
  matchedSkills: string[];
  missingSkills: string[];
};

export type MatchReasoning = {
  matchedSkills: string[];
  missingSkills: string[];
  scoreBreakdown: {
    semantic: number;
    skills: number;
    experience: number;
    overall: number;
  };
  reasoning: string[];
  recommendation: string;
};

export type JobMatchesPayload = {
  job: Job;
  matches: MatchResult[];
};
