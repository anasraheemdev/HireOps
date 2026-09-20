import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PipelineStage } from "@/lib/types";

const stageStyles: Record<PipelineStage, string> = {
  Applied: "bg-slate-500/15 text-slate-300 border-slate-500/25",
  Screening: "bg-sky-500/15 text-sky-300 border-sky-500/25",
  Assessment: "bg-violet-500/15 text-violet-300 border-violet-500/25",
  "Assessment Pending": "bg-violet-500/15 text-violet-300 border-violet-500/25",
  "Assessment Completed": "bg-violet-500/20 text-violet-200 border-violet-500/30",
  "AI Interview": "bg-blue-500/15 text-blue-300 border-blue-500/25",
  "Interview Pending": "bg-blue-500/15 text-blue-300 border-blue-500/25",
  "Interview Completed": "bg-blue-500/20 text-blue-200 border-blue-500/30",
  "Under HR Review": "bg-amber-500/15 text-amber-300 border-amber-500/25",
  Shortlisted: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  "Final Interview": "bg-indigo-500/15 text-indigo-300 border-indigo-500/25",
  Offer: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  Hired: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  Rejected: "bg-rose-500/15 text-rose-300 border-rose-500/25",
};

export function StageBadge({ stage, className }: { stage: PipelineStage; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", stageStyles[stage], className)}>
      {stage}
    </Badge>
  );
}

export function MatchBadge({ score, className }: { score: number; className?: string }) {
  const style =
    score >= 90
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25"
      : score >= 75
      ? "bg-blue-500/15 text-blue-300 border-blue-500/25"
      : score >= 60
      ? "bg-amber-500/15 text-amber-300 border-amber-500/25"
      : "bg-rose-500/15 text-rose-300 border-rose-500/25";
  return (
    <Badge variant="outline" className={cn("font-semibold tabular-nums", style, className)}>
      {score}% Match
    </Badge>
  );
}
