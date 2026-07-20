"use client";

import { Calendar, Mic, Video } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/enterprise-ui";
import { MotionPage, MotionList, MotionItem } from "@/components/shared/motion";
import { Badge } from "@/components/ui/badge";
import { useMyInterviewsQuery } from "@/lib/queries/use-candidate-portal";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function CandidateInterviewsPage() {
  const { data: sessions = [], isLoading, isError, error, refetch } = useMyInterviewsQuery();

  return (
    <MotionPage>
      <PageHeader
        title="Interview center"
        description="Prepare for interviews and start AI sessions when ready."
        actions={
          <Link href="/candidate/interviews/live" className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium gradient-brand text-white">
            <Mic className="h-4 w-4" /> Start Interview
          </Link>
        }
      />

      {isLoading && <PageSkeleton rows={3} />}
      {isError && (
        <ErrorState title="Could not load interviews" description={error instanceof Error ? error.message : ""} onRetry={() => refetch()} />
      )}
      {!isLoading && !isError && sessions.length === 0 && (
        <EmptyState
          icon={Mic}
          title="No interviews yet"
          description="Start an AI interview to practice and get scored feedback."
          actionLabel="Start Interview"
          onAction={() => {
            window.location.href = "/candidate/interviews/live";
          }}
        />
      )}

      <MotionList className="space-y-3">
        {sessions.map((iv) => {
          const job = iv.jobs as { title?: string } | null;
          const status = String(iv.status);
          return (
            <MotionItem key={String(iv.id)}>
              <div className="glass-card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  {String(iv.mode).includes("video") ? (
                    <Video className="h-5 w-5 text-primary" />
                  ) : (
                    <Mic className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold capitalize">{String(iv.mode)} interview</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {job?.title ?? "General"} · {iv.started_at ? new Date(String(iv.started_at)).toLocaleString() : "Not started"}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] w-fit capitalize",
                    status === "in_progress"
                      ? "bg-amber-500/10 text-amber-300 border-amber-500/25"
                      : status === "completed"
                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
                        : "bg-blue-500/10 text-blue-300 border-blue-500/25"
                  )}
                >
                  {status.replaceAll("_", " ")}
                </Badge>
                <Link
                  href={`/candidate/interviews/${iv.id}`}
                  className="inline-flex h-7 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 text-[0.8rem] font-medium"
                >
                  <Calendar className="h-3.5 w-3.5" /> {status === "completed" ? "Review" : "Join"}
                </Link>
              </div>
            </MotionItem>
          );
        })}
      </MotionList>
    </MotionPage>
  );
}
