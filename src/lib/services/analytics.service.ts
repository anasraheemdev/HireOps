import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getDashboardSnapshot } from "@/lib/services/dashboard.service";

type Client = SupabaseClient<Database>;

export async function getAnalyticsSnapshot(supabase: Client) {
  const [dashboard, { data: hiredApps }, { data: offers }, { data: candidates }] = await Promise.all([
    getDashboardSnapshot(supabase),
    supabase.from("applications").select("applied_date, updated_at").eq("stage", "hired"),
    supabase.from("offers").select("status"),
    supabase.from("candidates").select("nationality"),
  ]);

  let timeToHireDays = 0;
  if (hiredApps && hiredApps.length > 0) {
    const totalDays = hiredApps.reduce((sum, app) => {
      if (!app.applied_date || !app.updated_at) return sum;
      const start = new Date(app.applied_date).getTime();
      const end = new Date(app.updated_at).getTime();
      const days = Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
      return sum + days;
    }, 0);
    timeToHireDays = Math.round(totalDays / hiredApps.length);
  }

  const totalOffers = offers?.length ?? 0;
  const acceptedOffers = offers?.filter((o) => o.status === "accepted").length ?? 0;
  const offerAcceptanceRate = totalOffers ? Math.round((acceptedOffers / totalOffers) * 100) : 0;

  const funnelConversion = dashboard.funnel.map((stage, i) => {
    const prev = i === 0 ? dashboard.funnel[0].count : dashboard.funnel[i - 1].count;
    const conversionRate = prev > 0 ? Math.round((stage.count / prev) * 1000) / 10 : 0;
    return { stage: stage.stage, count: stage.count, conversionRate: i === 0 ? 100 : conversionRate };
  });

  const nationalityCounts = new Map<string, number>();
  for (const c of candidates ?? []) {
    const key = c.nationality?.trim() || "Not specified";
    nationalityCounts.set(key, (nationalityCounts.get(key) ?? 0) + 1);
  }
  const totalCandidatesForDiversity = candidates?.length || 1;
  const nationalityDiversity = Array.from(nationalityCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([nationality, count]) => ({
      nationality,
      count,
      percentage: Math.round((count / totalCandidatesForDiversity) * 1000) / 10,
    }));

  return {
    timeToHireDays,
    offerAcceptanceRate,
    totalOffers,
    acceptedOffers,
    departmentBreakdown: dashboard.departmentBreakdown,
    applicationsTimeline: dashboard.applicationsTimeline,
    topSkillsDemand: dashboard.topSkillsDemand,
    funnelConversion,
    nationalityDiversity,
    totalCandidates: dashboard.kpis.totalCandidates,
    avgMatchPercent: dashboard.kpis.avgMatchPercent,
  };
}

export type AnalyticsSnapshot = Awaited<ReturnType<typeof getAnalyticsSnapshot>>;
