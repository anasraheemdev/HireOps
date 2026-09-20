"use client";

import React, { useState } from "react";
import {
  FileText,
  GraduationCap,
  Award,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StageBadge } from "@/components/shared/stage-badge";
import { ScoreRing } from "@/components/shared/score-ring";
import { stageDbToDisplay } from "@/lib/dto/enums";
import type { ApplicationStage } from "@/lib/supabase/database.types";
import type { HrCandidateReviewData } from "@/lib/services/hr-candidate-review.service";

interface CandidateReviewTabsProps {
  data: HrCandidateReviewData;
  activeTab: string;
}

export function CandidateReviewTabs({ data, activeTab }: CandidateReviewTabsProps) {
  const [transcriptExpanded, setTranscriptExpanded] = useState(true);

  const displayStage = data.application
    ? stageDbToDisplay[data.application.stage as ApplicationStage] || "Applied"
    : "Applied";

  if (activeTab === "overview") {
    return (
      <div className="space-y-4 text-xs">
        {/* Profile Header */}
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">{data.candidate.fullName}</h3>
            {data.application && <StageBadge stage={displayStage} />}
          </div>
          <p className="text-muted-foreground">{data.candidate.headline || "No headline provided"}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-white/5 text-[11px]">
            <div>
              <span className="text-muted-foreground block">Email</span>
              <span className="font-medium truncate block">{data.candidate.email}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Phone</span>
              <span className="font-medium">{data.candidate.phone || "Not provided"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Location</span>
              <span className="font-medium">{data.candidate.location || "Not provided"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Total Experience</span>
              <span className="font-medium">{data.candidate.experienceYears} years</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Current/Latest Role</span>
              <span className="font-medium">{data.candidate.currentRole || "Not provided"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Applied Role</span>
              <span className="font-medium">{data.application?.jobTitle || "—"}</span>
            </div>
          </div>
        </div>

        {/* Professional Summary */}
        <div>
          <h4 className="font-semibold text-xs mb-1">Professional Summary</h4>
          <p className="text-muted-foreground leading-relaxed bg-white/[0.01] border border-white/5 rounded-md p-2.5">
            {data.candidate.summary || "No professional summary provided."}
          </p>
        </div>

        {/* Resume Actions */}
        <div className="rounded-md border border-white/10 p-3 bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <div>
              <p className="font-medium text-xs">{data.resume.fileName || "Uploaded Resume"}</p>
              <p className="text-[10px] text-muted-foreground">
                Status: {data.resume.parsingStatus} · Uploaded: {data.resume.uploadedAt || "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {data.resume.signedUrl ? (
              <a href={data.resume.signedUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 cursor-pointer">
                  <ExternalLink className="h-3 w-3" /> View CV
                </Button>
              </a>
            ) : data.resume.fileUrl ? (
              <a href={data.resume.fileUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 cursor-pointer">
                  <ExternalLink className="h-3 w-3" /> View CV
                </Button>
              </a>
            ) : (
              <span className="text-[10px] text-muted-foreground italic">No CV uploaded</span>
            )}
          </div>
        </div>

        {/* Education & Certifications */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <h4 className="font-semibold text-xs mb-1 flex items-center gap-1">
              <GraduationCap className="h-3.5 w-3.5 text-primary" /> Education
            </h4>
            {data.education.length > 0 ? (
              <div className="space-y-1.5">
                {data.education.map((ed) => (
                  <div key={ed.id} className="rounded border border-white/5 p-2 bg-white/[0.01]">
                    <p className="font-medium text-[11px]">{ed.degree}</p>
                    <p className="text-muted-foreground text-[10px]">{ed.institution} {ed.grade ? `(${ed.grade})` : ""}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground italic text-[11px]">No education listed</p>
            )}
          </div>

          <div>
            <h4 className="font-semibold text-xs mb-1 flex items-center gap-1">
              <Award className="h-3.5 w-3.5 text-primary" /> Certifications & Languages
            </h4>
            {data.certifications.length > 0 || data.languages.length > 0 ? (
              <div className="space-y-1.5">
                {data.certifications.map((c) => (
                  <div key={c.id} className="rounded border border-white/5 p-2 bg-white/[0.01]">
                    <p className="font-medium text-[11px]">{c.name}</p>
                    <p className="text-muted-foreground text-[10px]">{c.issuer} {c.year ? `(${c.year})` : ""}</p>
                  </div>
                ))}
                {data.languages.map((l) => (
                  <div key={l.id} className="flex items-center justify-between rounded border border-white/5 p-1.5 bg-white/[0.01]">
                    <span className="text-[11px] font-medium">{l.name}</span>
                    <span className="text-[10px] text-muted-foreground capitalize">{l.level}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground italic text-[11px]">No certifications listed</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === "skills") {
    return (
      <div className="space-y-3 text-xs">
        <h4 className="font-semibold text-xs">Extracted & Confirmed Skills</h4>
        {data.skills.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {data.skills.map((s) => (
              <span
                key={s.id}
                className="text-[11px] rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-primary font-medium"
              >
                {s.name}
              </span>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-white/15 p-4 text-center text-muted-foreground">
            No skills extracted from candidate CV or profile.
          </div>
        )}
      </div>
    );
  }

  if (activeTab === "experience") {
    return (
      <div className="space-y-3 text-xs">
        <h4 className="font-semibold text-xs">Work Experience ({data.experience.length})</h4>
        {data.experience.length > 0 ? (
          <div className="space-y-2.5">
            {data.experience.map((e) => (
              <div key={e.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="font-semibold text-[13px] text-primary">{e.jobTitle}</h5>
                    <p className="text-muted-foreground text-[11px] font-medium">
                      {e.company} {e.location ? `· ${e.location}` : ""}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-white/10">
                    {e.duration}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {e.startDate || "N/A"} — {e.isCurrent ? "Present" : e.endDate || "N/A"}
                </p>
                {e.description && (
                  <p className="text-[11px] text-muted-foreground mt-1 whitespace-pre-wrap">
                    {e.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-white/15 p-4 text-center text-muted-foreground">
            No employment history extracted.
          </div>
        )}
      </div>
    );
  }

  if (activeTab === "assessment") {
    if (!data.assessment) {
      return (
        <div className="rounded-md border border-dashed border-white/15 p-6 text-center text-muted-foreground space-y-1 text-xs">
          <AlertCircle className="h-5 w-5 mx-auto text-amber-400" />
          <p className="font-medium text-foreground">No assessment assigned for this application</p>
          <p className="text-[11px]">When an assessment is created or assigned to this job application, results will appear here.</p>
        </div>
      );
    }

    const { assessment } = data;
    return (
      <div className="space-y-4 text-xs">
        {/* Summary Card */}
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-sm">{assessment.title}</h4>
              <p className="text-[10px] text-muted-foreground">
                Status: <span className="font-medium capitalize text-foreground">{assessment.status}</span>
              </p>
            </div>
            {assessment.percentage !== null && (
              <Badge className={assessment.passed ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border-rose-500/30"}>
                {assessment.passed ? "Passed" : "Failed"} ({assessment.percentage}%)
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-2 border-t border-white/5">
            <div>
              <span className="text-muted-foreground block">Started</span>
              <span className="font-medium">{assessment.startedAt ? new Date(assessment.startedAt).toLocaleString() : "Not started"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Submitted</span>
              <span className="font-medium">{assessment.submittedAt ? new Date(assessment.submittedAt).toLocaleString() : "Pending"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Questions</span>
              <span className="font-medium">{assessment.answeredQuestions} / {assessment.totalQuestions}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Points</span>
              <span className="font-medium">{assessment.earnedPoints} / {assessment.totalPoints}</span>
            </div>
          </div>
        </div>

        {/* Questions breakdown */}
        <div className="space-y-2.5">
          <h4 className="font-semibold text-xs">Question & Candidate Answer Breakdown</h4>
          {assessment.questions.length > 0 ? (
            assessment.questions.map((q, idx) => (
              <div key={q.id} className="rounded-md border border-white/10 bg-white/[0.01] p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-[11px] text-primary">Q{idx + 1}. {q.prompt}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {q.earnedPoints !== null ? `${q.earnedPoints} / ${q.points} pts` : `${q.points} pts`}
                  </span>
                </div>

                <div className="space-y-1 bg-black/20 p-2 rounded text-[11px]">
                  <div>
                    <span className="text-muted-foreground font-medium">Candidate Answer: </span>
                    <span className="text-foreground">{q.candidateAnswer || <em className="text-muted-foreground">No answer provided</em>}</span>
                  </div>
                  {q.correctAnswer && (
                    <div>
                      <span className="text-muted-foreground font-medium">Expected / Rubric: </span>
                      <span className="text-emerald-400">{q.correctAnswer}</span>
                    </div>
                  )}
                  {q.feedback && (
                    <div className="text-[10px] text-amber-300/90 pt-1 border-t border-white/5">
                      <strong>AI/HR Feedback:</strong> {q.feedback}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground italic">No question records available.</p>
          )}
        </div>
      </div>
    );
  }

  if (activeTab === "interview") {
    if (!data.interview) {
      return (
        <div className="rounded-md border border-dashed border-white/15 p-6 text-center text-muted-foreground space-y-1 text-xs">
          <MessageSquare className="h-5 w-5 mx-auto text-primary" />
          <p className="font-medium text-foreground">AI Interview Not Started</p>
          <p className="text-[11px]">No AI interview session has been conducted for this application yet.</p>
        </div>
      );
    }

    const { interview } = data;
    return (
      <div className="space-y-4 text-xs">
        {/* Interview Metrics Header */}
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-sm">AI Interview Results</h4>
              <p className="text-[10px] text-muted-foreground">
                Status: <span className="font-medium capitalize text-foreground">{interview.status}</span> · Duration: {interview.durationMinutes ? `${interview.durationMinutes} mins` : "N/A"}
              </p>
            </div>
            {interview.overallScore !== null && (
              <ScoreRing score={interview.overallScore} size={48} />
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-2 border-t border-white/5">
            <div className="bg-white/5 p-2 rounded border border-white/5 text-center">
              <span className="text-muted-foreground block text-[10px]">Technical</span>
              <span className="font-bold text-sm">{interview.technicalScore !== null ? `${interview.technicalScore}%` : "Pending"}</span>
            </div>
            <div className="bg-white/5 p-2 rounded border border-white/5 text-center">
              <span className="text-muted-foreground block text-[10px]">Communication</span>
              <span className="font-bold text-sm">{interview.communicationScore !== null ? `${interview.communicationScore}%` : "Pending"}</span>
            </div>
            <div className="bg-white/5 p-2 rounded border border-white/5 text-center">
              <span className="text-muted-foreground block text-[10px]">Confidence</span>
              <span className="font-bold text-sm">{interview.confidenceScore !== null ? `${interview.confidenceScore}%` : "Pending"}</span>
            </div>
            <div className="bg-white/5 p-2 rounded border border-white/5 text-center">
              <span className="text-muted-foreground block text-[10px]">Behavioral</span>
              <span className="font-bold text-sm">{interview.behavioralScore !== null ? `${interview.behavioralScore}%` : "Pending"}</span>
            </div>
          </div>

          {interview.summary && (
            <div className="pt-2 border-t border-white/5">
              <p className="font-semibold text-[11px] mb-0.5">Summary & Recommendation</p>
              <p className="text-muted-foreground text-[11px]">{interview.summary}</p>
            </div>
          )}
        </div>

        {/* Transcript Viewer */}
        <div className="rounded-lg border border-white/10 bg-white/[0.01] p-3 space-y-2">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setTranscriptExpanded(!transcriptExpanded)}>
            <h4 className="font-semibold text-xs flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-primary" /> Full Interview Transcript ({interview.transcript.length} turns)
            </h4>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              {transcriptExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>

          {transcriptExpanded && (
            <div className="max-h-[350px] overflow-y-auto space-y-2 pr-1 pt-2 border-t border-white/5">
              {interview.transcript.length > 0 ? (
                interview.transcript.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-2.5 rounded-md text-[11px] ${
                      msg.role === "assistant"
                        ? "bg-primary/10 border border-primary/20 text-foreground"
                        : "bg-white/5 border border-white/10 ml-4 text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                      <span className="font-semibold">{msg.role === "assistant" ? "AI Interviewer" : data.candidate.fullName}</span>
                      <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground italic text-center py-4">No transcript messages recorded.</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (activeTab === "scoring") {
    const { scoring } = data;
    return (
      <div className="space-y-4 text-xs">
        {/* Overall Score Header */}
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block mb-1">
              AI Composite Candidate Score
            </span>
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-bold">
                {scoring.overallScore !== null ? `${scoring.overallScore}%` : "Pending"}
              </h3>
              <Badge className="bg-primary/20 text-primary border-primary/30">
                {scoring.recommendation}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 max-w-md">{scoring.explanation}</p>
          </div>
          {scoring.overallScore !== null && <ScoreRing score={scoring.overallScore} size={64} />}
        </div>

        {/* Component Scores Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="rounded-md border border-white/10 p-3 bg-white/[0.01]">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-[11px]">CV & Job Match (25%)</span>
              <span className="font-bold text-xs">{scoring.matchScore !== null ? `${scoring.matchScore}%` : "Pending"}</span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${scoring.matchScore || 0}%` }} />
            </div>
          </div>

          <div className="rounded-md border border-white/10 p-3 bg-white/[0.01]">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-[11px]">Skills & Experience (20%)</span>
              <span className="font-bold text-xs">{scoring.experienceScore !== null ? `${scoring.experienceScore}%` : "Pending"}</span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${scoring.experienceScore || 0}%` }} />
            </div>
          </div>

          <div className="rounded-md border border-white/10 p-3 bg-white/[0.01]">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-[11px]">Assessment (30%)</span>
              <span className="font-bold text-xs">{scoring.assessmentScore !== null ? `${scoring.assessmentScore}%` : "Pending"}</span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${scoring.assessmentScore || 0}%` }} />
            </div>
          </div>

          <div className="rounded-md border border-white/10 p-3 bg-white/[0.01]">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-[11px]">AI Interview (25%)</span>
              <span className="font-bold text-xs">{scoring.interviewScore !== null ? `${scoring.interviewScore}%` : "Pending"}</span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${scoring.interviewScore || 0}%` }} />
            </div>
          </div>
        </div>

        {/* Stage Status Warnings */}
        {!scoring.isComplete && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200 text-[11px] flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
            <span>
              Some recruitment stages remain incomplete. Overall score is rescaled only from completed evidence.
            </span>
          </div>
        )}
      </div>
    );
  }

  return null;
}
