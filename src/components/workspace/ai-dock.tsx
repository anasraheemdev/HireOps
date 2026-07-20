"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Bot, PanelRightClose, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useAssistantMutation, type AssistantChatMessage } from "@/lib/queries/use-ai";
import { useWorkspaceUi } from "./workspace-ui-context";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

type Message = { from: "ai" | "user"; text: string };

const initialMessages: Message[] = [
  {
    from: "ai",
    text: `Hi, I'm ${BRAND.name} — your AI recruitment copilot. Ask me about pipeline, matching, or interview prep.`,
  },
];

const suggestions = [
  "Who are today's top candidate matches?",
  "Summarize the current hiring funnel",
  "Which roles need attention?",
];

function useIsMobile(breakpoint = 1024) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [breakpoint]);
  return mobile;
}

function AiChatBody({ onClose }: { onClose?: () => void }) {
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
              text: err instanceof Error ? `Issue: ${err.message}` : "Something went wrong.",
            },
          ]);
        },
      }
    );
  };

  useEffect(() => {
    function handleOpen(e: Event) {
      const detail = (e as CustomEvent<{ prompt?: string }>).detail;
      if (detail?.prompt) send(detail.prompt);
    }
    window.addEventListener("open-ai-assistant", handleOpen);
    return () => window.removeEventListener("open-ai-assistant", handleOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-white/8 px-3 h-[var(--ws-toolbar-h)] shrink-0">
        <Bot className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold flex-1">AI Copilot</span>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer" onClick={onClose}>
            <X className="h-3.5 w-3.5 lg:hidden" />
            <PanelRightClose className="h-3.5 w-3.5 hidden lg:block" />
          </Button>
        )}
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "rounded-lg px-2.5 py-2 text-[12px] leading-relaxed",
              m.from === "user" ? "ml-4 bg-primary/20" : "mr-2 bg-white/5 border border-white/5"
            )}
          >
            {m.from === "ai" && <Sparkles className="h-3 w-3 text-primary mb-1" />}
            {m.text}
          </div>
        ))}
        {assistant.isPending && <p className="text-[11px] text-muted-foreground">Thinking…</p>}
      </div>
      {(followUps.length > 0 || messages.length <= 1) && (
        <div className="px-2 pb-1 flex flex-wrap gap-1">
          {(followUps.length ? followUps : suggestions).map((s) => (
            <button
              key={s}
              type="button"
              className="text-[10px] rounded-full border border-white/10 px-2 py-0.5 hover:bg-white/5 cursor-pointer"
              onClick={() => send(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <form
        className="p-2 border-t border-white/8 flex gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask ${BRAND.name}…`}
          className="h-8 text-xs"
        />
        <Button type="submit" size="icon" className="h-8 w-8 gradient-brand text-white cursor-pointer" disabled={assistant.isPending}>
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>
    </div>
  );
}

export function AiDock() {
  const { aiDockOpen, setAiDockOpen } = useWorkspaceUi();
  const isMobile = useIsMobile();

  useEffect(() => {
    function handleOpen() {
      setAiDockOpen(true);
    }
    window.addEventListener("open-ai-assistant", handleOpen);
    return () => window.removeEventListener("open-ai-assistant", handleOpen);
  }, [setAiDockOpen]);

  return (
    <>
      {/* Desktop: inline side panel — no modal backdrop */}
      <AnimatePresence initial={false}>
        {aiDockOpen && !isMobile && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="hidden lg:flex h-full shrink-0 flex-col border-l border-white/10 bg-[var(--ws-panel)] overflow-hidden"
          >
            <AiChatBody onClose={() => setAiDockOpen(false)} />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile only: sheet + backdrop blur */}
      {isMobile && (
        <Sheet open={aiDockOpen} onOpenChange={setAiDockOpen}>
          <SheetContent side="right" className="w-full sm:max-w-sm p-0 bg-[var(--ws-panel)]">
            <AiChatBody onClose={() => setAiDockOpen(false)} />
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}

export function AiDockFab() {
  const { aiDockOpen, setAiDockOpen } = useWorkspaceUi();
  const isMobile = useIsMobile();
  if (!isMobile || aiDockOpen) return null;
  return (
    <Button
      className="fixed bottom-5 right-5 z-40 h-11 w-11 rounded-full gradient-brand text-white shadow-lg cursor-pointer"
      size="icon"
      onClick={() => setAiDockOpen(true)}
    >
      <Sparkles className="h-4 w-4" />
    </Button>
  );
}
