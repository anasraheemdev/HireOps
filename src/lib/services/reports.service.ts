import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { toCsv, type CsvColumn } from "@/lib/reports/csv";
import { getDashboardSnapshot } from "@/lib/services/dashboard.service";
import { stageDbToDisplay } from "@/lib/dto/enums";

type Client = SupabaseClient<Database>;

export const REPORT_TYPES = ["recruitment", "kpi", "department", "trends", "ai-performance", "diversity"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

function firstOf<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

function buildCsv<T extends Record<string, unknown>>(rows: T[], columns: CsvColumn<T>[]) {
  return toCsv(rows, columns);
}

async function recruitmentReport(supabase: Client) {
  const { data, error } = await supabase
    .from("applications")
    .select(
      "id, stage, match_score, shortlisted, applied_date, candidates ( full_name, email ), jobs ( title, departments ( name ) )"
    )
    .order("applied_date", { ascending: false })
    .limit(1000);
  if (error) throw error;

  const rows = (data ?? []).map((row) => {
    const candidate = firstOf(row.candidates as { full_name: string; email: string } | { full_name: string; email: string }[] | null);
    const job = firstOf(row.jobs as { title: string; departments?: { name: string } | { name: string }[] | null } | { title: string; departments?: { name: string } | { name: string }[] | null }[] | null);
    const dept = firstOf(job?.departments);
    return {
      candidate: candidate?.full_name ?? "Unknown",
      email: candidate?.email ?? "",
      job: job?.title ?? "—",
      department: dept?.name ?? "—",
      stage: stageDbToDisplay[row.stage] ?? row.stage,
      matchScore: row.match_score ? Math.round(Number(row.match_score)) : "",
      shortlisted: row.shortlisted ? "Yes" : "No",
      appliedDate: row.applied_date ?? "",
    };
  });

  return buildCsv(rows, [
    { key: "candidate", label: "Candidate" },
    { key: "email", label: "Email" },
    { key: "job", label: "Job Title" },
    { key: "department", label: "Department" },
    { key: "stage", label: "Stage" },
    { key: "matchScore", label: "Match Score (%)" },
    { key: "shortlisted", label: "Shortlisted" },
    { key: "appliedDate", label: "Applied Date" },
  ]);
}

async function kpiReport(supabase: Client) {
  const snapshot = await getDashboardSnapshot(supabase);
  const { data: offers } = await supabase.from("offers").select("status");
  const totalOffers = offers?.length ?? 0;
  const acceptedOffers = offers?.filter((o) => o.status === "accepted").length ?? 0;
  const offerAcceptanceRate = totalOffers ? Math.round((acceptedOffers / totalOffers) * 100) : 0;

  const rows = [
    { metric: "Total Candidates", value: snapshot.kpis.totalCandidates },
    { metric: "Open Positions", value: snapshot.kpis.openPositions },
    { metric: "Shortlisted Candidates", value: snapshot.kpis.shortlisted },
    { metric: "Average Match Score (%)", value: snapshot.kpis.avgMatchPercent },
    { metric: "AI Interviews (in progress)", value: snapshot.kpis.aiInterviewsToday },
    { metric: "Total Offers Extended", value: totalOffers },
    { metric: "Offer Acceptance Rate (%)", value: offerAcceptanceRate },
    { metric: "Pending Final Reviews", value: snapshot.pendingReviews },
  ];

  return buildCsv(rows, [
    { key: "metric", label: "Metric" },
    { key: "value", label: "Value" },
  ]);
}

async function departmentReport(supabase: Client) {
  const snapshot = await getDashboardSnapshot(supabase);
  return buildCsv(snapshot.departmentBreakdown, [
    { key: "department", label: "Department" },
    { key: "open", label: "Open Roles" },
    { key: "filled", label: "Filled Roles" },
  ]);
}

async function trendsReport(supabase: Client) {
  const snapshot = await getDashboardSnapshot(supabase);
  return buildCsv(snapshot.applicationsTimeline, [
    { key: "month", label: "Month" },
    { key: "applications", label: "Applications" },
    { key: "interviews", label: "Interviews" },
    { key: "hires", label: "Hires" },
  ]);
}

async function aiPerformanceReport(supabase: Client) {
  const { data, error } = await supabase
    .from("interview_sessions")
    .select("id, status, mode, recommendation, started_at, ended_at, candidate_id, job_id")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw error;

  const sessions = data ?? [];
  const candidateIds = Array.from(new Set(sessions.map((s) => s.candidate_id).filter(Boolean)));
  const jobIds = Array.from(new Set(sessions.map((s) => s.job_id).filter((id): id is string => Boolean(id))));
  const [{ data: candidates }, { data: jobs }] = await Promise.all([
    candidateIds.length
      ? supabase.from("candidates").select("id, full_name").in("id", candidateIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    jobIds.length
      ? supabase.from("jobs").select("id, title").in("id", jobIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
  ]);
  const candidateMap = new Map((candidates ?? []).map((c) => [c.id, c]));
  const jobMap = new Map((jobs ?? []).map((j) => [j.id, j]));

  const rows = sessions.map((row) => {
    const candidate = candidateMap.get(row.candidate_id);
    const job = row.job_id ? jobMap.get(row.job_id) : undefined;
    return {
      candidate: candidate?.full_name ?? "Unknown",
      job: job?.title ?? "—",
      mode: row.mode ?? "",
      status: row.status ?? "",
      recommendation: row.recommendation ?? "",
      startedAt: row.started_at ?? "",
      endedAt: row.ended_at ?? "",
    };
  });

  return buildCsv(rows, [
    { key: "candidate", label: "Candidate" },
    { key: "job", label: "Job Title" },
    { key: "mode", label: "Interview Mode" },
    { key: "status", label: "Status" },
    { key: "recommendation", label: "AI Recommendation" },
    { key: "startedAt", label: "Started At" },
    { key: "endedAt", label: "Ended At" },
  ]);
}

async function diversityReport(supabase: Client) {
  const { data, error } = await supabase.from("candidates").select("nationality");
  if (error) throw error;
  const counts = new Map<string, number>();
  for (const c of data ?? []) {
    const key = c.nationality?.trim() || "Not specified";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const total = data?.length || 1;
  const rows = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([nationality, count]) => ({
      nationality,
      count,
      percentage: Math.round((count / total) * 1000) / 10,
    }));

  return buildCsv(rows, [
    { key: "nationality", label: "Nationality" },
    { key: "count", label: "Candidate Count" },
    { key: "percentage", label: "% of Pool" },
  ]);
}

export async function generateReportCsv(supabase: Client, type: string): Promise<string> {
  switch (type) {
    case "recruitment":
      return recruitmentReport(supabase);
    case "kpi":
      return kpiReport(supabase);
    case "department":
      return departmentReport(supabase);
    case "trends":
      return trendsReport(supabase);
    case "ai-performance":
      return aiPerformanceReport(supabase);
    case "diversity":
      return diversityReport(supabase);
    default:
      throw new Error(`Unknown report type "${type}"`);
  }
}
