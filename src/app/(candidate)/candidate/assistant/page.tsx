"use client";

import { useMemo, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { MotionPage } from "@/components/shared/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SpeakingAvatar } from "@/components/avatar/speaking-avatar";
import { apiFetch } from "@/lib/api/fetcher";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";

type Msg = { role: "user" | "assistant"; content: string };

export default function CandidateAssistantPage() {
  const { t } = useLang();
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content: "I can help with resume tips, role fit, and interview prep based on your profile and open roles.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const speakText = useMemo(() => {
    if (busy) return null;
    const last = [...messages].reverse().find((m) => m.role === "assistant" && m.content.trim());
    return last?.content ?? null;
  }, [messages, busy]);

  const send = async () => {
    const content = input.trim();
    if (!content || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content }]);
    setBusy(true);
    try {
      const data = await apiFetch<{ reply: string; suggestions: string[] }>("/api/candidate/assistant", {
        method: "POST",
        body: JSON.stringify({ message: content }),
      });
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      setSuggestions(data.suggestions ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Assistant failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <MotionPage>
      <PageHeader title={t("careerAssistant")} description="AI guidance grounded in your candidate profile." />
      <div className="grid grid-cols-1 xl:grid-cols-[220px_1fr] gap-5">
        <div className="glass-card p-5 flex justify-center xl:sticky xl:top-20 xl:self-start">
          <SpeakingAvatar
            seed="Noura-HireOps-Career-Coach"
            name={t("interviewer")}
            subtitle={t("careerAssistant")}
            speakText={speakText}
            autoSpeak
            size={140}
          />
        </div>
        <div className="glass-card flex flex-col h-[min(70vh,640px)]">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
                  m.role === "user" ? "ml-auto bg-primary/20" : "bg-white/5 border border-white/5"
                )}
              >
                {m.content}
              </div>
            ))}
            {busy && (
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
              </div>
            )}
          </div>
          {suggestions.length > 0 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="text-[11px] rounded-full border border-white/10 px-2.5 py-1 hover:bg-white/5 cursor-pointer"
                  onClick={() => setInput(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <form
            className="p-3 border-t border-white/5 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about roles, resume, or interviews…" />
            <Button type="submit" size="icon" className="gradient-brand text-white cursor-pointer" disabled={busy}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </MotionPage>
  );
}
