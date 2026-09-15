"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Briefcase, Bookmark, UploadCloud, FileText, Loader2, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/enterprise-ui";
import { MotionPage, MotionList, MotionItem } from "@/components/shared/motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useJobsQuery } from "@/lib/queries/use-jobs";
import { useSaveJobMutation } from "@/lib/queries/use-candidate-portal";
import { useQueryClient } from "@tanstack/react-query";
import type { Job } from "@/lib/types";
import { toast } from "sonner";
import { CandidateApplicationWizard } from "@/components/candidate/candidate-application-wizard";

export default function CandidateJobsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: jobs = [], isLoading, isError, error, refetch } = useJobsQuery();
  const save = useSaveJobMutation();
  const openJobs = jobs.filter((j) => j.status === "Open");

  const [applyingJob, setApplyingJob] = useState<Job | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<{
    jobTitle: string;
    stage: string;
    assessmentTitle?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleApplySubmit = async () => {
    if (!applyingJob) return;
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("jobId", applyingJob.id);
      if (selectedFile) {
        form.append("file", selectedFile);
      }

      const res = await fetch("/api/candidate/applications/apply", {
        method: "POST",
        body: selectedFile ? form : JSON.stringify({ jobId: applyingJob.id }),
        headers: selectedFile ? undefined : { "Content-Type": "application/json" },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Application submission failed");

      toast.success(`Application for "${applyingJob.title}" submitted successfully!`);
      queryClient.invalidateQueries({ queryKey: ["my-applications"] });
      queryClient.invalidateQueries({ queryKey: ["my-assessments"] });
      queryClient.invalidateQueries({ queryKey: ["my-interviews"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });

      setSubmittedResult({
        jobTitle: applyingJob.title,
        stage: json.data?.stage || "applied",
        assessmentTitle: json.data?.assessment?.title,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Application failed");
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setApplyingJob(null);
    setSelectedFile(null);
    setSubmittedResult(null);
  };

  return (
    <MotionPage className="space-y-3 max-w-[1200px]">
      <PageHeader title="Open roles" description="Browse available positions, upload your CV, and apply." />

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
                    className="h-8 text-[12px] gradient-brand text-white cursor-pointer px-3 gap-1.5"
                    onClick={() => setApplyingJob(job)}
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Apply
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

      {/* Automated Stepper Application Modal */}
      <Dialog open={!!applyingJob} onOpenChange={(open) => !open && setApplyingJob(null)}>
        <DialogContent className="sm:max-w-2xl glass-card border-white/15 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" /> Application Stepper: {applyingJob?.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {applyingJob?.department} · {applyingJob?.location}
            </DialogDescription>
          </DialogHeader>

          {applyingJob && (
            <CandidateApplicationWizard
              job={applyingJob}
              onClose={() => setApplyingJob(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </MotionPage>
  );
}

