import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetcher";
import type { Candidate } from "@/lib/types";
import type { UpdateCandidateInput } from "@/lib/services/candidates.service";

export function useCandidatesQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["candidates"],
    queryFn: () => apiFetch<Candidate[]>("/api/candidates"),
    enabled: options?.enabled ?? true,
  });
}

export function useCandidateQuery(id: string) {
  return useQuery({
    queryKey: ["candidates", id],
    queryFn: () => apiFetch<Candidate>(`/api/candidates/${id}`),
    enabled: !!id,
  });
}

export function useUpdateCandidateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCandidateInput }) =>
      apiFetch<Candidate>(`/api/candidates/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["candidates", variables.id] });
    },
  });
}

export function useApplicationDecisionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      applicationId,
      decision,
      candidateId,
      jobId,
    }: {
      applicationId?: string;
      decision: "shortlist" | "reject";
      candidateId?: string;
      jobId?: string;
    }) => {
      if (applicationId) {
        return apiFetch(`/api/applications/${applicationId}/decision`, {
          method: "POST",
          body: JSON.stringify({ decision }),
        });
      }
      if (candidateId && jobId) {
        return apiFetch(`/api/applications/match/decision`, {
          method: "POST",
          body: JSON.stringify({ decision, candidateId, jobId }),
        });
      }
      throw new Error("applicationId or candidateId+jobId required");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["job-matches"] });
    },
  });
}
