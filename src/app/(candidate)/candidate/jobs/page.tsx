"use client";

import { MapPin, Briefcase, Bookmark } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/enterprise-ui";
import { MotionPage, MotionList, MotionItem } from "@/components/shared/motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useJobsQuery } from "@/lib/queries/use-jobs";
import { useApplyMutation, useSaveJobMutation } from "@/lib/queries/use-candidate-portal";
import { toast } from "sonner";

export default function CandidateJobsPage() {
  const { data: jobs = [], isLoading, isError, error, refetch } = useJobsQuery();
  const apply = useApplyMutation();
  const save = useSaveJobMutation();
  const openJobs = jobs.filter((j) => j.status === "Open");

  return (
    <MotionPage className="space-y-3 max-w-[1200px]">
      <PageHeader title="Open roles" description="Browse positions and apply in one click." />

      {isLoading && <PageSkeleton rows={4} />}
      {isError && (
        <ErrorState
          title="Could not load jobs"
          description={error instanceof Error ? error.message : "Please try again."}
          onRetry={() => refetch()}
        />
      )}
      {!isLoading && !isError && openJobs.length === 0 && (
        <EmptyState icon={Briefcase} title="No open roles right now" description="Check back soon." />
      )}

      {!isLoading && !isError && openJobs.length > 0 && (
        <MotionList className="ws-panel rounded-xl overflow-hidden divide-y divide-white/[0.05]">
          {openJobs.map((job) => (
            <MotionItem key={job.id}>
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 px-3.5 py-3.5 hover:bg-white/[0.025] transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-[13px] font-semibold leading-snug truncate">{job.title}</h3>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/25 text-[9px] h-5 shrink-0">
                      {job.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 mb-1.5">
                    <span className="inline-flex items-center gap-1">
                      <Briefcase className="h-3 w-3" /> {job.department} · {job.type}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {job.location}
                    </span>
                  </p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2">{job.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {job.requiredSkills.slice(0, 5).map((s) => (
                      <Badge key={s} variant="outline" className="bg-white/5 border-white/10 text-[9px] h-5">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    className="h-8 text-[12px] gradient-brand text-white cursor-pointer px-3"
                    disabled={apply.isPending}
                    onClick={async () => {
                      try {
                        const res = (await apply.mutateAsync(job.id)) as { alreadyApplied?: boolean };
                        toast.success(res?.alreadyApplied ? "Already applied" : `Applied to “${job.title}”`);
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
                    className="h-8 w-8 cursor-pointer border-white/10"
                    disabled={save.isPending}
                    onClick={async () => {
                      try {
                        await save.mutateAsync(job.id);
                        toast.success("Saved");
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Save failed");
                      }
                    }}
                  >
                    <Bookmark className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </MotionItem>
          ))}
        </MotionList>
      )}
    </MotionPage>
  );
}
