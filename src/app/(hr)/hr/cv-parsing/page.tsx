"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  UploadCloud,
  FileText,
  X,
  CheckCircle2,
  Loader2,
  Sparkles,
  AlertTriangle,
  Plus,
  Trash2,
  RotateCcw,
  Send,
  ScanLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/shared/page-header";
import { ScoreRing } from "@/components/shared/score-ring";
import { toast } from "sonner";
import { useCreateCandidateMutation, useParseResumeMutation } from "@/lib/queries/use-ai";
import type { LanguageLevel } from "@/lib/supabase/database.types";

type Step = "upload" | "uploading" | "parsing" | "review";

type ExpItem = { role: string; company: string; period: string };
type EduItem = { degree: string; institution: string; period: string };

const parsingStages = [
  "Extracting text from document",
  "Identifying document structure",
  "Parsing work experience",
  "Detecting skills & competencies",
  "Cross-referencing certifications",
  "Checking extracted fields",
];

function formatLanguage(name: string, level: string) {
  const label = level.charAt(0).toUpperCase() + level.slice(1);
  return `${name} (${label})`;
}

function parseLanguageDisplay(value: string): { name: string; level: LanguageLevel } {
  const match = value.match(/^(.+?)\s*\((.+)\)$/);
  if (!match) return { name: value.trim(), level: "professional" };
  const levelRaw = match[2].toLowerCase();
  const allowed: LanguageLevel[] = ["native", "fluent", "professional", "conversational", "basic"];
  const level = (allowed.find((l) => levelRaw.includes(l)) ?? "professional") as LanguageLevel;
  return { name: match[1].trim(), level };
}

function formatCert(c: { name: string; issuer?: string | null; year?: string | null }) {
  const bits = [c.name];
  if (c.issuer) bits.push(c.issuer);
  if (c.year) bits.push(c.year);
  return bits.join(" — ");
}

function parseCertDisplay(value: string): { name: string; issuer: string | null; year: string | null } {
  const parts = value.split("—").map((p) => p.trim());
  return {
    name: parts[0] || value,
    issuer: parts[1] || null,
    year: parts[2] || null,
  };
}

export default function CvParsingPage() {
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [stageIndex, setStageIndex] = useState(-1);
  const [confidence, setConfidence] = useState(0);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [resumeText, setResumeText] = useState<string | null>(null);
  const [resumeFilePath, setResumeFilePath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const parseMutation = useParseResumeMutation();
  const createMutation = useCreateCandidateMutation();

  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [experience, setExperience] = useState<ExpItem[]>([]);
  const [education, setEducation] = useState<EduItem[]>([]);
  const [experienceYears, setExperienceYears] = useState(0);

  const reset = () => {
    setStep("upload");
    setFileName("");
    setProgress(0);
    setStageIndex(-1);
    setConfidence(0);
    setWarnings([]);
    setResumeText(null);
    setResumeFilePath(null);
    setName("");
    setTitle("");
    setEmail("");
    setPhone("");
    setLocation("");
    setSkills([]);
    setLanguages([]);
    setCertifications([]);
    setExperience([]);
    setEducation([]);
    setExperienceYears(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const runParse = useCallback(
    async (file: File) => {
      setFileName(file.name);
      setStep("uploading");
      setProgress(15);

      const progressTimer = setInterval(() => {
        setProgress((p) => (p < 88 ? p + 4 : p));
      }, 280);

      try {
        setTimeout(() => {
          setStep("parsing");
          setStageIndex(0);
        }, 400);

        const stageTimer = setInterval(() => {
          setStageIndex((i) => (i < parsingStages.length - 1 ? i + 1 : i));
        }, 700);

        const result = await parseMutation.mutateAsync(file);
        clearInterval(progressTimer);
        clearInterval(stageTimer);
        setProgress(100);
        setStageIndex(parsingStages.length - 1);

        setName(result.fullName);
        setTitle(result.headline ?? "");
        setEmail(result.email || "");
        setPhone(result.phone ?? "");
        setLocation(result.location ?? "");
        setSkills(result.skills ?? []);
        setLanguages((result.languages ?? []).map((l) => formatLanguage(l.name, l.level)));
        setCertifications((result.certifications ?? []).map(formatCert));
        setExperience(
          (result.experience ?? []).map((e) => ({
            role: e.role,
            company: e.company,
            period: e.period ?? "",
          }))
        );
        setEducation(
          (result.education ?? []).map((e) => ({
            degree: e.degree,
            institution: e.institution,
            period: e.period ?? "",
          }))
        );
        setExperienceYears(result.experienceYears ?? 0);
        setConfidence(result.confidence);
        setWarnings(result.warnings ?? []);
        setResumeText(result.resumeText);
        setResumeFilePath(result.resumeFilePath);
        setStep("review");
      } catch (err) {
        clearInterval(progressTimer);
        toast.error(err instanceof Error ? err.message : "Failed to parse resume");
        reset();
      }
    },
    [parseMutation]
  );



  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    try {
      await createMutation.mutateAsync({
        fullName: name.trim(),
        headline: title || null,
        email: email.trim(),
        phone: phone || null,
        location: location || null,
        experienceYears,
        skills,
        languages: languages.map(parseLanguageDisplay),
        certifications: certifications.map(parseCertDisplay),
        experience: experience.filter((e) => e.role && e.company),
        education: education.filter((e) => e.degree && e.institution),
        resumeText,
        resumeFilePath,
        source: "cv_parse",
      });
      toast.success(`${name} added to candidate pipeline`);
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save candidate");
    }
  };

  const missingFields = [
    ...warnings,
    !phone && "Phone number could not be confidently extracted",
    experience.length === 0 && "No work experience detected",
  ].filter((v, i, arr): v is string => Boolean(v) && arr.indexOf(v) === i);

  return (
    <div>
      <PageHeader title="CV Parsing" description="Upload a resume and let AI extract structured candidate data automatically." />

      {step === "upload" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) void runParse(f);
            }}
            className={`glass-card border-2 border-dashed transition-colors p-16 flex flex-col items-center justify-center text-center cursor-pointer ${
              dragOver ? "border-blue-400 bg-blue-500/5" : "border-white/15"
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void runParse(f);
              }}
            />
            <motion.div
              animate={{ y: dragOver ? -6 : 0, scale: dragOver ? 1.05 : 1 }}
              className="h-20 w-20 rounded-2xl gradient-brand glow-ring flex items-center justify-center mb-5"
            >
              <UploadCloud className="h-10 w-10 text-white" />
            </motion.div>
            <p className="text-lg font-medium">Drag &amp; drop a resume here</p>
            <p className="text-sm text-muted-foreground mt-1">or click to browse — supports PDF, DOC, DOCX up to 10MB</p>
            <Button
              className="mt-5 gradient-brand text-white gap-2"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <FileText className="h-4 w-4" /> Choose Resume
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6">
            {[
              { icon: ScanLine, label: "OCR + NLP Extraction", desc: "Reads scanned and native PDFs alike" },
              { icon: Sparkles, label: "AI Field Mapping", desc: "Auto-fills structured candidate profiles" },
              { icon: CheckCircle2, label: "Completeness Check", desc: "Flags missing fields for human review" },
            ].map((f) => (
              <div key={f.label} className="glass-card p-4">
                <f.icon className="h-4 w-4 text-blue-400 mb-2" />
                <p className="text-sm font-medium">{f.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {step === "uploading" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl mx-auto glass-card p-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-11 w-11 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <FileText className="h-5 w-5 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{fileName}</p>
              <p className="text-xs text-muted-foreground">Uploading securely...</p>
            </div>
            <button onClick={reset} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <Progress value={Math.min(progress, 100)} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2 text-right">{Math.min(Math.round(progress), 100)}%</p>
        </motion.div>
      )}

      {step === "parsing" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl mx-auto glass-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="h-11 w-11 rounded-xl gradient-brand flex items-center justify-center"
            >
              <Sparkles className="h-5 w-5 text-white" />
            </motion.div>
            <div>
              <p className="text-sm font-medium">AI is analyzing {fileName}</p>
              <p className="text-xs text-muted-foreground">Real OpenRouter extraction in progress</p>
            </div>
          </div>
          <div className="space-y-3">
            {parsingStages.map((s, i) => (
              <div key={s} className="flex items-center gap-3">
                {i < stageIndex ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : i === stageIndex ? (
                  <Loader2 className="h-4 w-4 text-blue-400 shrink-0 animate-spin" />
                ) : (
                  <div className="h-4 w-4 rounded-full border border-white/15 shrink-0" />
                )}
                <span className={`text-sm ${i <= stageIndex ? "text-foreground" : "text-muted-foreground/50"}`}>{s}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {step === "review" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
          <div className="space-y-5">
            <div className="glass-card p-6 text-center">
              <Avatar className="h-16 w-16 mx-auto border-2 border-white/10">
                <AvatarFallback className="gradient-brand text-white text-xl font-semibold">
                  {name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <p className="mt-3 font-semibold">{name}</p>
              <p className="text-xs text-muted-foreground">{title}</p>
              <div className="flex justify-center mt-4">
                <ScoreRing score={confidence} size={100} sublabel="Completeness" />
              </div>
              <Badge variant="outline" className="mt-3 bg-emerald-500/10 text-emerald-300 border-emerald-500/20 text-[10px]">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Parsed from {fileName}
              </Badge>
            </div>

            {missingFields.length > 0 && (
              <div className="glass-card p-5 border-amber-500/20">
                <div className="flex items-center gap-2 mb-3 text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  <h3 className="text-sm font-semibold">Missing Data Alerts</h3>
                </div>
                <ul className="space-y-1.5">
                  {missingFields.map((m) => (
                    <li key={m} className="text-xs text-muted-foreground flex gap-2">
                      <span className="text-amber-400">•</span> {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button variant="outline" onClick={reset} className="w-full bg-white/5 border-white/10 gap-2">
              <RotateCcw className="h-4 w-4" /> Parse Another Resume
            </Button>
          </div>

          <div className="space-y-5">
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold mb-4">Personal Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Full Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-white/5 border-white/10" />
                </div>
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-white/5 border-white/10" />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} className="bg-white/5 border-white/10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    Phone
                    {!phone && <span className="text-[10px] text-amber-400">(low confidence)</span>}
                  </Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Not detected"
                    className={`bg-white/5 border-white/10 ${!phone && "border-amber-500/40"}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Years of Experience</Label>
                  <Input
                    type="number"
                    min={0}
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(Number(e.target.value) || 0)}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Location</Label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} className="bg-white/5 border-white/10" />
                </div>
              </div>
            </div>

            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Experience Timeline</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs gap-1"
                  onClick={() => setExperience((e) => [...e, { role: "", company: "", period: "" }])}
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </div>
              <div className="space-y-3">
                {experience.map((exp, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Role</Label>
                      <Input
                        value={exp.role}
                        onChange={(e) => setExperience((arr) => arr.map((x, idx) => (idx === i ? { ...x, role: e.target.value } : x)))}
                        className="bg-white/5 border-white/10 h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Company</Label>
                      <Input
                        value={exp.company}
                        onChange={(e) => setExperience((arr) => arr.map((x, idx) => (idx === i ? { ...x, company: e.target.value } : x)))}
                        className="bg-white/5 border-white/10 h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Period</Label>
                      <Input
                        value={exp.period}
                        onChange={(e) => setExperience((arr) => arr.map((x, idx) => (idx === i ? { ...x, period: e.target.value } : x)))}
                        className="bg-white/5 border-white/10 h-9"
                      />
                    </div>
                    <Button size="icon" variant="ghost" className="h-9 w-9 text-rose-400" onClick={() => setExperience((arr) => arr.filter((_, idx) => idx !== i))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {experience.length === 0 && <p className="text-xs text-muted-foreground">No experience entries — add one manually.</p>}
              </div>
            </div>

            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Education Timeline</h3>
                <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={() => setEducation((e) => [...e, { degree: "", institution: "", period: "" }])}>
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </div>
              <div className="space-y-3">
                {education.map((edu, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Degree</Label>
                      <Input
                        value={edu.degree}
                        onChange={(e) => setEducation((arr) => arr.map((x, idx) => (idx === i ? { ...x, degree: e.target.value } : x)))}
                        className="bg-white/5 border-white/10 h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Institution</Label>
                      <Input
                        value={edu.institution}
                        onChange={(e) => setEducation((arr) => arr.map((x, idx) => (idx === i ? { ...x, institution: e.target.value } : x)))}
                        className="bg-white/5 border-white/10 h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Period</Label>
                      <Input
                        value={edu.period}
                        onChange={(e) => setEducation((arr) => arr.map((x, idx) => (idx === i ? { ...x, period: e.target.value } : x)))}
                        className="bg-white/5 border-white/10 h-9"
                      />
                    </div>
                    <Button size="icon" variant="ghost" className="h-9 w-9 text-rose-400" onClick={() => setEducation((arr) => arr.filter((_, idx) => idx !== i))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold mb-4">Skills</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {skills.map((s) => (
                  <Badge key={s} variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-500/20 gap-1">
                    {s}
                    <button onClick={() => setSkills((arr) => arr.filter((x) => x !== s))}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && skillInput.trim()) {
                      e.preventDefault();
                      setSkills((s) => [...s, skillInput.trim()]);
                      setSkillInput("");
                    }
                  }}
                  placeholder="Type a skill and press Enter"
                  className="bg-white/5 border-white/10 h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="glass-card p-6">
                <h3 className="text-sm font-semibold mb-3">Languages</h3>
                <div className="space-y-1.5">
                  {languages.map((l) => (
                    <div key={l} className="text-sm text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> {l}
                    </div>
                  ))}
                </div>
              </div>
              <div className="glass-card p-6">
                <h3 className="text-sm font-semibold mb-3">Certifications</h3>
                <div className="space-y-1.5">
                  {certifications.length === 0 && <p className="text-xs text-muted-foreground">None detected.</p>}
                  {certifications.map((c) => (
                    <div key={c} className="text-sm text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> {c}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" className="bg-white/5 border-white/10" onClick={reset} disabled={createMutation.isPending}>
                Discard
              </Button>
              <Button
                variant="outline"
                className="bg-white/5 border-white/10 text-xs gap-1.5 cursor-pointer"
                onClick={() => {
                  const link = `${window.location.origin}/candidate-signup?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`;
                  navigator.clipboard.writeText(link);
                  toast.success("Candidate invitation link copied to clipboard");
                }}
              >
                Copy Invite Link
              </Button>
              <Button className="gradient-brand text-white gap-2" onClick={() => void handleSubmit()} disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Review &amp; Submit to Pipeline
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
