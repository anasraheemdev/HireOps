import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetcher";
import type { AnalyticsSnapshot } from "@/lib/services/analytics.service";

export type { AnalyticsSnapshot };

export function useAnalyticsQuery() {
  return useQuery({
    queryKey: ["analytics"],
    queryFn: () => apiFetch<AnalyticsSnapshot>("/api/analytics"),
    refetchInterval: 60000,
  });
}
