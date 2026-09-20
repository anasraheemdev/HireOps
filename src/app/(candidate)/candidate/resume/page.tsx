"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  FileUp,
  AlertTriangle,
  Loader2,
  RotateCcw,
  Send,
  Plus,
  Trash2,
  X,
  UserCheck,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, PageSkeleton } from "@/components/shared/enterprise-ui";
import { MotionPage } from "@/components/shared/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScoreRing } from "@/components/shared/score-ring";
import { useMeQuery } from "@/lib/queries/use-candidate-portal";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ParsedResume } from "@/lib/ai/resume-schema";

type Step = "upload" | "parsing" | "review";

export default function CandidateResumePage() {
  const { data: meData, isLoading, isError, error, refetch } = useMeQuery();
  const qc = useQueryClient();
  const router = useRouter();

  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [resumeText, setResumeText] = useState<string | null>(null);
  const [resumeFilePath, setResumeFilePath] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [fallbackUsed, setFallbackUsed] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editable Profile Draft State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [headline, setHeadline] = useState("");
  const [summary, setSummary] = useState("");
  const [experienceYears, setExperienceYears] = useState(0);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [experience, setExperience] = useState<{ role: string; company: string; period?: string | null }[]>([]);
  const [education, setEducation] = useState<{ degree: string; institution: string; period?: string | null }[]>([]);

  const handleUploadAndParse = async (file: File) => {
    setCurrentFile(file);
    setFileName(file.name);
    setUploading(true);
    setStep("parsing");

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/candidate/resume", {
        method: "POST",
        body: form,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to extract text from resume");

      const result = json.data as {
        parsed: ParsedResume;
        confidence: number;
        warnings: string[];
        resumeText: string;
        resumeFilePath: string;
        aiParsingSucceeded?: boolean;
        fallbackUsed?: boolean;
      };

      setFullName(String(result.parsed.fullName || meData?.candidate?.full_name || meData?.profile?.full_name || ""));
      setEmail(String(result.parsed.email || meData?.profile?.email || meData?.candidate?.email || ""));
      setPhone(String(result.parsed.phone || meData?.candidate?.phone || meData?.profile?.phone || ""));
      setLocation(String(result.parsed.location || meData?.candidate?.location || ""));
      setHeadline(String(result.parsed.headline || meData?.candidate?.headline || ""));
      setSummary(String(result.parsed.summary || (meData?.candidate as { summary?: string })?.summary || ""));
      setExperienceYears(Number(result.parsed.experienceYears || meData?.candidate?.experience_years || 0));
      setSkills(result.parsed.skills || []);
      setExperience(result.parsed.experience || []);
      setEducation(result.parsed.education || []);
      setConfidence(result.confidence);
      setWarnings(result.warnings || []);
      setResumeText(result.resumeText);
      setResumeFilePath(result.resumeFilePath);
      setFallbackUsed(Boolean(result.fallbackUsed));
      setStep("review");
      if (result.fallbackUsed) {
        toast.warning("AI parsing service was temporarily unavailable. Basic profile fields were extracted locally — please review your details.");
      } else {
        toast.success("Resume parsed with AI! Please review and confirm your profile details.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "CV Parsing failed");
      setStep("upload");
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmProfile = async () => {
    if (!fullName.trim()) {
      toast.error("Full name is required to confirm profile.");
      return;
    }
    setConfirming(true);
    try {
      const res = await fetch("/api/candidate/profile/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          location,
          headline,
          summary,
          experienceYears,
          skills,
          experience,
          education,
          resumeFilePath,
          resumeText,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Profile confirmation failed.");

      toast.success("Profile confirmed and embedding recomputed successfully!");
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["candidate-documents"] });
      qc.invalidateQueries({ queryKey: ["jobs"] });

      router.push("/candidate/jobs");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Confirmation failed.");
    } finally {
      setConfirming(false);
    }
  };

  if (isLoading) return <PageSkeleton rows={4} />;
  if (isError) {
    return <ErrorState title="Could not load profile" description={error instanceof Error ? error.message : ""} onRetry={() => refetch()} />;
  }

  const isConfirmed = Boolean((meData?.candidate as { is_confirmed?: boolean })?.is_confirmed);
  const existingPath = meData?.candidate?.resume_file_path ? String(meData.candidate.resume_file_path) : null;

  return (
    <MotionPage className="space-y-4 max-w-4xl">
      <PageHeader
        title="CV & Profile Onboarding"
        description="Upload your resume (PDF or DOCX). Our AI will extract your profile fields for you to review and confirm."
      />

      {/* Confirmation Badge Notice */}
      {isConfirmed && (
        <div className="glass-card p-3 flex items-center justify-between border-emerald-500/30 bg-emerald-500/10">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold text-emerald-300">
              Profile Confirmed! Your details are active and ready for job matching.
            </span>
          </div>
          {existingPath && <p className="text-[11px] font-mono text-muted-foreground truncate max-w-[240px]">{existingPath}</p>}
        </div>
      )}

      {/* STEP 1: UPLOAD DROPZONE */}
      {step === "upload" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div
            className={`glass-card p-12 border-2 border-dashed text-center transition-colors cursor-pointer ${
              dragOver ? "border-primary/50 bg-primary/5" : "border-white/15 hover:border-white/30"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) void handleUploadAndParse(f);
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <FileUp className="h-10 w-10 text-primary mx-auto mb-3" />
            <p className="text-base font-semibold mb-1">
              {existingPath ? "Upload New Resume to Update Profile" : "Drop your resume here to start"}
            </p>
            <p className="text-xs text-muted-foreground mb-5">Supports PDF or DOCX text-based documents up to 10 MB.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleUploadAndParse(f);
              }}
            />
            <Button className="gradient-brand text-white cursor-pointer px-6" disabled={uploading}>
              Choose Resume File
            </Button>
          </div>
        </motion.div>
      )}

      {/* STEP 2: PARSING INDICATOR */}
      {step === "parsing" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <div>
            <h3 className="text-sm font-semibold">Analyzing {fileName}</h3>
            <p className="text-xs text-muted-foreground mt-1">Extracting text and structure with AI provider...</p>
          </div>
          <Progress value={75} className="h-2 max-w-sm mx-auto" />
        </motion.div>
      )}

      {/* STEP 3: REVIEW & CONFIRM FORM */}
      {step === "review" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="glass-card p-5 flex flex-wrap items-center justify-between gap-4 border-primary/30">
            <div className="flex items-center gap-3">
              <ScoreRing score={confidence} size={64} sublabel="Confidence" />
              <div>
                <h3 className="text-sm font-semibold">Review Extracted Profile Details</h3>
                <p className="text-xs text-muted-foreground">Verify and correct fields before final profile confirmation.</p>
              </div>
            </div>
            <div className="flex gap-2">
              {fallbackUsed && currentFile && (
                <Button
                  size="xs"
                  className="gradient-brand text-white text-xs gap-1"
                  onClick={() => void handleUploadAndParse(currentFile)}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Retry AI Parsing
                </Button>
              )}
              <Button size="xs" variant="outline" className="text-xs gap-1 border-white/10" onClick={() => setStep("upload")}>
                <RotateCcw className="h-3.5 w-3.5" /> Upload Different File
              </Button>
            </div>
          </div>

          {/* Warnings Alert */}
          {warnings.length > 0 && (
            <div className="glass-card p-4 border-amber-500/20 bg-amber-500/5 space-y-1.5">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                <AlertTriangle className="h-4 w-4" /> Attention Required: Missing or Low-Confidence Fields
              </div>
              <ul className="text-xs text-muted-foreground space-y-1 pl-6 list-disc">
                {warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Editable Form Fields */}
          <div className="glass-card p-6 space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Personal Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="location">Location</Label>
                <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Country" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="headline">Professional Headline</Label>
                <Input id="headline" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Senior Software Engineer" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exp">Years of Experience</Label>
                <Input
                  id="exp"
                  type="number"
                  min={0}
                  max={50}
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(Number(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <Label htmlFor="summary">Professional Summary</Label>
              <textarea
                id="summary"
                className="w-full min-h-[80px] rounded-md border border-white/10 bg-white/5 p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Brief professional overview..."
              />
            </div>

            {/* Skills */}
            <div className="space-y-2 pt-2">
              <Label>Skills &amp; Competencies</Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {skills.map((s) => (
                  <Badge key={s} variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-500/20 text-xs gap-1">
                    {s}
                    <button onClick={() => setSkills((arr) => arr.filter((x) => x !== s))}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2 max-w-md">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && skillInput.trim()) {
                      e.preventDefault();
                      setSkills((prev) => [...new Set([...prev, skillInput.trim()])]);
                      setSkillInput("");
                    }
                  }}
                  placeholder="Type a skill and press Enter"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Experience List */}
            <div className="space-y-3 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Work Experience</Label>
                <Button
                  size="xs"
                  variant="ghost"
                  className="text-xs gap-1"
                  onClick={() => setExperience((prev) => [...prev, { role: "", company: "", period: "" }])}
                >
                  <Plus className="h-3.5 w-3.5" /> Add Experience
                </Button>
              </div>
              {experience.map((exp, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end p-2.5 rounded-lg bg-white/5 border border-white/10">
                  <Input
                    placeholder="Role"
                    value={exp.role}
                    onChange={(e) => setExperience((arr) => arr.map((item, i) => (i === idx ? { ...item, role: e.target.value } : item)))}
                    className="h-8 text-xs"
                  />
                  <Input
                    placeholder="Company"
                    value={exp.company}
                    onChange={(e) => setExperience((arr) => arr.map((item, i) => (i === idx ? { ...item, company: e.target.value } : item)))}
                    className="h-8 text-xs"
                  />
                  <Input
                    placeholder="Period (e.g. 2021-Present)"
                    value={exp.period || ""}
                    onChange={(e) => setExperience((arr) => arr.map((item, i) => (i === idx ? { ...item, period: e.target.value } : item)))}
                    className="h-8 text-xs"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-rose-400"
                    onClick={() => setExperience((arr) => arr.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Education List */}
            <div className="space-y-3 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Education</Label>
                <Button
                  size="xs"
                  variant="ghost"
                  className="text-xs gap-1"
                  onClick={() => setEducation((prev) => [...prev, { degree: "", institution: "", period: "" }])}
                >
                  <Plus className="h-3.5 w-3.5" /> Add Education
                </Button>
              </div>
              {education.map((edu, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end p-2.5 rounded-lg bg-white/5 border border-white/10">
                  <Input
                    placeholder="Degree"
                    value={edu.degree}
                    onChange={(e) => setEducation((arr) => arr.map((item, i) => (i === idx ? { ...item, degree: e.target.value } : item)))}
                    className="h-8 text-xs"
                  />
                  <Input
                    placeholder="Institution"
                    value={edu.institution}
                    onChange={(e) => setEducation((arr) => arr.map((item, i) => (i === idx ? { ...item, institution: e.target.value } : item)))}
                    className="h-8 text-xs"
                  />
                  <Input
                    placeholder="Period"
                    value={edu.period || ""}
                    onChange={(e) => setEducation((arr) => arr.map((item, i) => (i === idx ? { ...item, period: e.target.value } : item)))}
                    className="h-8 text-xs"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-rose-400"
                    onClick={() => setEducation((arr) => arr.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" className="bg-white/5 border-white/10" onClick={() => setStep("upload")} disabled={confirming}>
              Cancel / Re-upload
            </Button>
            <Button
              className="gradient-brand text-white gap-2 px-6 cursor-pointer"
              disabled={confirming}
              onClick={() => void handleConfirmProfile()}
            >
              {confirming ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving Profile &amp; Embeddings…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Confirm Profile &amp; View Job Recommendations
                </>
              )}
            </Button>
          </div>
        </motion.div>
      )}
    </MotionPage>
  );
}
