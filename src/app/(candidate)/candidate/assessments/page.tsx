"use client";

import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/enterprise-ui";
import { MotionPage, MotionList, MotionItem } from "@/components/shared/motion";
import { Badge } from "@/components/ui/badge";
import { useMyAssessmentsQuery } from "@/lib/queries/use-candidate-portal";

export default function CandidateAssessmentsPage() {
  const { data: rows = [], isLoading, isError, error, refetch } = useMyAssessmentsQuery();

  return (
    <MotionPage>
      <PageHeader title="Assessments" description="Complete assigned assessments for roles you applied to." />
      {isLoading && <PageSkeleton rows={3} />}
      {isError && (
        <ErrorState title="Could not load assessments" description={error instanceof Error ? error.message : ""} onRetry={() => refetch()} />
      )}
      {!isLoading && !isError && rows.length === 0 && (
        <EmptyState
          icon={ClipboardList}
          title="No assessments assigned"
          description="When HR assigns an assessment, it will appear here."
        />
      )}
      <MotionList className="space-y-3">
        {rows.map((row) => {
          const assessment = (Array.isArray(row.assessments) ? row.assessments[0] : row.assessments) as
            | Record<string, unknown>
            | null;
          return (
            <MotionItem key={String(row.id)}>
              <div className="glass-card p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                <div>
                  <p className="text-sm font-semibold">{String(assessment?.title ?? "Assessment")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {String(assessment?.difficulty ?? "medium")} · {Number(assessment?.duration_minutes ?? 60)} min
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize text-[10px]">
                    {String(row.status)}
                  </Badge>
                  <Link
                    href={`/candidate/assessments/${row.id}`}
                    className="inline-flex h-8 items-center rounded-lg px-3 text-sm font-medium gradient-brand text-white"
                  >
                    {row.status === "completed" ? "Review" : "Start"}
                  </Link>
                </div>
              </div>
            </MotionItem>
          );
        })}
      </MotionList>
    </MotionPage>
  );
}
