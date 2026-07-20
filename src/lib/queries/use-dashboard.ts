import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetcher";
import type { DashboardSnapshot } from "@/lib/services/dashboard.service";

export type { DashboardSnapshot };

export function useDashboardQuery() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch<DashboardSnapshot>("/api/dashboard"),
    refetchInterval: 60000,
  });
}
