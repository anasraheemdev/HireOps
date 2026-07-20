"use client";

import { useMemo } from "react";
import {
  Users,
  Bot,
  Briefcase,
  Star,
  Target,
  Download,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Clock,
  Inbox,
  RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/shared/stat-card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDashboardQuery } from "@/lib/queries/use-dashboard";
import { chartColors, tooltipStyle, tooltipLabelStyle, tooltipItemStyle } from "@/lib/chart-theme";
import { cn, formatRelativeTime } from "@/lib/utils";
import { openAIAssistant } from "@/components/layout/ai-assistant";
import { DashboardGrid, type DashboardWidgetConfig } from "@/components/workspace/dashboard-grid";
import { useAuth } from "@/lib/auth/auth-provider";

const stageBadgeStyle: Record<string, string> = {
  Applied: "bg-white/5 text-muted-foreground border-white/10",
  Screening: "bg-sky-500/15 text-sky-300 border-sky-500/25",
  Assessment: "bg-violet-500/15 text-violet-300 border-violet-500/25",
  "AI Interview": "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
  "Final Interview": "bg-amber-500/15 text-amber-300 border-amber-500/25",
  Offer: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  Hired: "bg-emerald-500/20 text-emerald-200 border-emerald-500/30",
  Rejected: "bg-rose-500/15 text-rose-300 border-rose-500/25",
};

const WIDGETS: DashboardWidgetConfig[] = [
  { id: "funnel", title: "Hiring funnel" },
  { id: "timeline", title: "Application trends", colSpan: 2 },
  { id: "interviews", title: "Upcoming interviews" },
  { id: "applications", title: "Recent applications" },
  { id: "departments", title: "Department hiring" },
  { id: "activity", title: "Live activity", colSpan: 2 },
  { id: "skills", title: "Skills in demand" },
  { id: "ai", title: "AI recommendations" },
];

export default function DashboardPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { data, isLoading, isError, error, refetch, isRefetching } = useDashboardQuery();
  const kpis = data?.kpis;
  const funnelStages = data?.funnel ?? [];
  const departmentHiring = data?.departmentBreakdown ?? [];
  const applicationsTimeline = data?.applicationsTimeline ?? [];
  const topSkillsDemand = data?.topSkillsDemand ?? [];
  const recentActivity = data?.recentActivity ?? [];
  const recentApplications = data?.recentApplications ?? [];
  const upcomingInterviews = data?.upcomingInterviews ?? [];
  const interviewStats = data?.interviewStats;
  const pendingReviews = data?.pendingReviews ?? 0;
  const maxFunnel = Math.max(funnelStages[0]?.count ?? 0, 1);
  const isEmpty = !isLoading && !isError && (kpis?.totalCandidates ?? 0) === 0 && (departmentHiring.length ?? 0) === 0;
  const storageKey = useMemo(() => `hireops-dash-v2:${profile?.id ?? "anon"}`, [profile?.id]);

  if (isError) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-10 text-center">
        <AlertTriangle className="h-7 w-7 text-amber-400 mx-auto mb-2" />
        <p className="text-sm font-medium">Couldn&apos;t load dashboard</p>
        <p className="text-xs text-muted-foreground mt-1">{error instanceof Error ? error.message : "Retry"}</p>
        <Button size="sm" variant="outline" className="mt-3 cursor-pointer" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const renderWidget = (id: string) => {
    switch (id) {
      case "funnel":
        return (
          <div className="space-y-2.5">
            {funnelStages.map((s) => {
              const pct = (s.count / maxFunnel) * 100;
              return (
                <div key={s.stage}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-muted-foreground">{s.stage}</span>
                    <span className="font-semibold tabular-nums">{s.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded-full gradient-brand transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {funnelStages.length === 0 && <p className="text-[11px] text-muted-foreground py-6 text-center">No funnel data</p>}
          </div>
        );
      case "timeline":
        return isLoading ? (
          <Skeleton className="h-[220px] w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={applicationsTimeline} margin={{ left: -12, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="dashApp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors.blue} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={chartColors.blue} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
              <XAxis dataKey="month" stroke={chartColors.axis} fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke={chartColors.axis} fontSize={10} tickLine={false} axisLine={false} width={32} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
              <Area type="monotone" dataKey="applications" stroke={chartColors.blue} fill="url(#dashApp)" strokeWidth={2} name="Applications" />
              <Area type="monotone" dataKey="interviews" stroke={chartColors.cyan} fill="transparent" strokeWidth={2} name="Interviews" />
            </AreaChart>
          </ResponsiveContainer>
        );
      case "interviews":
        return (
          <div className="space-y-2.5">
            {interviewStats && interviewStats.total > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-1">
                <Badge variant="outline" className="text-[10px] h-5">{interviewStats.scheduled} scheduled</Badge>
                <Badge variant="outline" className="text-[10px] h-5 text-amber-300 border-amber-500/30">
                  {interviewStats.inProgress} live
                </Badge>
              </div>
            )}
            {upcomingInterviews.length === 0 ? (
              <p className="text-[11px] text-muted-foreground text-center py-8">No upcoming interviews</p>
            ) : (
              upcomingInterviews.slice(0, 5).map((iv) => (
                <div key={iv.id} className="flex items-center gap-2.5 rounded-lg px-1 py-1 hover:bg-white/[0.03]">
                  <Avatar className="h-8 w-8 border border-white/10" size="sm">
                    <AvatarFallback className={cn("text-[10px] text-white", iv.avatarColor)}>{iv.initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium truncate">{iv.candidateName}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{iv.role}</p>
                  </div>
                  <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                </div>
              ))
            )}
            <Link href="/hr/calendar" className="inline-flex items-center gap-1 text-[11px] text-primary mt-1 hover:underline">
              Open calendar <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        );
      case "applications":
        return (
          <div className="space-y-2">
            {recentApplications.slice(0, 6).map((a) => (
              <div key={a.id} className="flex items-center gap-2.5">
                <Avatar className="h-8 w-8 border border-white/10" size="sm">
                  <AvatarFallback className={cn("text-[10px] text-white", a.avatarColor)}>{a.candidateInitials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium truncate">{a.candidateName}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{a.jobTitle}</p>
                </div>
                <Badge variant="outline" className={cn("text-[9px] shrink-0", stageBadgeStyle[a.stage])}>
                  {a.stage}
                </Badge>
              </div>
            ))}
            {recentApplications.length === 0 && (
              <p className="text-[11px] text-muted-foreground text-center py-8">No applications yet</p>
            )}
          </div>
        );
      case "departments":
        return isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : departmentHiring.length === 0 ? (
          <p className="text-[11px] text-muted-foreground text-center py-8">No department data</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={departmentHiring} margin={{ left: -12, right: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
              <XAxis dataKey="department" stroke={chartColors.axis} fontSize={9} tickLine={false} axisLine={false} />
              <YAxis stroke={chartColors.axis} fontSize={10} tickLine={false} axisLine={false} width={28} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="filled" stackId="a" fill={chartColors.blue} name="Filled" radius={[0, 0, 0, 0]} />
              <Bar dataKey="open" stackId="a" fill={chartColors.violet} name="Open" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      case "activity":
        return (
          <div>
            <div className="flex justify-end mb-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] cursor-pointer"
                onClick={() => refetch()}
                disabled={isRefetching}
              >
                <RefreshCw className={cn("h-3 w-3 mr-1", isRefetching && "animate-spin")} /> Refresh
              </Button>
            </div>
            <div className="space-y-0 divide-y divide-white/[0.05]">
              {recentActivity.slice(0, 7).map((a) => (
                <div key={a.id} className="flex gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium truncate">{a.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{a.description}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground/70 shrink-0 tabular-nums">
                    {formatRelativeTime(a.time)}
                  </span>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <p className="text-[11px] text-muted-foreground text-center py-8">No recent activity</p>
              )}
            </div>
          </div>
        );
      case "skills":
        return (
          <div className="space-y-2.5">
            {topSkillsDemand.map((s) => (
              <div key={s.skill}>
                <div className="flex justify-between text-[11px] mb-1">
                  <span>{s.skill}</span>
                  <span className="text-muted-foreground tabular-nums">{s.demand}%</span>
                </div>
                <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                    style={{ width: `${s.demand}%` }}
                  />
                </div>
              </div>
            ))}
            {topSkillsDemand.length === 0 && (
              <p className="text-[11px] text-muted-foreground text-center py-8">No skills data</p>
            )}
          </div>
        );
      case "ai":
        return (
          <div className="space-y-3 text-[12px]">
            <p className="text-muted-foreground leading-relaxed">
              {pendingReviews > 0
                ? `${pendingReviews} pending review${pendingReviews === 1 ? "" : "s"} need attention before offers can move forward.`
                : "Pipeline looks healthy. Ask Amina for match summaries or interview prep."}
            </p>
            <div className="flex flex-col gap-1.5">
              <Button
                size="sm"
                className="h-8 text-[12px] gradient-brand text-white cursor-pointer gap-1.5"
                onClick={() => openAIAssistant("Summarize today's hiring priorities")}
              >
                <Sparkles className="h-3.5 w-3.5" /> Ask AI Copilot
              </Button>
              {pendingReviews > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-[12px] cursor-pointer"
                  onClick={() => router.push("/hr/candidates")}
                >
                  Review candidates
                </Button>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3 max-w-[1600px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">HireOps</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Enterprise AI Recruitment Platform · Drag widgets to personalize ·{" "}
            <kbd className="text-[10px] px-1 rounded bg-white/10">⌘J</kbd> for AI
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[12px] cursor-pointer gap-1.5 border-white/10 bg-white/[0.03]"
            onClick={() => window.open("/api/reports/recruitment?format=csv", "_blank")}
          >
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button
            size="sm"
            className="h-8 text-[12px] gradient-brand text-white cursor-pointer gap-1.5"
            onClick={() => openAIAssistant()}
          >
            <Sparkles className="h-3.5 w-3.5" /> Ask AI
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
        {isLoading || !kpis
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[88px] rounded-xl" />)
          : [
              <StatCard key="c" dense index={0} label="Candidates" value={kpis.totalCandidates} icon={Users} iconClass="text-blue-400 bg-blue-500/15" />,
              <StatCard key="i" dense index={1} label="AI interviews" value={kpis.aiInterviewsToday} icon={Bot} iconClass="text-cyan-400 bg-cyan-500/15" />,
              <StatCard key="o" dense index={2} label="Open roles" value={kpis.openPositions} icon={Briefcase} iconClass="text-violet-400 bg-violet-500/15" />,
              <StatCard key="s" dense index={3} label="Shortlisted" value={kpis.shortlisted} icon={Star} iconClass="text-amber-400 bg-amber-500/15" />,
              <StatCard key="m" dense index={4} label="Avg match" value={kpis.avgMatchPercent} icon={Target} suffix="%" decimals={1} iconClass="text-emerald-400 bg-emerald-500/15" />,
            ]}
      </div>

      {isEmpty ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium">No recruitment activity yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Post a job and add candidates to populate your workspace widgets.
          </p>
          <Button size="sm" className="mt-4 gradient-brand text-white cursor-pointer" onClick={() => router.push("/hr/jobs")}>
            Create a job
          </Button>
        </div>
      ) : (
        <DashboardGrid storageKey={storageKey} widgets={WIDGETS} renderWidget={renderWidget} />
      )}
    </div>
  );
}
