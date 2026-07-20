"use client";

import Link from "next/link";
import { Briefcase, ClipboardList, Mic, Bell, ArrowRight } from "lucide-react";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/enterprise-ui";
import { MotionPage, MotionList, MotionItem, AnimatedCounter } from "@/components/shared/motion";
import { Badge } from "@/components/ui/badge";
import { useCandidateHomeQuery } from "@/lib/queries/use-candidate-portal";
import { useJobsQuery } from "@/lib/queries/use-jobs";

export default function CandidateHomePage() {
  const { data: home, isLoading, isError, error, refetch } = useCandidateHomeQuery();
  const { data: jobs = [] } = useJobsQuery();
  const openJobs = jobs.filter((j) => j.status === "Open").slice(0, 3);

  if (isLoading) return <PageSkeleton rows={5} />;
  if (isError) {
    return (
      <ErrorState
        title="Could not load dashboard"
        description={error instanceof Error ? error.message : "Try again"}
        onRetry={() => refetch()}
      />
    );
  }

  const upcoming = (home?.upcomingInterviews as Record<string, unknown>[]) ?? [];
  const recent = (home?.recentApplications as Record<string, unknown>[]) ?? [];

  return (
    <MotionPage className="space-y-3 max-w-[1200px]">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Career dashboard</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">Applications, interviews, and next steps</p>
        </div>
        <Link
          href="/candidate/jobs"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-medium gradient-brand text-white"
        >
          Browse roles <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <MotionList className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {[
          { label: "Applications", value: Number(home?.applicationCount ?? 0), href: "/candidate/applications", icon: Briefcase },
          { label: "Interviews", value: Number(home?.interviewCount ?? 0), href: "/candidate/interviews", icon: Mic },
          { label: "Assessments", value: Number(home?.pendingAssessments ?? 0), href: "/candidate/assessments", icon: ClipboardList },
          { label: "Unread", value: Number(home?.unreadNotifications ?? 0), href: "/candidate/notifications", icon: Bell },
        ].map((kpi) => (
          <MotionItem key={kpi.label}>
            <Link href={kpi.href} className="ws-panel rounded-xl p-3 block hover:border-primary/30 transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <kpi.icon className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{kpi.label}</span>
              </div>
              <p className="text-xl font-semibold tabular-nums">
                <AnimatedCounter value={kpi.value} />
              </p>
            </Link>
          </MotionItem>
        ))}
      </MotionList>

      <div className="grid lg:grid-cols-2 gap-2.5">
        <div className="ws-panel rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
            <h3 className="text-[12px] font-semibold">Recent applications</h3>
            <Link href="/candidate/applications" className="text-[11px] text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="p-3">
            {recent.length === 0 ? (
              <EmptyState
                className="border-0 bg-transparent p-6"
                title="No applications yet"
                description="Apply to an open role to get started."
                actionLabel="Browse jobs"
                onAction={() => (window.location.href = "/candidate/jobs")}
              />
            ) : (
              <ul className="divide-y divide-white/[0.05]">
                {recent.map((app) => (
                  <li key={String(app.id)} className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium truncate">{String(app.jobTitle)}</p>
                      <p className="text-[10px] text-muted-foreground">{String(app.department ?? "—")}</p>
                    </div>
                    <Badge variant="outline" className="text-[9px] h-5 capitalize shrink-0">
                      {String(app.stage).replaceAll("_", " ")}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="ws-panel rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
            <h3 className="text-[12px] font-semibold">Upcoming interviews</h3>
            <Link href="/candidate/interviews" className="text-[11px] text-primary hover:underline">
              Interview center
            </Link>
          </div>
          <div className="p-3 space-y-3">
            {upcoming.length === 0 ? (
              <p className="text-[12px] text-muted-foreground py-4 text-center">
                No scheduled interviews. Start an AI practice session anytime.
              </p>
            ) : (
              <ul className="divide-y divide-white/[0.05]">
                {upcoming.slice(0, 4).map((iv) => (
                  <li key={String(iv.id)} className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium truncate">
                        {String((iv.jobs as { title?: string } | null)?.title ?? iv.mode ?? "AI Interview")}
                      </p>
                      <p className="text-[10px] text-muted-foreground capitalize">{String(iv.status)}</p>
                    </div>
                    <Link
                      href={`/candidate/interviews/${iv.id}`}
                      className="inline-flex h-7 items-center rounded-md border border-white/10 px-2.5 text-[11px] font-medium hover:bg-white/[0.04]"
                    >
                      Join
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <div className="pt-2 border-t border-white/[0.05]">
              <p className="text-[11px] font-medium mb-1.5">Open roles for you</p>
              {openJobs.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">No open roles published.</p>
              ) : (
                <ul className="space-y-1">
                  {openJobs.map((j) => (
                    <li key={j.id} className="text-[12px]">
                      <Link href="/candidate/jobs" className="text-primary hover:underline">
                        {j.title}
                      </Link>
                      <span className="text-muted-foreground text-[11px]"> · {j.location}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </MotionPage>
  );
}
