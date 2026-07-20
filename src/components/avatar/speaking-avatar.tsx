"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createAvatar } from "@dicebear/core";
import { lorelei } from "@dicebear/collection";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
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
};

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
      // Prefer neural / natural / online voices when available
      if (/neural|natural|premium|enhanced|google|microsoft|samantha|aria|jenny|zira|sara|noura/.test(name)) {
        score += 8;
      }
      if (v.localService === false) score += 3;
      if (/female|woman|zira|samantha|aria|jenny|sara|noura|heba/.test(name)) score += 2;
      return { v, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0]?.v ?? voices[0] ?? null;
}

function cleanForSpeech(text: string) {
  return text
    .replace(/[*_`#>\-]+/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1200);
}

/** Insert brief pauses so speech cadence feels more natural */
function humanizeSpeechText(text: string) {
  return cleanForSpeech(text)
    .replace(/([.!?])\s+/g, "$1 … ")
    .replace(/([,;:])\s+/g, "$1 ")
    .replace(/\s+/g, " ")
    .trim();
}

export function SpeakingAvatar({
  seed = "Amina-HireOps-Interviewer",
  name,
  subtitle,
  speakText,
  autoSpeak = true,
  size = 160,
  className,
  showControls = true,
}: SpeakingAvatarProps) {
  const { lang, t } = useLang();
  const displayName = name ?? t("interviewer");
  const displaySubtitle = subtitle ?? t("interviewerRole");
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [mouth, setMouth] = useState(0);
  const lastSpoken = useRef<string | null>(null);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const svg = useMemo(() => {
    const avatar = createAvatar(lorelei, {
      seed,
      backgroundColor: ["0f172a", "1e293b"],
      backgroundType: ["gradientLinear"],
    });
    return avatar.toDataUri();
  }, [seed]);

  const stop = useCallback(() => {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setSpeaking(false);
    setMouth(0);
    utterRef.current = null;
  }, []);

  const speak = useCallback(
    (raw: string) => {
      if (typeof window === "undefined" || !window.speechSynthesis || muted) return;
      const text = humanizeSpeechText(raw);
      if (!text) return;

      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = lang === "ar" ? "ar-SA" : "en-US";
      // Humanized cadence: slightly slower, gentle pitch variation
      utter.rate = lang === "ar" ? 0.86 : 0.9;
      utter.pitch = lang === "ar" ? 1.05 : 1.1;
      utter.volume = 1;

      const voice = pickHumanVoice(utter.lang);
      if (voice) utter.voice = voice;

      utter.onstart = () => setSpeaking(true);
      utter.onend = () => {
        setSpeaking(false);
        setMouth(0);
      };
      utter.onerror = () => {
        setSpeaking(false);
        setMouth(0);
      };

      utterRef.current = utter;
      window.speechSynthesis.speak(utter);
    },
    [lang, muted]
  );

  // Chrome loads voices asynchronously
  useEffect(() => {
    if (typeof window === "undefined") return;
    const warm = () => window.speechSynthesis.getVoices();
    warm();
    window.speechSynthesis.addEventListener("voiceschanged", warm);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", warm);
  }, []);

  useEffect(() => {
    if (!autoSpeak || !speakText || muted) return;
    if (speakText === lastSpoken.current) return;
    lastSpoken.current = speakText;
    speak(speakText);
  }, [speakText, autoSpeak, muted, speak]);

  useEffect(() => {
    if (!speaking) return;
    const id = window.setInterval(() => {
      setMouth(0.25 + Math.random() * 0.75);
    }, 90);
    return () => window.clearInterval(id);
  }, [speaking]);

  useEffect(() => () => stop(), [stop]);

  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={
            speaking
              ? {
                  boxShadow: [
                    "0 0 0 0 rgba(56,189,248,0.35)",
                    "0 0 0 18px rgba(56,189,248,0)",
                    "0 0 0 0 rgba(56,189,248,0.35)",
                  ],
                }
              : { boxShadow: "0 0 0 0 rgba(56,189,248,0)" }
          }
          transition={{ duration: 1.6, repeat: speaking ? Infinity : 0 }}
        />
        <div className="relative overflow-hidden rounded-full border border-white/15 bg-slate-900 shadow-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={svg} alt={displayName} width={size} height={size} className="block" />
          {/* Lip-sync overlay — soft oval that opens while speaking */}
          <motion.div
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-full bg-rose-400/70"
            style={{ width: size * 0.18, bottom: size * 0.22 }}
            animate={{
              height: speaking ? size * 0.04 + mouth * size * 0.08 : size * 0.02,
              opacity: speaking ? 0.85 : 0,
            }}
            transition={{ duration: 0.08 }}
          />
        </div>
        <AnimatePresence>
          {speaking && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-medium text-white whitespace-nowrap"
            >
              {t("speaking")}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="mt-4 text-sm font-semibold">{displayName}</p>
      <p className="text-[11px] text-muted-foreground">{displaySubtitle}</p>

      {showControls && (
        <div className="mt-3 flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="cursor-pointer gap-1.5 text-xs"
            onClick={() => {
              if (speaking) stop();
              else if (speakText) speak(speakText);
            }}
            disabled={!speakText && !speaking}
          >
            <Volume2 className="h-3.5 w-3.5" />
            {t("listen")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="cursor-pointer gap-1.5 text-xs"
            onClick={() => {
              if (!muted) stop();
              setMuted((m) => !m);
            }}
          >
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            {muted ? t("unmuteVoice") : t("muteVoice")}
          </Button>
        </div>
      )}
    </div>
  );
}

/** DiceBear avatar URL helper for profile chips */
export function dicebearDataUri(seed: string, size = 64) {
  const avatar = createAvatar(lorelei, {
    seed,
    size,
    backgroundColor: ["1e293b", "0f172a"],
  });
  return avatar.toDataUri();
}
