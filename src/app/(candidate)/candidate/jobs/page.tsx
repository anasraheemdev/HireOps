"use client";

import { useState } from "react";
import { MapPin, Briefcase, Bookmark, Sparkles, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/enterprise-ui";
import { MotionPage, MotionList, MotionItem } from "@/components/shared/motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useSaveJobMutation, useMeQuery, useCandidateJobRecommendationsQuery } from "@/lib/queries/use-candidate-portal";
import type { Job } from "@/lib/types";
import { toast } from "sonner";
import { CandidateApplicationWizard } from "@/components/candidate/candidate-application-wizard";

export default function CandidateJobsPage() {
  const { data: meData } = useMeQuery();
  const { data: recData, isLoading, isError, error, refetch } = useCandidateJobRecommendationsQuery(55);
  const save = useSaveJobMutation();

  const [applyingJob, setApplyingJob] = useState<Job | null>(null);
  const isConfirmed = Boolean((meData?.candidate as { is_confirmed?: boolean })?.is_confirmed);

  const recommendations = recData?.recommendations || [];
  const appliedJobs = recData?.appliedJobs || [];

  return (
    <MotionPage className="space-y-4 max-w-[1200px]">
      <PageHeader
        title="Open Roles & Job Fit Matching"
        description="Personalized, evidence-based job recommendations for your confirmed candidate profile."
      />

      {/* Profile Unconfirmed Warning Banner */}
      {!isLoading && !isConfirmed && (
        <div className="glass-card p-6 border-amber-500/30 bg-amber-500/10 text-center space-y-3 my-4">
          <Sparkles className="h-8 w-8 text-amber-400 mx-auto" />
          <div>
            <h3 className="text-sm font-semibold text-amber-300">Profile Confirmation Required</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
              Please upload and confirm your CV details on the Profile Onboarding page to unlock customized role recommendations.
            </p>
          </div>
          <Button
            size="sm"
            className="gradient-brand text-white cursor-pointer px-5"
            onClick={() => (window.location.href = "/candidate/resume")}
          >
            Go to Profile Onboarding
          </Button>
        </div>
      )}

      {isLoading && <PageSkeleton rows={4} />}
      {isError && (
        <ErrorState
          title="Could not load recommendations"
          description={error instanceof Error ? error.message : "Please try again."}
          onRetry={() => refetch()}
        />
      )}

      {/* RECOMMENDED OPEN ROLES SECTION */}
      {!isLoading && !isError && isConfirmed && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" /> Recommended Roles (≥55% Fit Score)
            </h2>
            <Badge variant="outline" className="text-[10px] bg-white/5 border-white/10">
              {recommendations.length} Role{recommendations.length === 1 ? "" : "s"} Found
            </Badge>
          </div>

          {recommendations.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No open roles meet the 55% relevance threshold"
              description="No position currently matches your skill profile above 55%. Check back soon or update your CV profile details."
            />
          ) : (
            <MotionList className="ws-panel rounded-xl overflow-hidden divide-y divide-white/[0.05]">
              {recommendations.map((item) => {
                const jobPayload: Job = {
                  id: item.id,
                  title: item.title,
                  department: item.department || "Engineering",
                  location: item.location || "Muscat, Oman",
                  type: (item.employmentType as "Full-time" | "Part-time" | "Contract") || "Full-time",
                  level: item.level || "Mid-level",
                  status: "Open",
                  postedDate: new Date().toISOString(),
                  closingDate: "",
                  applicants: 0,
                  shortlisted: 0,
                  inInterview: 0,
                  offers: 0,
                  hired: 0,
                  salaryRange: "",
                  description: item.description || "",
                  requiredSkills: item.requiredSkills,
                  niceToHave: item.niceToHaveSkills || [],
                  minExperience: item.minExperienceYears,
                  hiringManager: "",
                  priority: "Medium",
                };

                return (
                  <MotionItem key={item.id}>
                    <div className="p-4 hover:bg-white/[0.025] transition-colors space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <h3 className="text-sm font-semibold truncate">{item.title}</h3>
                          {/* Relevance Fit Score Badge */}
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-2 py-0.5 font-bold shrink-0 ${
                              item.relevanceScore >= 75
                                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                            }`}
                          >
                            {item.relevanceScore}% Fit Score
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            className="h-8 text-xs gradient-brand text-white cursor-pointer px-3.5 gap-1.5"
                            onClick={() => setApplyingJob(jobPayload)}
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
                                await save.mutateAsync(item.id);
                                toast.success("Role saved");
                              } catch (e) {
                                toast.error(e instanceof Error ? e.message : "Save failed");
                              }
                            }}
                          >
                            <Bookmark className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="inline-flex items-center gap-1">
                          <Briefcase className="h-3.5 w-3.5" /> {item.department} · {item.employmentType || "Full-time"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" /> {item.location}
                        </span>
                        <span className="inline-flex items-center gap-1 text-emerald-400/90 font-medium">
                          <Info className="h-3.5 w-3.5" /> {item.matchDetail.experienceComparison.candidateYears} yrs candidate vs {item.matchDetail.experienceComparison.requiredYears} yrs min
                        </span>
                      </p>

                      <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>

                      {/* Explanation & Skill Breakdown */}
                      <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] space-y-2">
                        <p className="text-[11px] text-zinc-300 font-medium leading-relaxed">
                          💡 <span className="font-semibold text-white">Fit Reason:</span> {item.matchDetail.explanation}
                        </p>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {item.matchDetail.matchedRequiredSkills.map((s) => (
                            <Badge key={`m-${s}`} variant="outline" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/25 text-[10px] h-5 gap-1">
                              <CheckCircle2 className="h-3 w-3 text-emerald-400" /> {s}
                            </Badge>
                          ))}
                          {item.matchDetail.missingRequiredSkills.map((s) => (
                            <Badge key={`miss-${s}`} variant="outline" className="bg-amber-500/10 text-amber-300 border-amber-500/25 text-[10px] h-5 gap-1">
                              <AlertCircle className="h-3 w-3 text-amber-400" /> Gap: {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </MotionItem>
                );
              })}
            </MotionList>
          )}

          {/* APPLIED ROLES SECTION */}
          {appliedJobs.length > 0 && (
            <div className="pt-6 space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-2 text-zinc-400">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Already Applied ({appliedJobs.length})
              </h2>
              <MotionList className="ws-panel rounded-xl overflow-hidden divide-y divide-white/[0.05]">
                {(appliedJobs as Array<{ id: string; title: string; department?: string; location?: string; relevanceScore: number; stage?: string }>).map((item) => (
                  <MotionItem key={`app-${item.id}`}>
                    <div className="p-3.5 flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-semibold">{item.title}</h3>
                          <Badge variant="outline" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[9px] h-4">
                            Applied ({item.stage || "under review"})
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {item.department} · {item.location}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-white/5 border-white/10 text-[10px]">
                        {item.relevanceScore}% Fit Score
                      </Badge>
                    </div>
                  </MotionItem>
                ))}
              </MotionList>
            </div>
          )}
        </div>
      )}

      {/* Stepper Application Dialog */}
      <Dialog open={!!applyingJob} onOpenChange={(open) => !open && setApplyingJob(null)}>
        <DialogContent className="sm:max-w-2xl glass-card border-white/15 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" /> Apply for Role: {applyingJob?.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {applyingJob?.department} · {applyingJob?.location}
            </DialogDescription>
          </DialogHeader>

          {applyingJob && (
            <CandidateApplicationWizard
              job={applyingJob}
              onClose={() => {
                setApplyingJob(null);
                refetch();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </MotionPage>
  );
}
