import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetcher";
import type { Candidate } from "@/lib/types";
import type { UpdateCandidateInput } from "@/lib/services/candidates.service";
import type { HrCandidateReviewData } from "@/lib/services/hr-candidate-review.service";

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

export function useHrCandidateReviewQuery(candidateId: string, applicationId?: string | null) {
  return useQuery({
    queryKey: ["hr-candidate-review", candidateId, applicationId || "latest"],
    queryFn: () => {
      const url = applicationId
        ? `/api/hr/candidates/${candidateId}?applicationId=${encodeURIComponent(applicationId)}`
        : `/api/hr/candidates/${candidateId}`;
      return apiFetch<HrCandidateReviewData>(url);
    },
    enabled: !!candidateId,
  });
}

export function useSubmitHiringDecisionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      applicationId,
      decision,
      candidateMessage,
      internalNotes,
      rejectionReason,
    }: {
      applicationId: string;
      decision: "select" | "reject";
      candidateMessage?: string;
      internalNotes?: string;
      rejectionReason?: string;
    }) =>
      apiFetch(`/api/hr/applications/${applicationId}/decision`, {
        method: "POST",
        body: JSON.stringify({ decision, candidateMessage, internalNotes, rejectionReason }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["hr-candidate-review"] });
      queryClient.invalidateQueries({ queryKey: ["job-matches"] });
    },
  });
}

export function useScheduleHumanInterviewMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      applicationId,
      scheduledAt,
      timezone,
      interviewType,
      interviewerName,
      interviewerEmail,
      meetingLink,
      location,
      candidateInstructions,
      internalNotes,
    }: {
      applicationId: string;
      scheduledAt: string;
      timezone?: string;
      interviewType: "in_person" | "video" | "phone";
      interviewerName: string;
      interviewerEmail?: string;
      meetingLink?: string;
      location?: string;
      candidateInstructions?: string;
      internalNotes?: string;
    }) =>
      apiFetch(`/api/hr/applications/${applicationId}/human-interview`, {
        method: "POST",
        body: JSON.stringify({
          scheduledAt,
          timezone,
          interviewType,
          interviewerName,
          interviewerEmail,
          meetingLink,
          location,
          candidateInstructions,
          internalNotes,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["hr-candidate-review"] });
    },
  });
}
