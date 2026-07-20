import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetcher";

export type InterviewSessionRow = {
  id: string;
  status: string;
  mode: string;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  candidates?: { full_name: string; avatar_color: string } | { full_name: string; avatar_color: string }[] | null;
  jobs?: { title: string } | { title: string }[] | null;
};

export function useInterviewsQuery() {
  return useQuery({
    queryKey: ["interviews"],
    queryFn: () => apiFetch<InterviewSessionRow[]>("/api/interviews"),
    refetchInterval: 60000,
  });
}
