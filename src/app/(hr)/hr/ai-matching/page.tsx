"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  PolarRadiusAxis,
} from "recharts";
import {
  Download,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  XCircle,
  GraduationCap,
  Award,
  Briefcase,
  Bot,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { MatchBadge } from "@/components/shared/stage-badge";
import type { MatchReasoning, MatchResult } from "@/lib/types/matching";
import type { Job } from "@/lib/types";
import { chartColors } from "@/lib/chart-theme";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useJobsQuery } from "@/lib/queries/use-jobs";
import { useApplicationDecisionMutation } from "@/lib/queries/use-candidates";
import {
  useExplainMatchMutation,
  useJobMatchesQuery,
} from "@/lib/queries/use-ai";

function radarFromScores(match: MatchResult, reasoning?: MatchReasoning | null) {
  const skillsPct = reasoning?.scoreBreakdown.skills
    ?? Math.round((match.matchedSkills.length / Math.max(match.matchedSkills.length + match.missingSkills.length, 1)) * 100);
  const expPct = reasoning?.scoreBreakdown.experience ?? Math.min(100, Math.round(match.experienceYears * 8 + 20));
  const eduPct = match.education.length > 0 ? 88 : 55;
  const certPct = Math.min(100, match.certifications.length * 35 + 40);
  const culturePct = reasoning?.scoreBreakdown.semantic ?? match.similarity ?? match.confidenceScore;
  return [
    { subject: "Skills Match", value: skillsPct, fullMark: 100 },
    { subject: "Experience", value: expPct, fullMark: 100 },
    { subject: "Education", value: eduPct, fullMark: 100 },
    { subject: "Certifications", value: certPct, fullMark: 100 },
    { subject: "Culture Fit", value: culturePct, fullMark: 100 },
  ];
}

export default function AiMatchingPage() {
  const { data: jobs = [], isLoading: jobsLoading } = useJobsQuery();
  const openJobs = useMemo(
    () => jobs.filter((j) => j.status === "Open" || j.status === "Draft" || j.status === "On Hold"),
    [jobs]
  );
  const [jobId, setJobId] = useState<string>("");
  const [selected, setSelected] = useState<MatchResult | null>(null);
  const [reasoning, setReasoning] = useState<MatchReasoning | null>(null);

  useEffect(() => {
    if (!jobId && openJobs[0]) setJobId(openJobs[0].id);
  }, [openJobs, jobId]);

  const { data, isLoading: matchesLoading, isFetching, error } = useJobMatchesQuery(jobId || undefined);
  const explainMutation = useExplainMatchMutation();
  const decisionMutation = useApplicationDecisionMutation();

  const job: Job | undefined = data?.job ?? openJobs.find((j) => j.id === jobId);
  const matches = data?.matches ?? [];

  const openDetails = async (candidate: MatchResult) => {
    setSelected(candidate);
    setReasoning(null);
    if (!jobId) return;
    try {
      const result = await explainMutation.mutateAsync({ jobId, candidateId: candidate.id });
      setReasoning(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate match explanation");
    }
  };

  const handleDecision = async (decision: "shortlist" | "reject") => {
    if (!selected || !jobId) return;
    try {
      await decisionMutation.mutateAsync({
        applicationId: selected.applicationId,
        candidateId: selected.id,
        jobId,
        decision,
      });
      toast.success(
        decision === "shortlist"
          ? `${selected.name} shortlisted for ${job?.title}`
          : `${selected.name} rejected for ${job?.title}`
      );
      setSelected(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Decision failed");
    }
  };

  return (
    <div>
      <PageHeader
        title="AI Matching"
        description="Semantic candidate-to-job matching powered by OpenRouter embeddings + explainable AI."
        actions={
          <Button variant="outline" className="bg-white/5 border-white/10 gap-2" onClick={() => toast("Export coming in Phase 3")}>
            <Download className="h-4 w-4" /> Export Matches
          </Button>
        }
      />

      <div className="glass-card p-5 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-1.5">Select a job to view AI-matched candidates</p>
            <Select value={jobId} onValueChange={(v) => setJobId(v ?? "")} disabled={jobsLoading || openJobs.length === 0}>
              <SelectTrigger className="w-full md:w-96 bg-white/5 border-white/10 h-11">
                <SelectValue>
                  {(v: string) => {
                    const j = jobs.find((x) => x.id === v);
                    return j ? `${j.title} — ${j.department}` : "Select a job";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {openJobs.map((j) => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.title} — {j.department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-xl font-semibold">{matchesLoading || isFetching ? "…" : matches.length}</p>
              <p className="text-[11px] text-muted-foreground">Matched</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-semibold">{job?.requiredSkills.length ?? 0}</p>
              <p className="text-[11px] text-muted-foreground">Req. Skills</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-semibold">{job?.minExperience ?? 0}+</p>
              <p className="text-[11px] text-muted-foreground">Yrs Exp.</p>
            </div>
          </div>
        </div>
        {job && (
          <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-white/10">
            {job.requiredSkills.map((s) => (
              <Badge key={s} variant="outline" className="bg-white/5 border-white/10 text-muted-foreground">
                {s}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {(jobsLoading || matchesLoading) && (
        <div className="glass-card p-10 flex items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Computing semantic matches…
        </div>
      )}

      {error && (
        <div className="glass-card p-10 text-center text-rose-300">
          {error instanceof Error ? error.message : "Failed to load matches. Ensure embeddings are backfilled."}
        </div>
      )}

      {!jobsLoading && !matchesLoading && !error && matches.length === 0 && (
        <div className="glass-card p-10 text-center text-muted-foreground">
          No AI-matched candidates for this job yet. Parse resumes or run the embedding backfill script.
        </div>
      )}

      {!matchesLoading && matches.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {matches.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className="glass-card card-hover p-5 flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-11 w-11 border border-white/10">
                    <AvatarFallback className={cn("bg-gradient-to-br text-white text-sm font-semibold", c.avatarColor)}>
                      {c.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.experienceYears} yrs · {c.location}
                    </p>
                  </div>
                </div>
                <MatchBadge score={c.matchScore} />
              </div>

              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1.5">Matched Skills</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {c.matchedSkills.slice(0, 4).map((s) => (
                    <span key={s} className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-full px-2 py-0.5">
                      {s}
                    </span>
                  ))}
                  {c.matchedSkills.length === 0 && (
                    <span className="text-[10px] text-muted-foreground">Semantic match only</span>
                  )}
                </div>
                {c.missingSkills.length > 0 && (
                  <>
                    <p className="text-xs text-muted-foreground mb-1.5">Gaps</p>
                    <div className="flex flex-wrap gap-1.5">
                      {c.missingSkills.slice(0, 3).map((s) => (
                        <span key={s} className="text-[10px] bg-rose-500/10 text-rose-300 border border-rose-500/20 rounded-full px-2 py-0.5">
                          {s}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t border-white/10">
                <Button size="sm" variant="outline" className="flex-1 bg-white/5 border-white/10 text-xs" onClick={() => void openDetails(c)}>
                  View Match Details
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin bg-popover border-white/10 sm:max-w-2xl">
          {selected && job && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border border-white/10">
                    <AvatarFallback className={cn("bg-gradient-to-br text-white font-semibold", selected.avatarColor)}>
                      {selected.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle>{selected.name}</DialogTitle>
                    <DialogDescription>
                      {selected.title} · Matching against {job.title}
                    </DialogDescription>
                  </div>
                  <MatchBadge score={reasoning?.scoreBreakdown.overall ?? selected.matchScore} className="ml-auto" />
                </div>
              </DialogHeader>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-2">
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarFromScores(selected, reasoning)} outerRadius="75%">
                      <PolarGrid stroke={chartColors.grid} />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: chartColors.axis, fontSize: 10 }} />
                      <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                      <Radar name={selected.name} dataKey="value" stroke={chartColors.blue} fill={chartColors.blue} fillOpacity={0.35} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <strong>{selected.experienceYears} yrs</strong> experience vs. <strong>{job.minExperience}+ yrs</strong> required
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selected.education[0]?.degree ?? "No formal degree on file"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selected.certifications.length} certification(s) on file</span>
                  </div>
                  <div className="rounded-lg bg-blue-500/5 border border-blue-500/15 p-3 flex gap-2">
                    <Bot className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                    {explainMutation.isPending && !reasoning ? (
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating AI explanation…
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {reasoning?.recommendation ?? selected.aiRecommendation}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {reasoning?.reasoning?.length ? (
                <ul className="mt-2 space-y-1.5 rounded-lg bg-white/5 border border-white/10 p-3">
                  {reasoning.reasoning.map((line) => (
                    <li key={line} className="text-xs text-muted-foreground flex gap-2">
                      <span className="text-blue-400">•</span> {line}
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Matched Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(reasoning?.matchedSkills ?? selected.matchedSkills).map((s) => (
                      <Badge key={s} variant="outline" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/20 text-[10px]">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> {s}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Missing Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(reasoning?.missingSkills ?? selected.missingSkills).length === 0 ? (
                      <span className="text-xs text-muted-foreground">None</span>
                    ) : (
                      (reasoning?.missingSkills ?? selected.missingSkills).map((s) => (
                        <Badge key={s} variant="outline" className="bg-rose-500/10 text-rose-300 border-rose-500/20 text-[10px]">
                          <XCircle className="h-3 w-3 mr-1" /> {s}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-4 pt-4 border-t border-white/10">
                <Button
                  variant="outline"
                  className="flex-1 bg-white/5 border-white/10 text-rose-400 gap-2"
                  disabled={decisionMutation.isPending}
                  onClick={() => void handleDecision("reject")}
                >
                  <ThumbsDown className="h-4 w-4" /> Reject
                </Button>
                <Button
                  className="flex-1 gradient-brand text-white gap-2"
                  disabled={decisionMutation.isPending}
                  onClick={() => void handleDecision("shortlist")}
                >
                  <ThumbsUp className="h-4 w-4" /> Shortlist
                </Button>
                <Button variant="outline" size="icon" className="bg-white/5 border-white/10" onClick={() => toast("Match report exported")}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
