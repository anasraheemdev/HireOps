import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetcher";

export function useCandidateHomeQuery() {
  return useQuery({
    queryKey: ["candidate-home"],
    queryFn: () => apiFetch<Record<string, unknown>>("/api/candidate/home"),
  });
}

export function useMyApplicationsQuery() {
  return useQuery({
    queryKey: ["applications", "mine"],
    queryFn: () => apiFetch<Record<string, unknown>[]>("/api/applications?mine=1"),
  });
}

export function useApplyMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) =>
      apiFetch("/api/applications", { method: "POST", body: JSON.stringify({ jobId }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      qc.invalidateQueries({ queryKey: ["candidate-home"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMeQuery() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () =>
      apiFetch<{ profile: Record<string, unknown>; candidate: Record<string, unknown> | null }>("/api/me"),
  });
}

export function useUpdateMeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/me", { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });
}

export function useNotificationsQuery() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiFetch<Record<string, unknown>[]>("/api/notifications"),
    refetchInterval: 30000,
  });
}

export function useMarkNotificationMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch("/api/notifications", { method: "PATCH", body: JSON.stringify({ id, isRead: true }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMyInterviewsQuery() {
  return useQuery({
    queryKey: ["interviews", "mine"],
    queryFn: () => apiFetch<Record<string, unknown>[]>("/api/interviews?mine=1"),
  });
}

export function useOffersQuery() {
  return useQuery({
    queryKey: ["offers"],
    queryFn: () => apiFetch<Record<string, unknown>[]>("/api/offers"),
  });
}

export function useOfferRespondMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { offerId: string; status: "accepted" | "declined" }) =>
      apiFetch("/api/offers", { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["offers"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useSavedJobsQuery() {
  return useQuery({
    queryKey: ["saved-jobs"],
    queryFn: () => apiFetch<Record<string, unknown>[]>("/api/saved-jobs"),
  });
}

export function useSaveJobMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) =>
      apiFetch("/api/saved-jobs", { method: "POST", body: JSON.stringify({ jobId }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-jobs"] }),
  });
}

export function useUnsaveJobMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => apiFetch(`/api/saved-jobs?jobId=${jobId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-jobs"] }),
  });
}

export function useDocumentsQuery() {
  return useQuery({
    queryKey: ["candidate-documents"],
    queryFn: () => apiFetch<Record<string, unknown>[]>("/api/candidate/documents"),
  });
}

export function useMessagesQuery() {
  return useQuery({
    queryKey: ["candidate-messages"],
    queryFn: () => apiFetch<Record<string, unknown>[]>("/api/candidate/messages"),
  });
}

export function useHelpQuery() {
  return useQuery({
    queryKey: ["help"],
    queryFn: () => apiFetch<Record<string, unknown>[]>("/api/help"),
  });
}

export function useMyAssessmentsQuery() {
  return useQuery({
    queryKey: ["candidate-assessments"],
    queryFn: () => apiFetch<Record<string, unknown>[]>("/api/assessments?mine=1"),
  });
}
