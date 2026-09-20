"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createAvatar } from "@dicebear/core";
import { notionists } from "@dicebear/collection";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, RotateCcw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type SpeakingAvatarProps = {
  seed?: string;
  name?: string;
  subtitle?: string;
  /** Text to speak with humanized TTS */
  speakText?: string | null;
  /** Auto-speak when speakText changes */
  autoSpeak?: boolean;
  size?: number;
  className?: string;
  showControls?: boolean;
  /** Callback when speaking starts or ends */
  onSpeakingChange?: (speaking: boolean) => void;
  statusText?: string;
};

export type AvatarStatus = "idle" | "speaking" | "thinking" | "muted" | "blocked" | "error";

function pickHumanVoice(lang: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const preferLang = lang.startsWith("ar") ? "ar" : "en";
  const scored = voices
    .map((v) => {
      let score = 0;
      const name = v.name.toLowerCase();
      if (v.lang.toLowerCase().startsWith(preferLang)) score += 10;
      if (/neural|natural|premium|enhanced|google|microsoft|samantha|aria|jenny|zira|sara|noura|zayd/.test(name)) {
        score += 8;
      }
      if (v.localService === false) score += 3;
      if (/female|woman|zira|samantha|aria|jenny|sara|noura|heba/.test(name)) score += 2;
      return { v, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0]?.v ?? voices[0] ?? null;
}

function cleanForSpeech(text: string): string {
  return text
    .replace(/[*_`#>\-]+/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Split text into natural sentence chunks for reliable Chromium SpeechSynthesis */
function splitIntoSentences(text: string): string[] {
  const cleaned = cleanForSpeech(text);
  if (!cleaned) return [];
  // Match sentences ending in punctuation or remaining text
  const sentences = cleaned.match(/[^.!?]+[.!?]+|\s*[^.!?]+$/g) || [cleaned];
  return sentences.map((s) => s.trim()).filter((s) => s.length > 0);
}

export function SpeakingAvatar({
  seed = "Amina-HireOps-Interviewer",
  name,
  subtitle,
  speakText,
  autoSpeak = true,
  size = 240,
  className,
  showControls = true,
  onSpeakingChange,
  statusText,
}: SpeakingAvatarProps) {
  const { lang, t } = useLang();
  const displayName = name ?? t("interviewer");
  const displaySubtitle = subtitle ?? t("interviewerRole");

  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [voicesLoaded, setVoicesLoaded] = useState(false);

  const lastSpokenRef = useRef<string | null>(null);
  const queueRef = useRef<string[]>([]);
  const isCancelledRef = useRef(false);

  const svg = useMemo(() => {
    const avatar = createAvatar(notionists, {
      seed,
      backgroundColor: ["080D16", "111823"],
      backgroundType: ["gradientLinear"],
    });
    return avatar.toDataUri();
  }, [seed]);

  const updateSpeaking = useCallback(
    (isSpeaking: boolean) => {
      setSpeaking(isSpeaking);
      onSpeakingChange?.(isSpeaking);
    },
    [onSpeakingChange]
  );

  const stop = useCallback(() => {
    isCancelledRef.current = true;
    queueRef.current = [];
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    updateSpeaking(false);
  }, [updateSpeaking]);

  const speakSentenceQueue = useCallback(
    (sentences: string[]) => {
      if (typeof window === "undefined" || !window.speechSynthesis || muted) return;
      if (!sentences.length) {
        updateSpeaking(false);
        return;
      }

      window.speechSynthesis.cancel();
      isCancelledRef.current = false;
      queueRef.current = [...sentences];
      updateSpeaking(true);
      setBlocked(false);

      const speakNextChunk = () => {
        if (isCancelledRef.current || !queueRef.current.length) {
          updateSpeaking(false);
          return;
        }

        const chunk = queueRef.current.shift()!;
        const utter = new SpeechSynthesisUtterance(chunk);
        utter.lang = lang === "ar" ? "ar-SA" : "en-US";
        utter.rate = lang === "ar" ? 0.88 : 0.92;
        utter.pitch = 1.05;
        utter.volume = 1;

        const voice = pickHumanVoice(utter.lang);
        if (voice) utter.voice = voice;

        utter.onend = () => {
          if (!isCancelledRef.current && queueRef.current.length > 0) {
            speakNextChunk();
          } else {
            updateSpeaking(false);
          }
        };

        utter.onerror = (e) => {
          console.warn("[TTS Error]", e);
          if (e.error === "not-allowed") {
            setBlocked(true);
          }
          if (!isCancelledRef.current && queueRef.current.length > 0) {
            speakNextChunk();
          } else {
            updateSpeaking(false);
          }
        };

        try {
          window.speechSynthesis.speak(utter);
        } catch {
          setBlocked(true);
          updateSpeaking(false);
        }
      };

      speakNextChunk();
    },
    [lang, muted, updateSpeaking]
  );

  const speak = useCallback(
    (raw: string) => {
      if (!raw.trim() || muted) return;
      const sentences = splitIntoSentences(raw);
      if (!sentences.length) return;
      speakSentenceQueue(sentences);
    },
    [muted, speakSentenceQueue]
  );

  // Warm up voices asynchronously
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) setVoicesLoaded(true);
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  // Handle autoSpeak prop
  useEffect(() => {
    if (!autoSpeak || !speakText || muted) return;
    if (speakText === lastSpokenRef.current) return;
    lastSpokenRef.current = speakText;
    speak(speakText);
  }, [speakText, autoSpeak, muted, speak, voicesLoaded]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  const currentStatus = statusText
    ? statusText
    : speaking
      ? "Speaking..."
      : muted
        ? "Muted"
        : blocked
          ? "Click Replay to enable audio"
          : "Ready";

  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        {/* Animated OIA Gold Pulsing Ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-[#C5A059]"
          animate={
            speaking
              ? {
                  scale: [1, 1.08, 1],
                  opacity: [0.6, 1, 0.6],
                  boxShadow: [
                    "0 0 0 0 rgba(197, 160, 89, 0.4)",
                    "0 0 0 16px rgba(197, 160, 89, 0)",
                    "0 0 0 0 rgba(197, 160, 89, 0.4)",
                  ],
                }
              : { scale: 1, opacity: 0.3, boxShadow: "0 0 0 0 rgba(197, 160, 89, 0)" }
          }
          transition={{ duration: 1.8, repeat: speaking ? Infinity : 0, ease: "easeInOut" }}
        />

        {/* Avatar Card Frame */}
        <div className="relative overflow-hidden rounded-full border-2 border-[#263140] bg-[#080D16] shadow-2xl transition-all" style={{ width: size - 8, height: size - 8 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={svg} alt={displayName} width={size - 8} height={size - 8} className="block object-cover h-full w-full select-none" />
        </div>

        {/* Speaking / Listening / Status Badge Overlay */}
        <AnimatePresence>
          <motion.div
            key={currentStatus}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              "absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-semibold whitespace-nowrap border shadow-md transition-all",
              speaking
                ? "bg-[#C5A059] text-white border-[#D7B45F] animate-pulse"
                : muted
                  ? "bg-slate-800 text-slate-300 border-slate-700"
                  : blocked
                    ? "bg-amber-600 text-white border-amber-500"
                    : "bg-[#111823] text-[#CBD5E1] border-[#263140]"
            )}
          >
            {currentStatus}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-5">
        <p className="text-base font-bold text-[#F8FAFC] tracking-tight">{displayName}</p>
        <p className="text-xs text-[#94A3B8] font-medium mt-0.5">{displaySubtitle}</p>
      </div>

      {blocked && (
        <div className="mt-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>Browser blocked autoplay. Click Replay to enable voice.</span>
        </div>
      )}

      {showControls && (
        <div className="mt-3.5 flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="cursor-pointer gap-1.5 text-xs bg-[#111823] border-[#263140] text-[#CBD5E1] hover:text-white hover:bg-[#18212D] focus-visible:ring-2 focus-visible:ring-[#C5A059]"
            onClick={() => {
              if (speakText) {
                stop();
                speak(speakText);
              }
            }}
            disabled={!speakText}
            title="Replay latest question"
          >
            <RotateCcw className="h-3.5 w-3.5 text-[#C5A059]" />
            <span>Replay Question</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="cursor-pointer gap-1.5 text-xs text-[#CBD5E1] hover:text-white hover:bg-[#18212D]"
            onClick={() => {
              if (!muted) stop();
              setMuted((m) => !m);
            }}
            title={muted ? "Unmute interviewer" : "Mute interviewer"}
          >
            {muted ? <VolumeX className="h-3.5 w-3.5 text-rose-400" /> : <Volume2 className="h-3.5 w-3.5 text-[#CBD5E1]" />}
            <span>{muted ? t("unmuteVoice") : t("muteVoice")}</span>
          </Button>
        </div>
      )}
    </div>
  );
}

/** DiceBear avatar URL helper for profile chips */
export function dicebearDataUri(seed: string, size = 64) {
  const avatar = createAvatar(notionists, {
    seed,
    size,
    backgroundColor: ["111823", "080D16"],
  });
  return avatar.toDataUri();
}
