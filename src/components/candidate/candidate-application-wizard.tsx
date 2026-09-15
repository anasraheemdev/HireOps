"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  Sparkles,
  Loader2,
  Bot,
  Mic,
  ArrowRight,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { SpeakingAvatar } from "@/components/avatar/speaking-avatar";
import { apiFetch } from "@/lib/api/fetcher";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Job } from "@/lib/types";

type Step = "cv_upload" | "assessment" | "ai_interview" | "completed";

interface Question {
  id: string;
  question: string;
  type: "multiple_choice" | "essay";
  options?: string[];
}

export function CandidateApplicationWizard({
  job,
  onClose,
}: {
  job: Job;
  onClose: () => void;
}) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("cv_upload");

  // Step 1 State: CV Upload
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2 State: Assessment Exam
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loadingExam, setLoadingExam] = useState(false);
  const [submittingExam, setSubmittingExam] = useState(false);

  // Step 3 State: Voice AI Interview
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [, setInterviewMessages] = useState<
    { id: string; role: string; content: string }[]
  >([]);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [speakingText, setSpeakingText] = useState<string | null>(null);
  const [sendingVoice, setSendingVoice] = useState(false);
  const [roundsCompleted, setRoundsCompleted] = useState(0);
  const recRef = useRef<{ stop: () => void } | null>(null);

  // 1. Submit CV & Parse -> Moves automatically to Assessment
  const handleCvSubmit = async () => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("jobId", job.id);
      if (file) form.append("file", file);

      const res = await fetch("/api/candidate/applications/apply", {
        method: "POST",
        body: file ? form : JSON.stringify({ jobId: job.id }),
        headers: file ? undefined : { "Content-Type": "application/json" },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to process resume application");

      toast.success("Resume parsed successfully!");

      const createdExam = json.data?.assessment;
      const createdSession = json.data?.interviewSession;

      if (createdExam?.assignmentId) {
        setAssignmentId(createdExam.assignmentId);
        await loadAssessmentQuestions(createdExam.assignmentId);
        setCurrentStep("assessment");
      } else if (createdSession?.id) {
        setSessionId(createdSession.id);
        await initInterviewSession(createdSession.id);
        setCurrentStep("ai_interview");
      } else {
        setCurrentStep("completed");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "CV Processing failed");
    } finally {
      setUploading(false);
    }
  };

  // 2. Load assessment questions for inline step
  const loadAssessmentQuestions = async (assignId: string) => {
    setLoadingExam(true);
    try {
      const data = await apiFetch<{
        assignment: Record<string, unknown>;
        exam: { questions: Question[] };
      }>(`/api/candidate/assessments/${assignId}`);

      setQuestions(data.exam.questions || []);
    } catch (err) {
      toast.error("Error loading assessment exam questions");
    } finally {
      setLoadingExam(false);
    }
  };

  // Submit Assessment -> Moves automatically to AI Interview
  const handleAssessmentSubmit = async () => {
    if (!assignmentId) return;
    setSubmittingExam(true);
    try {
      const res = await fetch(`/api/candidate/assessments/${assignmentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit assessment");

      toast.success("Assessment exam submitted!");

      if (sessionId) {
        await initInterviewSession(sessionId);
        setCurrentStep("ai_interview");
      } else {
        const sessionRes = await apiFetch<{ session: { id: string } }>(
          "/api/candidate/interviews",
          {
            method: "POST",
            body: JSON.stringify({ jobId: job.id }),
          }
        );
        setSessionId(sessionRes.session.id);
        await initInterviewSession(sessionRes.session.id);
        setCurrentStep("ai_interview");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Assessment submission failed");
    } finally {
      setSubmittingExam(false);
    }
  };

  // 3. Init Voice AI Interview
  const initInterviewSession = async (sessId: string) => {
    try {
      const data = await apiFetch<{
        session: Record<string, unknown>;
        messages: { id: string; role: string; content: string }[];
      }>(`/api/interviews/${sessId}`);

      setInterviewMessages(data.messages || []);
      const assistantMsg = [...(data.messages || [])]
        .reverse()
        .find((m) => m.role === "assistant");
      if (assistantMsg?.content) {
        setSpeakingText(assistantMsg.content);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle voice recognition for Voice-Only AI Interview
  const toggleSpeech = () => {
    const SpeechRecognition =
      typeof window !== "undefined"
        ? (window as unknown as { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any }).SpeechRecognition ||
          (window as unknown as { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition
        : undefined;

    if (!SpeechRecognition) {
      toast.error("Voice microphone recognition is not supported in this browser.");
      return;
    }

    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (event: any) => {
      let current = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        current += event.results[i][0].transcript;
      }
      setTranscript(current);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  // Submit voice response -> Streams AI voice answer automatically
  const handleSendVoiceResponse = async () => {
    if (!transcript.trim() || !sessionId || sendingVoice) return;
    if (listening) {
      recRef.current?.stop();
      setListening(false);
    }

    const userText = transcript;
    setTranscript("");
    setSendingVoice(true);

    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `assistant-${Date.now()}`;

    setInterviewMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", content: userText },
      { id: assistantMsgId, role: "assistant", content: "" },
    ]);

    try {
      const res = await fetch(`/api/interviews/${sessionId}/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userText }),
      });

      if (!res.ok || !res.body) throw new Error("Voice stream connection error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullReply = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const lines = part.split("\n");
          const event = lines.find((l) => l.startsWith("event:"))?.slice(6).trim();
          const dataLine = lines.find((l) => l.startsWith("data:"))?.slice(5).trim();
          if (!event || !dataLine) continue;
          const data = JSON.parse(dataLine);

          if (event === "delta") {
            fullReply += String(data.text || "");
            setInterviewMessages((prev) =>
              prev.map((m) => (m.id === assistantMsgId ? { ...m, content: fullReply } : m))
            );
          }
        }
      }

      setSpeakingText(fullReply);
      const newRounds = roundsCompleted + 1;
      setRoundsCompleted(newRounds);

      if (newRounds >= 4) {
        await apiFetch(`/api/interviews/${sessionId}`, {
          method: "POST",
          body: JSON.stringify({ action: "finalize" }),
        });
        toast.success("AI Voice Interview completed!");
        setCurrentStep("completed");
      }
    } catch (e) {
      toast.error("Failed to transmit voice response");
    } finally {
      setSendingVoice(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Step Indicator Header */}
      <div className="glass-card p-3 flex items-center justify-between gap-2 overflow-x-auto">
        {[
          { key: "cv_upload", label: "1. CV Upload & Parse" },
          { key: "assessment", label: "2. Skill Assessment" },
          { key: "ai_interview", label: "3. Voice AI Interview" },
          { key: "completed", label: "4. Confirmation" },
        ].map((s, idx) => {
          const isActive = currentStep === s.key;
          const isDone =
            (currentStep === "assessment" && idx === 0) ||
            (currentStep === "ai_interview" && idx <= 1) ||
            (currentStep === "completed" && idx <= 2);

          return (
            <div key={s.key} className="flex items-center gap-1.5 shrink-0 text-xs">
              <div
                className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center font-semibold text-[11px]",
                  isActive
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/40"
                    : isDone
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-white/10 text-muted-foreground"
                )}
              >
                {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
              </div>
              <span
                className={cn(
                  "font-medium",
                  isActive ? "text-foreground font-semibold" : "text-muted-foreground"
                )}
              >
                {s.label}
              </span>
              {idx < 3 && <span className="text-white/20 mx-1">›</span>}
            </div>
          );
        })}
      </div>

      {/* STEP 1: CV UPLOAD & PARSING */}
      {currentStep === "cv_upload" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="glass-card p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Step 1: Upload Resume / CV
            </h3>
            <p className="text-xs text-muted-foreground">
              Attach your CV (PDF or DOCX). Our AI will parse your skills and experience automatically.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setFile(f);
              }}
            />

            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                file ? "border-emerald-500/40 bg-emerald-500/5" : "border-white/15 hover:border-white/30 bg-white/[0.02]"
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="h-6 w-6 text-emerald-400" />
                  <span className="text-xs font-semibold">{file.name}</span>
                  <Button
                    size="xs"
                    variant="ghost"
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <div>
                  <UploadCloud className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs font-medium">Click or drag resume file here</p>
                  <p className="text-[10px] text-muted-foreground mt-1">PDF or DOCX formats accepted</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={uploading}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="gradient-brand text-white cursor-pointer gap-2"
              disabled={uploading}
              onClick={() => void handleCvSubmit()}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Parsing Resume…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Save CV &amp; Continue to Exam <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </motion.div>
      )}

      {/* STEP 2: SKILL ASSESSMENT EXAM */}
      {currentStep === "assessment" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-emerald-400" /> Step 2: Skill Assessment Exam
              </h3>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-300 text-[10px]">
                5 Questions
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Answer the following technical and situational questions for {job.title}.
            </p>

            {loadingExam ? (
              <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading exam questions…
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                {questions.map((q, idx) => (
                  <div key={q.id || idx} className="p-3.5 rounded-lg bg-white/5 border border-white/10 space-y-2.5">
                    <p className="text-xs font-semibold">
                      Q{idx + 1}. {q.question}
                    </p>

                    {q.type === "multiple_choice" && q.options ? (
                      <RadioGroup
                        value={answers[q.id] || ""}
                        onValueChange={(val) => setAnswers((prev) => ({ ...prev, [q.id]: val }))}
                        className="space-y-1.5"
                      >
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-2 text-xs">
                            <RadioGroupItem value={opt} id={`q-${q.id}-opt-${oIdx}`} />
                            <Label htmlFor={`q-${q.id}-opt-${oIdx}`} className="text-xs cursor-pointer">
                              {opt}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    ) : (
                      <textarea
                        className="w-full min-h-[70px] rounded-md border border-white/10 bg-white/5 p-2 text-xs"
                        placeholder="Type your explanation here…"
                        value={answers[q.id] || ""}
                        onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              className="gradient-brand text-white cursor-pointer gap-2"
              disabled={submittingExam || loadingExam}
              onClick={() => void handleAssessmentSubmit()}
            >
              {submittingExam ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Submitting Exam…
                </>
              ) : (
                <>
                  Submit Exam &amp; Start Voice AI Interview <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </motion.div>
      )}

      {/* STEP 3: VOICE & AVATAR AI INTERVIEW (NO TEXT BOX) */}
      {currentStep === "ai_interview" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="glass-card p-5 text-center space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Bot className="h-4 w-4 text-cyan-400" /> Step 3: Interactive Voice AI Interviewer
              </h3>
              <Badge variant="outline" className="bg-cyan-500/10 text-cyan-300 text-[10px]">
                Turn {roundsCompleted + 1} of 4
              </Badge>
            </div>

            {/* Glowing Speaking Avatar */}
            <div className="flex justify-center py-2">
              <SpeakingAvatar
                seed="Amina-HireOps-Interviewer"
                speakText={speakingText}
                autoSpeak
                size={160}
              />
            </div>

            {/* Live Transcript / Speech Display */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-left min-h-[90px] flex flex-col justify-between">
              <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                Your Voice Transcript:
              </p>
              <p className="text-xs font-medium italic min-h-[32px]">
                {transcript || (listening ? "Listening to your voice..." : "Click microphone button below and speak your response.")}
              </p>
            </div>

            {/* Voice Control Buttons */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant={listening ? "default" : "outline"}
                size="lg"
                className={cn(
                  "rounded-full h-14 w-14 cursor-pointer transition-all shadow-lg",
                  listening
                    ? "bg-rose-600 text-white animate-pulse ring-4 ring-rose-500/30"
                    : "border-white/20 hover:border-primary text-foreground"
                )}
                onClick={toggleSpeech}
              >
                <Mic className="h-6 w-6" />
              </Button>

              <Button
                size="lg"
                className="gradient-brand text-white cursor-pointer gap-2 h-12 px-6 rounded-xl font-medium text-xs"
                disabled={sendingVoice || !transcript.trim()}
                onClick={() => void handleSendVoiceResponse()}
              >
                {sendingVoice ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Processing Voice…
                  </>
                ) : (
                  <>
                    Transmit Voice Answer <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* STEP 4: COMPLETED CONFIRMATION */}
      {currentStep === "completed" && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-8 text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <div>
            <h3 className="text-xl font-bold tracking-tight">Application Submitted Successfully!</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1.5">
              Your resume, assessment exam responses, and voice AI interview have been saved. Your profile is under HR review.
            </p>
          </div>

          <div className="glass-card p-4 max-w-sm mx-auto text-xs space-y-2 text-left">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Position:</span>
              <span className="font-semibold">{job.title}</span>
            </div>
            <div className="flex justify-between items-center border-t border-white/10 pt-2">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant="outline" className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 capitalize">
                Under HR Review
              </Badge>
            </div>
          </div>

          <div className="pt-4 flex justify-center gap-3">
            <Button
              className="gradient-brand text-white text-xs cursor-pointer gap-2 px-6"
              onClick={() => {
                onClose();
                router.push("/candidate/applications");
              }}
            >
              View Application Progress <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
