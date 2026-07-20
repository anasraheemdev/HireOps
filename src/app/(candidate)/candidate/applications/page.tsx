"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/enterprise-ui";
import { MotionPage, MotionList, MotionItem } from "@/components/shared/motion";
import { Badge } from "@/components/ui/badge";
import { useMyApplicationsQuery } from "@/lib/queries/use-candidate-portal";

const stageProgress: Record<string, number> = {
  applied: 15,
  screening: 30,
  assessment: 45,
  ai_interview: 60,
  final_interview: 75,
  offer: 90,
  hired: 100,
  rejected: 100,
};

export default function CandidateApplicationsPage() {
  const { data: applications = [], isLoading, isError, error, refetch } = useMyApplicationsQuery();

  return (
    <MotionPage className="space-y-3 max-w-[1100px]">
      <PageHeader title="My applications" description="Live pipeline status for every role you applied to." />

      {isLoading && <PageSkeleton rows={4} />}
      {isError && (
        <ErrorState
          title="Could not load applications"
          description={error instanceof Error ? error.message : ""}
          onRetry={() => refetch()}
        />
      )}
      {!isLoading && !isError && applications.length === 0 && (
        <EmptyState
          title="No applications yet"
          description="Browse open roles and apply to start tracking progress."
          actionLabel="Browse jobs"
          onAction={() => {
            window.location.href = "/candidate/jobs";
          }}
        />
      )}

      {!isLoading && !isError && applications.length > 0 && (
        <MotionList className="ws-panel rounded-xl overflow-hidden divide-y divide-white/[0.05]">
          {applications.map((app) => {
            const stage = String(app.stage);
            const pct = stageProgress[stage] ?? 10;
            return (
              <MotionItem key={String(app.id)}>
                <div className="px-3.5 py-3 hover:bg-white/[0.025] transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold truncate">{String(app.jobTitle)}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {String(app.department ?? "—")} · Applied {String(app.appliedDate)}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize w-fit text-[9px] h-5 shrink-0">
                      {stage.replaceAll("_", " ")}
                    </Badge>
                  </div>
                  <div className="mt-2.5 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-2 flex gap-3">
                    <Link href="/candidate/interviews" className="text-[11px] text-primary hover:underline">
                      Interviews
                    </Link>
                    <Link href="/candidate/messages" className="text-[11px] text-primary hover:underline">
                      Messages
                    </Link>
                  </div>
                </div>
              </MotionItem>
            );
          })}
        </MotionList>
      )}
    </MotionPage>
  );
}
