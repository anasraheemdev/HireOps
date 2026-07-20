"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/enterprise-ui";
import { MotionPage } from "@/components/shared/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMessagesQuery } from "@/lib/queries/use-candidate-portal";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetcher";
import { toast } from "sonner";

export default function CandidateMessagesPage() {
  const { data: messages = [], isLoading, isError, error, refetch } = useMessagesQuery();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const qc = useQueryClient();

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return messages;
    return messages.filter(
      (m) =>
        String(m.body).toLowerCase().includes(term) ||
        String(m.subject ?? "").toLowerCase().includes(term)
    );
  }, [messages, q]);

  const selected = filtered.find((m) => m.id === selectedId) ?? filtered[0] ?? null;

  return (
    <MotionPage>
      <PageHeader title="Messages" description="Conversations with the recruitment team." />
      {isLoading && <PageSkeleton rows={4} />}
      {isError && (
        <ErrorState title="Could not load messages" description={error instanceof Error ? error.message : ""} onRetry={() => refetch()} />
      )}
      {!isLoading && !isError && messages.length === 0 && (
        <EmptyState
          title="No messages yet"
          description="Send a note to HR about your application or interview."
        />
      )}

      {!isLoading && !isError && (
        <div className="grid lg:grid-cols-[280px_1fr] gap-4">
          <div className="glass-card p-3 space-y-2">
            <Input placeholder="Search messages…" value={q} onChange={(e) => setQ(e.target.value)} />
            <ul className="space-y-1 max-h-[50vh] overflow-auto">
              {filtered.map((m) => (
                <li key={String(m.id)}>
                  <button
                    type="button"
                    className={`w-full text-left rounded-lg px-3 py-2 text-sm cursor-pointer ${
                      selected?.id === m.id ? "bg-primary/15" : "hover:bg-white/5"
                    }`}
                    onClick={() => setSelectedId(String(m.id))}
                  >
                    <p className="font-medium truncate">{String(m.subject ?? "Message")}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{String(m.body)}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="glass-card p-5 flex flex-col min-h-[320px]">
            {selected ? (
              <>
                <h3 className="text-sm font-semibold mb-1">{String(selected.subject ?? "Message")}</h3>
                <p className="text-[11px] text-muted-foreground mb-4">
                  {String(selected.sender_role)} · {new Date(String(selected.created_at)).toLocaleString()}
                </p>
                <p className="text-sm whitespace-pre-wrap flex-1">{String(selected.body)}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Select a message or compose below.</p>
            )}
            <form
              className="mt-4 flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!reply.trim()) return;
                setSending(true);
                try {
                  await apiFetch("/api/candidate/messages", {
                    method: "POST",
                    body: JSON.stringify({ body: reply.trim(), subject: "Candidate message" }),
                  });
                  setReply("");
                  toast.success("Message sent");
                  qc.invalidateQueries({ queryKey: ["candidate-messages"] });
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Send failed");
                } finally {
                  setSending(false);
                }
              }}
            >
              <Input
                placeholder="Write a message to HR…"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
              />
              <Button type="submit" className="gradient-brand text-white cursor-pointer" disabled={sending}>
                Send
              </Button>
            </form>
          </div>
        </div>
      )}
    </MotionPage>
  );
}
