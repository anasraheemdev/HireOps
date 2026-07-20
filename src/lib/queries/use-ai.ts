import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, FetchError } from "@/lib/api/fetcher";
import type { Candidate } from "@/lib/types";
import type { MatchReasoning, JobMatchesPayload } from "@/lib/types/matching";
import type { ParsedResume } from "@/lib/ai/resume-schema";

export type CreateCandidateInput = {
  fullName: string;
  headline?: string | null;
  email: string;
  phone?: string | null;
  location?: string | null;
  nationality?: string | null;
  experienceYears?: number;
  skills?: string[];
  languages?: { name: string; level: "native" | "fluent" | "professional" | "conversational" | "basic" }[];
  certifications?: { name: string; issuer?: string | null; year?: string | null }[];
  experience?: {
    role: string;
    company: string;
    location?: string | null;
    period?: string | null;
    description?: string | null;
  }[];
  education?: { degree: string; institution: string; period?: string | null; grade?: string | null }[];
  jobId?: string | null;
  resumeText?: string | null;
  resumeFilePath?: string | null;
  source?: string;
};

export type ParseResumeResponse = ParsedResume & {
  confidence: number;
  warnings: string[];
  resumeText: string;
  resumeFilePath: string;
  fileName: string;
};

export function useParseResumeMutation() {
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/candidates/parse-resume", { method: "POST", body: form });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new FetchError(res.status, json.error ?? "Resume parse failed");
      return json.data as ParseResumeResponse;
    },
  });
}

export function useCreateCandidateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCandidateInput) =>
      apiFetch<Candidate>("/api/candidates", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["job-matches"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useJobMatchesQuery(jobId: string | undefined) {
  return useQuery({
    queryKey: ["job-matches", jobId],
    queryFn: () => apiFetch<JobMatchesPayload>(`/api/jobs/${jobId}/matches`),
    enabled: !!jobId,
    staleTime: 30_000,
  });
}

export function useExplainMatchMutation() {
  return useMutation({
    mutationFn: ({ jobId, candidateId }: { jobId: string; candidateId: string }) =>
      apiFetch<MatchReasoning>(`/api/jobs/${jobId}/explain-match`, {
        method: "POST",
        body: JSON.stringify({ candidateId }),
      }),
  });
}

export type AssistantChatMessage = { role: "user" | "assistant"; content: string };

export type AssistantResponse = {
  reply: string;
  suggestions: string[];
};

export function useAssistantMutation() {
  return useMutation({
    mutationFn: (input: { message: string; history?: AssistantChatMessage[] }) =>
      apiFetch<AssistantResponse>("/api/ai/assistant", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  });
}
