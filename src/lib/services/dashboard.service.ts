import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { stageDbToDisplay } from "@/lib/dto/enums";
import { initialsOf, avatarColorFor } from "@/lib/utils";
import type {
  FunnelStage,
  DepartmentHiring,
  TimelinePoint,
  SkillDemand,
  ActivityItem,
  RecentApplication,
  InterviewStats,
  UpcomingInterview,
} from "@/lib/types";

type Client = SupabaseClient<Database>;

function firstOf<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

export async function getDashboardSnapshot(supabase: Client) {
  const [
    { count: totalCandidates },
    { data: applications },
    { data: jobs },
    { data: recentAppsRaw },
    { data: interviewSessions },
    { data: auditRows },
  ] = await Promise.all([
    supabase.from("candidates").select("*", { count: "exact", head: true }),
    supabase.from("applications").select("stage, shortlisted, match_score, applied_date, created_at"),
    supabase.from("jobs").select("status, department_id, required_skills, departments ( name )"),
    supabase
      .from("applications")
      .select(
        "id, stage, match_score, applied_date, created_at, candidates ( id, full_name, avatar_color ), jobs ( title )"
      )
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("interview_sessions")
      .select("id, status, scheduled_at, started_at, created_at, candidate_id, job_id")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(10),
  ]);

  // Interview sessions don't have a typed FK embed in the generated Database types, so we
  // resolve candidate/job names with a couple of small batched lookups instead of a nested select.
  const candidateIds = Array.from(new Set((interviewSessions ?? []).map((s) => s.candidate_id).filter(Boolean)));
  const jobIdsForInterviews = Array.from(
    new Set((interviewSessions ?? []).map((s) => s.job_id).filter((id): id is string => Boolean(id)))
  );
  const [{ data: interviewCandidates }, { data: interviewJobs }] = await Promise.all([
    candidateIds.length
      ? supabase.from("candidates").select("id, full_name, avatar_color").in("id", candidateIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string; avatar_color: string }[] }),
    jobIdsForInterviews.length
      ? supabase.from("jobs").select("id, title").in("id", jobIdsForInterviews)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
  ]);
  const interviewCandidateMap = new Map((interviewCandidates ?? []).map((c) => [c.id, c]));
  const interviewJobMap = new Map((interviewJobs ?? []).map((j) => [j.id, j]));

  const stageOrder: (keyof typeof stageDbToDisplay)[] = [
    "applied", "screening", "assessment", "ai_interview", "final_interview", "offer", "hired",
  ];
  const stageCounts = new Map<string, number>();
  let shortlistedCount = 0;
  let matchScoreSum = 0;
  let matchScoreCount = 0;
  for (const app of applications ?? []) {
    stageCounts.set(app.stage, (stageCounts.get(app.stage) ?? 0) + 1);
    if (app.shortlisted) shortlistedCount += 1;
    if (app.match_score !== null) {
      matchScoreSum += Number(app.match_score);
      matchScoreCount += 1;
    }
  }
  const funnel: FunnelStage[] = stageOrder.map((s) => ({
    stage: stageDbToDisplay[s],
    count: stageCounts.get(s) ?? 0,
  }));

  const deptMap = new Map<string, { open: number; filled: number }>();
  let openPositions = 0;
  for (const job of jobs ?? []) {
    const dept = firstOf(job.departments as { name: string } | { name: string }[] | null);
    const name = dept?.name ?? "Unassigned";
    const entry = deptMap.get(name) ?? { open: 0, filled: 0 };
    if (job.status === "open") {
      entry.open += 1;
      openPositions += 1;
    } else if (job.status === "closed") entry.filled += 1;
    deptMap.set(name, entry);
  }
  const departmentBreakdown: DepartmentHiring[] = Array.from(deptMap.entries()).map(([department, v]) => ({
    department,
    open: v.open,
    filled: v.filled,
  }));

  // Applications timeline — last 7 months, bucketed by applied_date.
  const now = new Date();
  const monthBuckets = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString("en-US", { month: "short" }) };
  });
  const monthIndex = new Map(monthBuckets.map((m, i) => [m.key, i]));
  const applicationsTimeline: TimelinePoint[] = monthBuckets.map((m) => ({
    month: m.label,
    applications: 0,
    interviews: 0,
    hires: 0,
  }));
  for (const app of applications ?? []) {
    const dateStr = app.applied_date ?? app.created_at;
    if (!dateStr) continue;
    const d = new Date(dateStr);
    const idx = monthIndex.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (idx === undefined) continue;
    applicationsTimeline[idx].applications += 1;
    if (app.stage === "ai_interview" || app.stage === "final_interview") applicationsTimeline[idx].interviews += 1;
    if (app.stage === "hired") applicationsTimeline[idx].hires += 1;
  }

  // Top skills in demand — derived from required_skills across all posted jobs.
  const skillCounts = new Map<string, number>();
  for (const job of jobs ?? []) {
    for (const skill of (job.required_skills as string[] | null) ?? []) {
      skillCounts.set(skill, (skillCounts.get(skill) ?? 0) + 1);
    }
  }
  const totalJobsForSkills = jobs?.length || 1;
  const topSkillsDemand: SkillDemand[] = Array.from(skillCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([skill, count]) => ({ skill, demand: Math.min(100, Math.round((count / totalJobsForSkills) * 100)) }));

  // Recent applications — last 10, with candidate + job context.
  const recentApplications: RecentApplication[] = (recentAppsRaw ?? []).map((row) => {
    const candidate = firstOf(row.candidates as { id: string; full_name: string; avatar_color: string } | { id: string; full_name: string; avatar_color: string }[] | null);
    const job = firstOf(row.jobs as { title: string } | { title: string }[] | null);
    const name = candidate?.full_name ?? "Unknown candidate";
    return {
      id: row.id,
      candidateId: candidate?.id ?? "",
      candidateName: name,
      candidateInitials: initialsOf(name),
      avatarColor: candidate?.avatar_color || avatarColorFor(name),
      jobTitle: job?.title ?? "—",
      stage: stageDbToDisplay[row.stage] ?? row.stage,
      matchScore: row.match_score ? Math.round(Number(row.match_score)) : 0,
      appliedDate: row.applied_date ?? row.created_at,
    };
  });

  // Interview stats — counts by status.
  const interviewStats: InterviewStats = { total: 0, scheduled: 0, inProgress: 0, completed: 0, cancelled: 0 };
  for (const iv of interviewSessions ?? []) {
    interviewStats.total += 1;
    if (iv.status === "scheduled") interviewStats.scheduled += 1;
    else if (iv.status === "in_progress") interviewStats.inProgress += 1;
    else if (iv.status === "completed") interviewStats.completed += 1;
    else if (iv.status === "cancelled") interviewStats.cancelled += 1;
  }

  const upcomingInterviews: UpcomingInterview[] = (interviewSessions ?? [])
    .filter((iv) => iv.status === "scheduled" || iv.status === "in_progress")
    .slice(0, 5)
    .map((iv) => {
      const candidate = interviewCandidateMap.get(iv.candidate_id);
      const job = iv.job_id ? interviewJobMap.get(iv.job_id) : undefined;
      const name = candidate?.full_name ?? "Candidate";
      return {
        id: iv.id,
        candidateName: name,
        initials: initialsOf(name),
        avatarColor: candidate?.avatar_color || avatarColorFor(name),
        role: job?.title ?? "—",
        scheduledAt: iv.scheduled_at ?? iv.started_at ?? null,
        status: iv.status,
      };
    });

  // Recent activity — audit trail if present, otherwise derived from the latest application changes.
  let recentActivity: ActivityItem[];
  if (auditRows && auditRows.length > 0) {
    recentActivity = auditRows.map((log) => ({
      id: log.id,
      type: log.entity_type ?? "system",
      title: log.action,
      description: log.actor_label ?? "System",
      time: log.created_at,
      candidateInitials: initialsOf(log.actor_label ?? "System"),
      avatarColor: avatarColorFor(log.actor_label ?? log.id),
    }));
  } else {
    recentActivity = recentApplications.slice(0, 6).map((a) => ({
      id: a.id,
      type: "application",
      title: `${a.candidateName} — ${a.stage}`,
      description: `Applied for ${a.jobTitle}`,
      time: a.appliedDate,
      candidateInitials: a.candidateInitials,
      avatarColor: a.avatarColor,
    }));
  }

  const pendingReviews = (applications ?? []).filter(
    (a) => a.shortlisted && a.stage === "final_interview"
  ).length;

  return {
    kpis: {
      totalCandidates: totalCandidates ?? 0,
      openPositions,
      shortlisted: shortlistedCount,
      avgMatchPercent: matchScoreCount ? Math.round((matchScoreSum / matchScoreCount) * 10) / 10 : 0,
      aiInterviewsToday: stageCounts.get("ai_interview") ?? 0,
    },
    funnel,
    departmentBreakdown,
    applicationsTimeline,
    topSkillsDemand,
    recentApplications,
    interviewStats,
    upcomingInterviews,
    recentActivity,
    pendingReviews,
  };
}

export type DashboardSnapshot = Awaited<ReturnType<typeof getDashboardSnapshot>>;
