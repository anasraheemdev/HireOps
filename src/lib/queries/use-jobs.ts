import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetcher";
import type { Job } from "@/lib/types";
import type { CreateJobInput, UpdateJobInput } from "@/lib/services/jobs.service";

export function useJobsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: () => apiFetch<Job[]>("/api/jobs"),
    enabled: options?.enabled ?? true,
  });
}

export function useCreateJobMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateJobInput) =>
      apiFetch<Job>("/api/jobs", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

export function useUpdateJobMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateJobInput }) =>
      apiFetch<Job>(`/api/jobs/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
