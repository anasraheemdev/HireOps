"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X, Send, Bot, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAssistantMutation, type AssistantChatMessage } from "@/lib/queries/use-ai";

type Message = { from: "ai" | "user"; text: string };

const initialMessages: Message[] = [
  {
    from: "ai",
    text: "Hi, I'm Amina — your AI recruitment copilot. I can summarize pipelines, flag top candidates, or draft interview questions using live data. What would you like to explore?",
  },
];

const suggestions = [
  "Who are today's top candidate matches?",
  "Summarize the current hiring funnel",
  "Which roles need the most attention right now?",
];

export function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [followUps, setFollowUps] = useState<string[]>([]);
  const assistant = useAssistantMutation();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, assistant.isPending]);

  const send = (text: string) => {
    if (!text.trim() || assistant.isPending) return;
    setMessages((m) => [...m, { from: "user", text }]);
    setInput("");
    setFollowUps([]);

    const history: AssistantChatMessage[] = messages
      .slice(-8)
      .map((m) => ({ role: m.from === "user" ? "user" : "assistant", content: m.text }));

    assistant.mutate(
      { message: text, history },
      {
        onSuccess: (data) => {
          setMessages((m) => [...m, { from: "ai", text: data.reply }]);
          setFollowUps(data.suggestions ?? []);
        },
        onError: (err) => {
          setMessages((m) => [
            ...m,
            {
              from: "ai",
              text: err instanceof Error ? `Sorry, I ran into an issue: ${err.message}` : "Sorry, something went wrong. Please try again.",
            },
          ]);
        },
      }
    );
  };

  useEffect(() => {
    function handleOpen(e: Event) {
      setOpen(true);
      const detail = (e as CustomEvent<{ prompt?: string }>).detail;
      if (detail?.prompt) send(detail.prompt);
    }
    window.addEventListener("open-ai-assistant", handleOpen);
    return () => window.removeEventListener("open-ai-assistant", handleOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="absolute bottom-16 right-0 w-[380px] max-w-[90vw] glass-panel-strong rounded-2xl shadow-2xl overflow-hidden flex flex-col"
              style={{ height: 480 }}
            >
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 gradient-brand">
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="h-4.5 w-4.5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">Amina — AI Copilot</p>
                  <p className="text-[11px] text-white/80 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse-soft" /> Online
                  </p>
                </div>
                <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div ref={scrollRef} className="flex-1 px-4 py-3 overflow-y-auto scrollbar-thin">
                <div className="space-y-3">
                  {messages.map((m, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                          m.from === "user"
                            ? "gradient-brand text-white rounded-br-sm"
                            : "bg-white/8 border border-white/10 rounded-bl-sm"
                        }`}
                      >
                        {m.text}
                      </div>
                    </motion.div>
                  ))}
                  {assistant.isPending && (
                    <div className="flex justify-start">
                      <div className="bg-white/8 border border-white/10 rounded-2xl rounded-bl-sm px-3.5 py-2.5 flex gap-1 items-center">
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            className="h-1.5 w-1.5 rounded-full bg-blue-300"
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {assistant.isError && (
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-300">
                      <AlertTriangle className="h-3 w-3" /> Failed to reach the AI service.
                    </div>
                  )}
                  {(messages.length === 1 ? suggestions : followUps).length > 0 && !assistant.isPending && (
                    <div className="space-y-1.5 pt-2">
                      {(messages.length === 1 ? suggestions : followUps).map((s) => (
                        <button
                          key={s}
                          onClick={() => send(s)}
                          className="w-full text-left text-xs px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 border-t border-white/10 flex items-center gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send(input)}
                  placeholder="Ask Amina anything..."
                  disabled={assistant.isPending}
                  className="bg-white/5 border-white/10 h-9 text-sm"
                />
                <Button size="icon" className="h-9 w-9 shrink-0 gradient-brand" onClick={() => send(input)} disabled={assistant.isPending}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setOpen((o) => !o)}
          className="h-14 w-14 rounded-full gradient-brand glow-ring flex items-center justify-center text-white shadow-2xl cursor-pointer"
        >
          <AnimatePresence mode="wait">
            {open ? (
              <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                <X className="h-6 w-6" />
              </motion.span>
            ) : (
              <motion.span key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                <Sparkles className="h-6 w-6" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </>
  );
}

export function openAIAssistant(prompt?: string) {
  window.dispatchEvent(new CustomEvent("open-ai-assistant", { detail: { prompt } }));
}
