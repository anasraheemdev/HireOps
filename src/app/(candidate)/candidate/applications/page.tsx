"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/enterprise-ui";
import { MotionPage, MotionList, MotionItem } from "@/components/shared/motion";
import { Badge } from "@/components/ui/badge";
import { useMyApplicationsQuery } from "@/lib/queries/use-candidate-portal";
import { Calendar, CheckCircle2, XCircle, ExternalLink, MapPin } from "lucide-react";

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
            const humanInt = (app as unknown as { humanInterview?: Record<string, string> | null }).humanInterview;
            const decision = (app as unknown as { hiringDecision?: Record<string, string> | null }).hiringDecision;

            return (
              <MotionItem key={String(app.id)}>
                <div className="px-3.5 py-3.5 hover:bg-white/[0.025] transition-colors space-y-2.5">
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

                  <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>

                  {/* Human Interview Schedule Card for Candidate */}
                  {humanInt && (
                    <div className="rounded-md border border-indigo-500/30 bg-indigo-500/10 p-3 text-xs space-y-1.5">
                      <div className="flex items-center justify-between font-semibold text-indigo-300">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" /> Human Interview Scheduled
                        </span>
                        <span className="text-[10px] uppercase font-bold">{humanInt.interviewType}</span>
                      </div>
                      <p className="text-[11px] text-foreground">
                        Date & Time: <strong>{new Date(humanInt.scheduledAt).toLocaleString()} ({humanInt.timezone || "GST"})</strong>
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Interviewer: {humanInt.interviewerName}
                      </p>
                      {humanInt.meetingLink && (
                        <div className="pt-1">
                          <a
                            href={humanInt.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> Join Video Interview
                          </a>
                        </div>
                      )}
                      {humanInt.location && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" /> {humanInt.location}
                        </p>
                      )}
                      {humanInt.candidateInstructions && (
                        <p className="text-[10px] text-indigo-200/80 italic pt-1 border-t border-indigo-500/20">
                          Note: {humanInt.candidateInstructions}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Decision Notice for Candidate */}
                  {decision && (
                    <div
                      className={`rounded-md border p-3 text-xs space-y-1 ${
                        decision.decision === "selected"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                          : "border-rose-500/30 bg-rose-500/10 text-rose-200"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-semibold">
                        {decision.decision === "selected" ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <XCircle className="h-4 w-4 text-rose-400" />
                        )}
                        <span>{decision.decision === "selected" ? "Application Selected" : "Application Update"}</span>
                      </div>
                      {decision.candidateMessage && (
                        <p className="text-[11px] leading-relaxed text-foreground whitespace-pre-wrap">
                          {decision.candidateMessage}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3 text-[11px]">
                    <Link href="/candidate/interviews" className="text-primary hover:underline">
                      Interviews
                    </Link>
                    <Link href="/candidate/messages" className="text-primary hover:underline">
                      Messages
                    </Link>
                    <Link href="/candidate/notifications" className="text-primary hover:underline">
                      Notifications
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
