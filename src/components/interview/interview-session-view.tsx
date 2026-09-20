"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Bot,
  Mic,
  MicOff,
  Send,
  Square,
  Loader2,
  Sparkles,
  Play,
  ChevronDown,
  ChevronUp,
  ArrowDown,
} from "lucide-react";
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

function wordCount(text: string): number {
  const cleaned = text.trim();
  return cleaned ? cleaned.split(/\s+/).length : 0;
}

// Real Web Audio API Frequency Waveform
function RealAudioWaveform({ active, stream }: { active: boolean; stream: MediaStream | null }) {
  const [level, setLevel] = useState(0);
  const animFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!active || !stream) {
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setLevel(Math.min(1, avg / 128));
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch {
      // AudioContext unavailable or blocked
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }
      setLevel(0);
    };
  }, [active, stream]);

  const bars = 16;
  return (
    <div className="flex items-center justify-center gap-1 h-8" aria-label="Microphone volume indicator">
      {Array.from({ length: bars }).map((_, i) => {
        const heightMultiplier = active ? Math.max(0.15, Math.sin((i + level * 8) / 2.2) * 0.7 + level * 0.8) : 0.15;
        const barHeight = Math.max(4, Math.min(28, heightMultiplier * 28));
        return (
          <motion.div
            key={i}
            className={cn("w-1 rounded-full transition-all duration-75", active ? "bg-[#C5A059]" : "bg-slate-700")}
            animate={{ height: barHeight }}
            transition={{ duration: 0.08 }}
          />
        );
      })}
    </div>
  );
}

// Memoized Transcript Item
const TranscriptItem = React.memo(function TranscriptItem({ message }: { message: Msg }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex flex-col gap-1 p-2.5 rounded-xl text-xs transition-colors", isUser ? "bg-[#202733] border border-[#263140] ml-6" : "bg-[#111823] border border-[#263140] mr-6")}>
      <div className="flex items-center gap-1.5 font-semibold text-[11px] text-[#94A3B8]">
        {isUser ? <span className="text-white">Candidate</span> : <span className="text-[#C5A059] flex items-center gap-1"><Bot className="h-3 w-3" /> AI Interviewer</span>}
      </div>
      <p className="text-[#F8FAFC] whitespace-pre-wrap leading-relaxed">{message.content}</p>
    </div>
  );
});

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
  const [evaluation, setEvaluation] = useState<Record<string, unknown> | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Mic & Speech Recognition States
  const [listening, setListening] = useState(false);
  const [micState, setMicState] = useState<"idle" | "requesting" | "listening" | "paused" | "denied" | "unsupported">("idle");
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  // Layout & UI States
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [note, setNote] = useState("");
  const [startingSession, setStartingSession] = useState(false);

  // Refs for Speech Recognition Accumulation & Continuous Dictation
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const recordingEnabledRef = useRef(false);
  const manualStopRef = useRef(false);
  const restartTimerRef = useRef<NodeJS.Timeout | null>(null);
  const baseInputRef = useRef("");
  const finalTranscriptRef = useRef("");
  const interimTranscriptRef = useRef("");

  // Refs for Throttled Stream Flushing & AbortController
  const streamBufferRef = useRef("");
  const flushTimerRef = useRef<NodeJS.Timeout | null>(null);
  const streamAbortControllerRef = useRef<AbortController | null>(null);
  const transcriptScrollRef = useRef<HTMLDivElement>(null);

  const isCandidatePortal = backHref.startsWith("/candidate");

  // Load Session & Messages
  const load = useCallback(async () => {
    const data = await apiFetch<{ session: Record<string, unknown>; messages: Msg[] }>(`/api/interviews/${sessionId}`);
    setSession(data.session);
    setMessages(data.messages);
    if (data.session.status === "completed") {
      setEvaluation({ ...data.session, ...(data.session.scores as object ?? {}) });
    }
  }, [sessionId]);

  useEffect(() => {
    const timer = setTimeout(() => { void load().catch((e) => toast.error(e.message)); }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  // Session Timer
  useEffect(() => {
    if (session?.status === "completed") return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [session?.status]);

  // Supabase Realtime Subscription for Transcript Updates
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

  // Auto-scroll transcript on new message unless user scrolled up
  useEffect(() => {
    if (!userScrolledUp && transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
    }
  }, [messages, thinking, userScrolledUp]);

  const userRounds = useMemo(() => messages.filter((m) => m.role === "user").length, [messages]);
  const progress = Math.min(100, Math.round((userRounds / TARGET_ROUNDS) * 100));

  // Current Assistant Question (Last assistant message)
  const currentQuestion = useMemo(() => {
    const assistantMsgs = messages.filter((m) => m.role === "assistant");
    return assistantMsgs[assistantMsgs.length - 1]?.content || null;
  }, [messages]);

  // Stop Recording Helper
  const stopRecording = useCallback(() => {
    recordingEnabledRef.current = false;
    manualStopRef.current = true;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore state error */
      }
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }
    setListening(false);
    setMicState("idle");
  }, [mediaStream]);

  // Start Voice Interview Gesture Action
  const startVoiceInterview = async () => {
    setStartingSession(true);
    try {
      // Request mic permission as user gesture
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        setMicState("requesting");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
        }
      }

      // Call start API action
      await apiFetch<{ data: { session: Record<string, unknown>; message?: Msg } }>(
        `/api/interviews/${sessionId}`,
        { method: "POST", body: JSON.stringify({ action: "start" }) }
      );

      await load();
      toast.success("Voice AI Interview initialized. Listening to opening question...");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start interview");
    } finally {
      setStartingSession(false);
    }
  };

  // Dictation Speech Recognition Toggle
  const toggleMic = async () => {
    const SpeechRecognition =
      typeof window !== "undefined"
        ? (window as unknown as { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition ||
          (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition
        : undefined;

    if (!SpeechRecognition) {
      setMicState("unsupported");
      toast.error("Web Speech Recognition is not supported in this browser. You can type your answer in the text area.");
      return;
    }

    if (listening) {
      stopRecording();
      return;
    }

    // Stop AI speech if active
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    try {
      setMicState("requesting");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMediaStream(stream);

      // Preserve base input typed before mic activation
      baseInputRef.current = input;
      finalTranscriptRef.current = "";
      interimTranscriptRef.current = "";

      recordingEnabledRef.current = true;
      manualStopRef.current = false;

      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;

      rec.onresult = (event: SpeechRecognitionEvent) => {
        let finalAcc = finalTranscriptRef.current;
        let interimAcc = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcriptText = result[0].transcript;
          if (result.isFinal) {
            finalAcc += (finalAcc ? " " : "") + transcriptText.trim();
          } else {
            interimAcc += (interimAcc ? " " : "") + transcriptText.trim();
          }
        }

        finalTranscriptRef.current = finalAcc;
        interimTranscriptRef.current = interimAcc;

        const combined = [baseInputRef.current, finalAcc, interimAcc]
          .filter(Boolean)
          .join(" ")
          .replace(/\s+/g, " ");

        setInput(combined);
      };

      rec.onerror = (event: { error: string }) => {
        console.warn("[SpeechRecognition Error]", event.error);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setMicState("denied");
          stopRecording();
          toast.error("Microphone permission denied.");
        }
      };

      rec.onend = () => {
        if (recordingEnabledRef.current && !manualStopRef.current) {
          // Restart after short delay on pause to prevent continuous mode cutoffs
          restartTimerRef.current = setTimeout(() => {
            if (recordingEnabledRef.current && !manualStopRef.current) {
              try {
                rec.start();
              } catch {
                /* ignore state error */
              }
            }
          }, 250);
        } else {
          setListening(false);
          setMicState("idle");
        }
      };

      recognitionRef.current = rec;
      rec.start();
      setListening(true);
      setMicState("listening");
    } catch {
      setMicState("denied");
      toast.error("Could not access microphone.");
    }
  };

  // Send Answer with Streaming
  const sendStream = async (content: string) => {
    if (!content.trim() || thinking) return;

    if (listening) {
      stopRecording();
    }

    const trimmed = content.trim();
    setInput("");
    setThinking(true);

    const userMsgId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();

    setMessages((m) => [...m, { id: userMsgId, role: "user", content: trimmed }]);
    setMessages((m) => [...m, { id: assistantId, role: "assistant", content: "" }]);

    const startTime = performance.now();
    let firstTokenTime: number | null = null;

    streamAbortControllerRef.current = new AbortController();

    try {
      const res = await fetch(`/api/interviews/${sessionId}/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
        signal: streamAbortControllerRef.current.signal,
      });

      if (!res.ok || !res.body) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Failed to stream interview response");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Throttled Stream Buffer Flush Interval (40ms)
      streamBufferRef.current = "";
      flushTimerRef.current = setInterval(() => {
        if (streamBufferRef.current) {
          const textToAppend = streamBufferRef.current;
          streamBufferRef.current = "";
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + textToAppend } : m))
          );
        }
      }, 40);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (!firstTokenTime) {
          firstTokenTime = performance.now();
          if (process.env.NODE_ENV === "development") {
            console.log(`[AI Interview] First token received in ${(firstTokenTime - startTime).toFixed(0)}ms`);
          }
        }

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
            streamBufferRef.current += String(data.text ?? "");
          }
          if (event === "done") {
            if (flushTimerRef.current) clearInterval(flushTimerRef.current);
            const finalMsg = data.message as Msg | undefined;
            const fullReply = String(data.reply ?? "");
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, id: finalMsg?.id || assistantId, content: fullReply, metadata: data.meta as Record<string, unknown> } : m
              )
            );
          }
          if (event === "error") throw new Error(String(data.message ?? "Stream error"));
        }
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") {
        toast.error(e instanceof Error ? e.message : "Failed to send answer");
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      }
    } finally {
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
      setThinking(false);
    }
  };

  // Finalize Session
  const finalize = async () => {
    setThinking(true);
    try {
      const data = await apiFetch<{ session: Record<string, unknown>; evaluation: Record<string, unknown> }>(
        `/api/interviews/${sessionId}`,
        { method: "POST", body: JSON.stringify({ action: "finalize" }) }
      );
      setEvaluation(data.evaluation);
      setSession(data.session);
      toast.success("Interview completed and scored successfully.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Finalization failed");
    } finally {
      setThinking(false);
    }
  };

  // Unmount Cleanup
  useEffect(() => {
    return () => {
      stopRecording();
      if (streamAbortControllerRef.current) streamAbortControllerRef.current.abort();
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
    };
  }, [stopRecording]);

  const scores = (evaluation?.scores ?? session?.scores ?? {}) as Record<string, number>;
  const cand = session?.candidates as { full_name?: string } | undefined;
  const isScheduled = session?.status === "scheduled" && messages.filter((m) => m.role === "assistant").length === 0;

  return (
    <div className="max-w-6xl mx-auto px-2 lg:px-4 py-4 space-y-6">
      <PageHeader
        title="AI Voice Interview"
        description={`${String(session?.mode ?? "behavioral")} · ${cand?.full_name ?? "Candidate"} · Duration: ${formatTimer(elapsed)}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="cursor-pointer bg-[#111823] border-[#263140] text-[#CBD5E1] hover:text-white" onClick={() => router.push(backHref)}>
              Back
            </Button>
            <Button
              className="bg-[#C5A059] hover:bg-[#D7B45F] text-white font-semibold gap-2 cursor-pointer"
              onClick={() => void finalize()}
              disabled={thinking || session?.status === "completed"}
            >
              <Square className="h-4 w-4" /> End & Finalize Score
            </Button>
          </div>
        }
      />

      {/* Progress & Header Bar */}
      <div className="bg-[#080D16] border border-[#263140] rounded-2xl p-4 flex flex-wrap items-center gap-4 shadow-xl">
        <div className="flex-1 min-w-[200px]">
          <div className="flex justify-between text-xs text-[#94A3B8] font-medium mb-1.5">
            <span>Interview Progress</span>
            <span className="text-[#F8FAFC] font-semibold">{userRounds}/{TARGET_ROUNDS} Responses</span>
          </div>
          <div className="h-2 rounded-full bg-[#111823] overflow-hidden border border-[#263140]">
            <motion.div className="h-full bg-[#C5A059]" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
          </div>
        </div>

        <StatusBadge tone={session?.status === "completed" ? "success" : session?.status === "in_progress" ? "warning" : "info"}>
          {String(session?.status ?? "in_progress").replaceAll("_", " ")}
        </StatusBadge>

        <RealAudioWaveform active={listening} stream={mediaStream} />
      </div>

      {/* Hero Section: Centered Avatar & Stage */}
      <div className="bg-[#080D16] border border-[#263140] rounded-3xl p-6 lg:p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
        {/* Background Subtle Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#C5A059]/5 via-transparent to-transparent pointer-events-none" />

        {isScheduled ? (
          /* Start Voice AI Interview Entry Screen */
          <div className="my-6 max-w-md space-y-5 text-center z-10">
            <SpeakingAvatar
              seed="Amina-HireOps-Interviewer"
              size={240}
              showControls={false}
              statusText="Ready to start"
            />
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-[#F8FAFC]">Ready for your AI Interview?</h2>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Click below to enable your microphone and audio. The AI interviewer will introduce itself and ask your first job-relevant question.
              </p>
            </div>
            <Button
              size="lg"
              className="w-full bg-[#C5A059] hover:bg-[#D7B45F] text-white font-bold py-6 text-base rounded-2xl shadow-xl gap-2 cursor-pointer"
              onClick={startVoiceInterview}
              disabled={startingSession}
            >
              {startingSession ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5 fill-current" />}
              <span>Start Voice AI Interview</span>
            </Button>
          </div>
        ) : (
          /* Active Interview Stage */
          <div className="w-full max-w-3xl space-y-6 z-10">
            {/* Centered Large Speaking Avatar */}
            <SpeakingAvatar
              seed="Amina-HireOps-Interviewer"
              speakText={currentQuestion}
              autoSpeak={isCandidatePortal}
              size={240}
              showControls
              onSpeakingChange={setAiSpeaking}
            />

            {/* Focused Current Question Card */}
            <div className="bg-[#111823] border border-[#263140] rounded-2xl p-5 lg:p-6 text-left shadow-lg space-y-3 relative">
              <div className="flex items-center justify-between text-xs font-semibold text-[#94A3B8] border-b border-[#263140] pb-2.5">
                <span className="flex items-center gap-1.5 text-[#C5A059]">
                  <Sparkles className="h-4 w-4" /> Question {Math.min(TARGET_ROUNDS, questionsLength(messages) || 1)} of {TARGET_ROUNDS}
                </span>
                {thinking && (
                  <span className="flex items-center gap-1.5 text-[#C5A059] animate-pulse">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> AI is formulating response...
                  </span>
                )}
              </div>

              <p className="text-base lg:text-lg font-semibold text-[#F8FAFC] leading-relaxed">
                {currentQuestion || "Preparing your first interview question..."}
              </p>
            </div>

            {/* Candidate Answer Textarea & Controls */}
            {session?.status === "completed" ? (
              <div className="bg-[#111823] border border-[#263140] rounded-2xl p-5 text-center text-xs text-[#94A3B8]">
                This interview session has been finalized. Transcript and scores are saved in the platform database.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <textarea
                    className="w-full min-h-[110px] max-h-52 rounded-2xl border border-[#263140] bg-[#111823] p-4 text-sm text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all resize-y"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        if (input.trim()) void sendStream(input);
                      }
                    }}
                    placeholder="Dictate your answer with the microphone or type your response here... (Press Ctrl+Enter to Send)"
                    disabled={thinking || session?.status === "completed"}
                  />
                  <div className="absolute bottom-3 right-3 text-[11px] text-[#94A3B8] font-medium bg-[#080D16]/80 px-2 py-0.5 rounded-md border border-[#263140]">
                    {wordCount(input)} words
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant={listening ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all",
                        listening
                          ? "bg-rose-600 hover:bg-rose-700 text-white animate-pulse"
                          : "bg-[#111823] border-[#263140] text-[#CBD5E1] hover:text-white hover:bg-[#18212D]"
                      )}
                      onClick={toggleMic}
                      disabled={thinking || aiSpeaking}
                      title={listening ? "Stop microphone recording" : "Start continuous dictation"}
                    >
                      {listening ? <MicOff className="h-4 w-4 text-white" /> : <Mic className="h-4 w-4 text-[#C5A059]" />}
                      <span>{listening ? "Stop Recording" : "Start Dictation"}</span>
                    </Button>

                    {micState === "unsupported" && (
                      <span className="text-xs text-amber-400 font-medium">Dictation unsupported in this browser</span>
                    )}
                  </div>

                  <Button
                    type="button"
                    className="bg-[#C5A059] hover:bg-[#D7B45F] text-white font-semibold text-xs px-5 py-2.5 rounded-xl cursor-pointer gap-2 shadow-lg"
                    disabled={thinking || !input.trim() || session?.status === "completed"}
                    onClick={() => {
                      if (input.trim()) void sendStream(input);
                    }}
                  >
                    {thinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    <span>Submit Answer</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Live Transcript Panel (Collapsible, Secondary) */}
      <div className="bg-[#080D16] border border-[#263140] rounded-2xl overflow-hidden shadow-xl">
        <button
          onClick={() => setTranscriptOpen((open) => !open)}
          className="w-full px-5 py-3.5 bg-[#111823] border-b border-[#263140] flex items-center justify-between text-xs font-semibold text-[#CBD5E1] hover:text-white transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-[#C5A059]" /> Live Conversation Transcript ({messages.length} messages)
          </span>
          {transcriptOpen ? <ChevronUp className="h-4 w-4 text-[#94A3B8]" /> : <ChevronDown className="h-4 w-4 text-[#94A3B8]" />}
        </button>

        {transcriptOpen && (
          <div className="relative">
            <div
              ref={transcriptScrollRef}
              onScroll={(e) => {
                const target = e.currentTarget;
                const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 80;
                setUserScrolledUp(!isNearBottom);
              }}
              className="p-4 max-h-64 overflow-y-auto space-y-3 scrollbar-thin bg-[#080D16]"
            >
              {messages.length === 0 ? (
                <p className="text-xs text-[#94A3B8] text-center py-4">No messages recorded yet.</p>
              ) : (
                messages.map((m) => <TranscriptItem key={m.id || m.content.slice(0, 20)} message={m} />)
              )}
            </div>

            {userScrolledUp && (
              <button
                onClick={() => {
                  setUserScrolledUp(false);
                  if (transcriptScrollRef.current) {
                    transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
                  }
                }}
                className="absolute bottom-3 right-3 bg-[#C5A059] text-white text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1 cursor-pointer hover:bg-[#D7B45F] transition-colors"
              >
                <ArrowDown className="h-3 w-3" /> Jump to latest
              </button>
            )}
          </div>
        )}
      </div>

      {/* HR Evaluation Section */}
      {!isCandidatePortal && (
        <div className="bg-[#080D16] border border-[#263140] rounded-2xl p-6 space-y-4 shadow-xl">
          <h3 className="text-sm font-semibold text-[#F8FAFC] flex items-center gap-2 border-b border-[#263140] pb-3">
            <Sparkles className="h-4 w-4 text-[#C5A059]" /> Interview Evaluation & Scoring
          </h3>

          {Object.keys(scores).length === 0 ? (
            <p className="text-xs text-[#94A3B8]">Evaluation scores will be computed automatically after clicking &quot;End &amp; Finalize Score&quot;.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(scores)
                .filter(([, v]) => typeof v === "number" && Number.isFinite(v))
                .map(([k, v]) => (
                  <MetricBar key={k} label={k} value={Number(v)} />
                ))}
            </div>
          )}

          {evaluation && (
            <div className="mt-4 p-4 rounded-xl bg-[#111823] border border-[#263140] text-xs space-y-2 text-[#CBD5E1]">
              <p>
                <strong className="text-white">Recommendation:</strong>{" "}
                <span className="capitalize text-[#C5A059] font-bold">{String(evaluation.recommendation ?? "")}</span>
              </p>
              <p className="whitespace-pre-wrap">{String(evaluation.summary ?? "")}</p>
            </div>
          )}

          {showNotes && (
            <form
              className="mt-4 pt-4 border-t border-[#263140] space-y-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!note.trim()) return;
                try {
                  await apiFetch("/api/notes", {
                    method: "POST",
                    body: JSON.stringify({ entityType: "interview_session", entityId: sessionId, body: note.trim() }),
                  });
                  setNote("");
                  toast.success("Recruiter note saved.");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to save note");
                }
              }}
            >
              <p className="text-xs font-semibold text-[#F8FAFC]">Recruiter Internal Notes</p>
              <textarea
                className="w-full min-h-[80px] rounded-xl border border-[#263140] bg-[#111823] p-3 text-xs text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#C5A059]"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Enter confidential notes for the recruitment team..."
              />
              <Button type="submit" size="sm" variant="outline" className="cursor-pointer bg-[#111823] border-[#263140] text-[#CBD5E1] hover:text-white">
                Save Recruiter Note
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function questionsLength(messages: Msg[]): number {
  return messages.filter((m) => m.role === "assistant").length;
}

// SpeechRecognition Types
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [i: number]: {
      isFinal: boolean;
      0: { transcript: string };
    };
  };
}
