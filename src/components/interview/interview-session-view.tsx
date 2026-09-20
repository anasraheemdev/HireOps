"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Bot, Mic, Send, Square, Loader2, Sparkles, AudioLines } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { MetricBar, StatusBadge } from "@/components/shared/enterprise-ui";
import { SpeakingAvatar } from "@/components/avatar/speaking-avatar";
import { apiFetch } from "@/lib/api/fetcher";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Msg = { id: string; role: string; content: string; metadata?: Record<string, unknown> };

const TARGET_ROUNDS = 8;

function formatTimer(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function Waveform({ active, level }: { active: boolean; level: number }) {
  const bars = 16;
  return (
    <div className="flex items-end gap-0.5 h-8" aria-hidden>
      {Array.from({ length: bars }).map((_, i) => {
        const h = active ? Math.max(4, Math.sin((i + level * 10) / 2) * 12 + level * 20 + 6) : 4;
        return (
          <motion.div
            key={i}
            className="w-1 rounded-full bg-primary/70"
            animate={{ height: h }}
            transition={{ duration: 0.12 }}
          />
        );
      })}
    </div>
  );
}

export function InterviewSessionView({
  sessionId,
  backHref,
  showNotes = false,
}: {
  sessionId: string;
  backHref: string;
  showNotes?: boolean;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [session, setSession] = useState<Record<string, unknown> | null>(null);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<Record<string, unknown> | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [listening, setListening] = useState(false);
  const [level, setLevel] = useState(0);
  const [note, setNote] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  const load = useCallback(async () => {
    const data = await apiFetch<{ session: Record<string, unknown>; messages: Msg[] }>(
      `/api/interviews/${sessionId}`
    );
    setSession(data.session);
    setMessages(data.messages);
    if(data.session.status === "completed") setEvaluation({ ...data.session, ...(data.session.scores as object ?? {}) });
  }, [sessionId]);

  useEffect(() => {
    const timer = setTimeout(() => { void load().catch((e) => toast.error(e.message)); }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  useEffect(() => {
    if (session?.status === "completed") return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [session?.status]);

  // Realtime transcript
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`interview-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "interview_messages", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const row = payload.new as Msg;
          setMessages((prev) =>
            prev.some((m) => m.id === row.id || (m.role === row.role && m.content === row.content))
              ? prev
              : [...prev, row]
          );
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const isCandidatePortal = backHref.startsWith("/candidate");
  const userRounds = useMemo(() => messages.filter((m) => m.role === "user").length, [messages]);
  const progress = Math.min(100, Math.round((userRounds / TARGET_ROUNDS) * 100));
  const questions = messages.filter((m) => m.role === "assistant");
  /** Speak only finished assistant turns (not mid-stream) */
  const speakText = useMemo(() => {
    if (!isCandidatePortal || streamingId) return null;
    const last = [...messages].reverse().find((m) => m.role === "assistant" && m.content.trim());
    return last?.content ?? null;
  }, [isCandidatePortal, messages, streamingId]);

  const sendStream = async (content: string) => {
    if (!content.trim() || thinking) return;
    setInput("");
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "user", content }]);
    setThinking(true);
    const assistantId = crypto.randomUUID();
    setStreamingId(assistantId);
    setMessages((m) => [...m, { id: assistantId, role: "assistant", content: "" }]);

    try {
      const res = await fetch(`/api/interviews/${sessionId}/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok || !res.body) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Stream failed");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let meta: Record<string, unknown> | undefined;
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
          const data = JSON.parse(dataLine) as Record<string, unknown>;
          if (event === "delta") {
            const text = String(data.text ?? "");
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + text } : m))
            );
          }
          if (event === "done") {
            meta = data.meta as Record<string, unknown>;
            const finalMsg = data.message as Msg | undefined;
            if (finalMsg?.id) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...finalMsg, content: String(data.reply ?? m.content), metadata: meta }
                    : m
                )
              );
            }
          }
          if (event === "error") throw new Error(String(data.message ?? "Stream error"));
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setThinking(false);
      setStreamingId(null);
    }
  };

  const finalize = async () => {
    setThinking(true);
    try {
      const data = await apiFetch<{ session: Record<string, unknown>; evaluation: Record<string, unknown> }>(
        `/api/interviews/${sessionId}`,
        { method: "POST", body: JSON.stringify({ action: "finalize" }) }
      );
      setEvaluation(data.evaluation);
      setSession(data.session);
      toast.success("Interview scored");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Finalize failed");
    } finally {
      setThinking(false);
    }
  };

  const toggleMic = () => {
    const SpeechRecognition =
      typeof window !== "undefined"
        ? (window as unknown as { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition })
            .SpeechRecognition ||
          (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition
        : undefined;
    if (!SpeechRecognition) {
      toast.error("Speech recognition not supported in this browser");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      setLevel(0);
      return;
    }
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
      setLevel(0.3 + Math.random() * 0.7);
    };
    rec.onerror = () => {
      setListening(false);
      setLevel(0);
    };
    rec.onend = () => {
      setListening(false);
      setLevel(0);
    };
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  const scores = (evaluation?.scores ?? session?.scores ?? {}) as Record<string, number>;
  const cand = session?.candidates as { full_name?: string } | undefined;

  return (
    <div>
      <PageHeader
        title="AI Interview Session"
        description={`${String(session?.mode ?? "behavioral")} · ${cand?.full_name ?? "Candidate"} · ${formatTimer(elapsed)}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="cursor-pointer" onClick={() => router.push(backHref)}>
              Back
            </Button>
            <Button className="gradient-brand text-white gap-2 cursor-pointer" onClick={() => void finalize()} disabled={thinking || session?.status === "completed"}>
              <Square className="h-4 w-4" /> End & Score
            </Button>
          </div>
        }
      />

      <div className="mb-4 glass-card p-3 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[160px]">
          <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
            <span>Progress</span>
            <span>
              {userRounds}/{TARGET_ROUNDS} answers
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <motion.div className="h-full bg-primary" animate={{ width: `${progress}%` }} />
          </div>
        </div>
        <StatusBadge
          tone={
            session?.status === "completed"
              ? "success"
              : session?.status === "in_progress"
                ? "warning"
                : "info"
          }
        >
          {String(session?.status ?? "in_progress").replaceAll("_", " ")}
        </StatusBadge>
        <Waveform active={listening || !!streamingId} level={listening ? level : streamingId ? 0.5 : 0} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5">
        <div className="glass-card flex flex-col min-h-[520px]">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, idx) => (
              <motion.div
                key={m.id ? `${m.id}-${idx}` : `msg-${idx}-${m.role}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap",
                  m.role === "user" ? "ml-auto bg-primary/20" : "bg-white/5 border border-white/5"
                )}
              >
                {m.role === "assistant" && <Bot className="h-3.5 w-3.5 text-primary mb-1" />}
                {m.content || (m.id === streamingId ? "…" : "")}
              </motion.div>
            ))}
            {thinking && !streamingId && (
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {session?.status === "completed" ? (
            <div className="p-4 border-t border-white/5 bg-white/[0.02] text-center text-xs text-muted-foreground">
              This interview has been completed and submitted. Transcripts are locked.
            </div>
          ) : (
            <form
              className="p-3 border-t border-white/5 flex flex-wrap sm:flex-nowrap gap-2 items-center"
              onSubmit={(e) => {
                e.preventDefault();
                if (input.trim()) void sendStream(input);
              }}
            >
              <Button
                type="button"
                variant={listening ? "default" : "outline"}
                size="icon"
                className={cn("cursor-pointer shrink-0", listening && "bg-rose-600 text-white animate-pulse")}
                onClick={toggleMic}
                title={listening ? "Stop voice recording" : "Dictate with microphone"}
              >
                {listening ? <AudioLines className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <input
                className="flex-1 min-w-[200px] rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:border-primary"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type or dictate your answer here..."
                disabled={thinking || session?.status === "completed"}
              />
              <Button
                type="submit"
                size="sm"
                className="gradient-brand text-white cursor-pointer gap-1.5 shrink-0"
                disabled={thinking || !input.trim() || session?.status === "completed"}
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send</span>
              </Button>
            </form>
          )}
        </div>

        <div className="space-y-4">
          {isCandidatePortal && (
            <div className="glass-card p-5 flex justify-center">
              <SpeakingAvatar
                seed="Amina-HireOps-Interviewer"
                speakText={speakText}
                autoSpeak
                size={148}
              />
            </div>
          )}

          {/* EVALUATION SECTION (HR ONLY) */}
          {!isCandidatePortal && (
            <div className="glass-card p-4">
              <p className="text-xs font-semibold mb-3 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Evaluation
              </p>
              {Object.keys(scores).length === 0 ? (
                <p className="text-xs text-muted-foreground">Scores appear after you end the interview.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(scores).filter(([, v]) => typeof v === "number" && Number.isFinite(v)).map(([k, v]) => (
                    <MetricBar key={k} label={k} value={Number(v)} />
                  ))}
                </div>
              )}
              {evaluation && (
                <div className="mt-3 space-y-2 text-xs">
                  <p>
                    <span className="text-muted-foreground">Recommendation:</span>{" "}
                    <strong className="capitalize">{String(evaluation.recommendation ?? "")}</strong>
                  </p>
                  <p className="text-muted-foreground whitespace-pre-wrap">{String(evaluation.summary ?? "")}</p>
                  {Array.isArray(evaluation.strengths) && (
                    <p>
                      <strong>Strengths:</strong> {(evaluation.strengths as string[]).join("; ")}
                    </p>
                  )}
                  {Array.isArray(evaluation.risks) && (
                    <p>
                      <strong>Risks:</strong> {(evaluation.risks as string[]).join("; ")}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {isCandidatePortal && (
            <div className="glass-card p-4">
              <p className="text-xs font-semibold mb-1 flex items-center gap-1.5 text-emerald-400">
                <Sparkles className="h-3.5 w-3.5" /> Session Status
              </p>
              <p className="text-xs text-muted-foreground">
                Your responses are securely recorded and will be evaluated by the HR team after session completion.
              </p>
            </div>
          )}

          <div className="glass-card p-4">
            <p className="text-xs font-semibold mb-2">Question history</p>
            <ul className="space-y-2 max-h-48 overflow-auto">
              {questions.map((q, i) => (
                <li key={q.id ? `${q.id}-${i}` : `qhist-${i}`} className="text-[11px] text-muted-foreground border-b border-white/5 pb-2">
                  <span className="text-foreground font-medium">Q{i + 1}.</span> {q.content.slice(0, 120)}
                  {q.content.length > 120 ? "…" : ""}
                </li>
              ))}
            </ul>
          </div>

          {showNotes && (
            <form
              className="glass-card p-4 space-y-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!note.trim()) return;
                try {
                  await apiFetch("/api/notes", {
                    method: "POST",
                    body: JSON.stringify({ entityType: "interview_session", entityId: sessionId, body: note.trim() }),
                  });
                  setNote("");
                  toast.success("Note saved");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to save note");
                }
              }}
            >
              <p className="text-xs font-semibold">Recruiter notes</p>
              <textarea
                className="w-full min-h-[80px] rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <Button type="submit" size="sm" variant="outline" className="cursor-pointer">
                Save note
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// Minimal SpeechRecognition typings for browsers
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: { length: number; [i: number]: { 0: { transcript: string } } };
}
