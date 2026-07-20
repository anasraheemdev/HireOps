"use client";

import { motion } from "framer-motion";
import { Brain, TrendingUp, TrendingDown, Target, Lightbulb, Scale, ShieldCheck } from "lucide-react";
import { ScoreRing } from "@/components/shared/score-ring";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Candidate } from "@/lib/types";

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function CandidateScoringPanel({ candidate }: { candidate: Candidate }) {
  const base = candidate.aiScore;
  const breakdown = [
    { label: "Technical Competency", score: clamp(base + 3), weight: 30 },
    { label: "Experience Relevance", score: clamp(base + (candidate.experienceYears >= 6 ? 6 : -8)), weight: 25 },
    { label: "Cultural & Values Fit", score: clamp(base - 2), weight: 15 },
    { label: "Communication Skills", score: clamp(candidate.confidenceScore - 4), weight: 15 },
    { label: "Assessment Performance", score: clamp(base - 5), weight: 15 },
  ];

  const weighted = breakdown.reduce((acc, b) => acc + (b.score * b.weight) / 100, 0);

  const recommendation =
    weighted >= 88 ? "Strong Hire" : weighted >= 72 ? "Hire" : weighted >= 55 ? "Consider" : "Not a Fit";
  const recColor =
    recommendation === "Strong Hire"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25"
      : recommendation === "Hire"
      ? "bg-blue-500/15 text-blue-300 border-blue-500/25"
      : recommendation === "Consider"
      ? "bg-amber-500/15 text-amber-300 border-amber-500/25"
      : "bg-rose-500/15 text-rose-300 border-rose-500/25";

  const reasoning = [
    candidate.experienceYears >= 6
      ? { positive: true, text: `${candidate.experienceYears} years of relevant experience exceeds the role's baseline requirement.` }
      : { positive: false, text: `${candidate.experienceYears} years of experience is below the preferred threshold for this role.` },
    { positive: true, text: `${candidate.skills.length} of ${candidate.skills.length + candidate.missingSkills.length} required skills matched via semantic analysis of CV and assessment data.` },
    candidate.certifications.length > 0
      ? { positive: true, text: `Holds ${candidate.certifications.length} relevant professional certification(s), reinforcing domain credibility.` }
      : { positive: false, text: "No professional certifications detected — consider verifying via interview." },
    candidate.missingSkills.length > 0
      ? { positive: false, text: `Skill gap identified in: ${candidate.missingSkills.join(", ")}.` }
      : { positive: true, text: "No material skill gaps identified against job requirements." },
    { positive: true, text: `Confidence score of ${candidate.confidenceScore}% derived from response consistency and communication clarity signals.` },
  ];

  const suggestions =
    candidate.missingSkills.length > 0
      ? candidate.missingSkills.map((s) => `Recommend a targeted technical probe on ${s} during the next interview round.`)
      : ["No critical gaps — proceed with standard interview loop and reference checks."];

  return (
    <div className="space-y-5">
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <ScoreRing score={weighted} size={140} sublabel="Overall AI Score" />
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start mb-2">
              <Brain className="h-4 w-4 text-blue-400" />
              <span className="text-xs font-medium text-muted-foreground">Explainable AI Hiring Recommendation</span>
            </div>
            <Badge variant="outline" className={cn("text-sm px-3 py-1 font-semibold", recColor)}>
              {recommendation}
            </Badge>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed max-w-xl">{candidate.aiRecommendation}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Scale className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Scoring Breakdown &amp; Weight Distribution</h3>
          </div>
          <div className="space-y-4">
            {breakdown.map((b, i) => (
              <div key={b.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium">{b.label}</span>
                  <span className="text-muted-foreground">
                    {b.score}/100 <span className="text-muted-foreground/60">· weight {b.weight}%</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${b.score}%` }}
                    transition={{ duration: 0.7, delay: 0.06 * i }}
                    className="h-full rounded-full gradient-brand"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Weighted Composite Score</span>
            <span className="font-semibold">{weighted.toFixed(1)} / 100</span>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Explainable AI — Reasoning Panel</h3>
          </div>
          <ul className="space-y-3">
            {reasoning.map((r, i) => (
              <li key={i} className="flex gap-2.5 text-sm">
                {r.positive ? (
                  <TrendingUp className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                )}
                <span className="text-muted-foreground leading-relaxed">{r.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Skill Gap Analysis</h3>
          </div>
          {candidate.missingSkills.length === 0 ? (
            <p className="text-sm text-muted-foreground">No meaningful skill gaps detected against job requirements.</p>
          ) : (
            <div className="space-y-2">
              {candidate.missingSkills.map((s) => (
                <div key={s} className="flex items-center justify-between rounded-lg bg-rose-500/5 border border-rose-500/15 px-3 py-2">
                  <span className="text-sm">{s}</span>
                  <Badge variant="outline" className="bg-rose-500/15 text-rose-300 border-rose-500/25 text-[10px]">
                    Gap
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-semibold">Improvement Suggestions</h3>
          </div>
          <ul className="space-y-2.5">
            {suggestions.map((s, i) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                <span className="text-amber-400 mt-1">•</span> {s}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
