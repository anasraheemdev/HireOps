"use client";

import Link from "next/link";
import { Bookmark, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/enterprise-ui";
import { MotionPage, MotionList, MotionItem } from "@/components/shared/motion";
import { Button } from "@/components/ui/button";
import { useSavedJobsQuery, useUnsaveJobMutation, useApplyMutation } from "@/lib/queries/use-candidate-portal";
import { toast } from "sonner";

export default function CandidateSavedJobsPage() {
  const { data: saved = [], isLoading, isError, error, refetch } = useSavedJobsQuery();
  const unsave = useUnsaveJobMutation();
  const apply = useApplyMutation();

  return (
    <MotionPage>
      <PageHeader title="Saved jobs" description="Roles you bookmarked for later." />
      {isLoading && <PageSkeleton rows={3} />}
      {isError && (
        <ErrorState title="Could not load saved jobs" description={error instanceof Error ? error.message : ""} onRetry={() => refetch()} />
      )}
      {!isLoading && !isError && saved.length === 0 && (
        <EmptyState
          icon={Bookmark}
          title="No saved jobs"
          description="Bookmark roles from Browse Jobs."
          actionLabel="Browse jobs"
          onAction={() => {
            window.location.href = "/candidate/jobs";
          }}
        />
      )}
      <MotionList className="space-y-3">
        {saved.map((row) => (
          <MotionItem key={String(row.id)}>
            <div className="glass-card p-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div>
                <p className="text-sm font-semibold">{String(row.title)}</p>
                <p className="text-xs text-muted-foreground">
                  {String(row.department ?? "—")} · {String(row.location ?? "")}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  className="gradient-brand text-white cursor-pointer"
                  disabled={apply.isPending || !row.jobId}
                  onClick={async () => {
                    try {
                      await apply.mutateAsync(String(row.jobId));
                      toast.success("Applied");
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Apply failed");
                    }
                  }}
                >
                  Apply
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="cursor-pointer"
                  onClick={async () => {
                    try {
                      await unsave.mutateAsync(String(row.jobId));
                      toast.success("Removed");
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Failed");
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Link href="/candidate/jobs" className="inline-flex h-7 items-center rounded-lg px-2.5 text-xs text-muted-foreground hover:text-foreground">
                  View
                </Link>
              </div>
            </div>
          </MotionItem>
        ))}
      </MotionList>
    </MotionPage>
  );
}
