"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Bot, Plus, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/enterprise-ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EntityWorkspace } from "@/components/workspace/entity-workspace";
import { DetailPanel } from "@/components/workspace/detail-panel";
import { DataTable } from "@/components/workspace/data-table";
import { InterviewSessionView } from "@/components/interview/interview-session-view";
import { apiFetch } from "@/lib/api/fetcher";
import { useCandidatesQuery } from "@/lib/queries/use-candidates";
import { useRecent } from "@/components/workspace/recent-store";
import { toast } from "sonner";

type Session = {
  id: string;
  mode: string;
  status: string;
  scheduled_at: string | null;
  created_at: string;
  candidates?: { full_name: string; headline: string | null };
  jobs?: { title: string } | null;
};

function InterviewsWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");
  const qc = useQueryClient();
  const { data: candidates = [] } = useCandidatesQuery();
  const [candidateId, setCandidateId] = useState("");
  const [mode, setMode] = useState("behavioral");
  const { push } = useRecent();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["interviews"],
    queryFn: () => apiFetch<Session[]>("/api/interviews"),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<Session>("/api/interviews", {
        method: "POST",
        body: JSON.stringify({ candidateId, mode, applicationId: candidates.find(c=>c.id===candidateId)?.applicationId, jobId: candidates.find(c=>c.id===candidateId)?.jobId || undefined }),
      }),
    onSuccess: (session) => {
      qc.invalidateQueries({ queryKey: ["interviews"] });
      toast.success("Interview started");
      router.replace(`/hr/ai-interview?id=${session.id}`, { scroll: false });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selectId = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("id", id);
      else params.delete("id");
      router.replace(`/hr/ai-interview?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const selected = sessions.find((s) => s.id === selectedId);

  const columns = useMemo<ColumnDef<Session, unknown>[]>(
    () => [
      {
        id: "candidate",
        header: "Candidate",
        size: 160,
        accessorFn: (r) => r.candidates?.full_name ?? "—",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="font-medium truncate">{row.original.candidates?.full_name ?? "—"}</p>
            <p className="text-[10px] text-muted-foreground truncate">{row.original.jobs?.title ?? row.original.mode}</p>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 100,
        cell: ({ row }) => (
          <StatusBadge
            tone={
              row.original.status === "completed"
                ? "success"
                : row.original.status === "in_progress"
                  ? "warning"
                  : "info"
            }
          >
            {row.original.status.replaceAll("_", " ")}
          </StatusBadge>
        ),
      },
      {
        accessorKey: "mode",
        header: "Mode",
        size: 90,
      },
    ],
    []
  );

  const list = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-white/8 px-2.5 py-2 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold flex items-center gap-1.5">
              <Bot className="h-3.5 w-3.5 text-primary" /> AI Interviews
            </h1>
            <p className="text-[10px] text-muted-foreground">{sessions.length} sessions</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <Select value={candidateId} onValueChange={(v) => setCandidateId(v ?? "")}>
            <SelectTrigger className="h-7 text-[11px] bg-white/5 border-white/10 flex-1">
              <SelectValue placeholder="Candidate" />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={mode} onValueChange={(v) => setMode(v ?? "behavioral")}>
            <SelectTrigger className="h-7 text-[11px] bg-white/5 border-white/10 w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="behavioral">Behavioral</SelectItem>
              <SelectItem value="technical">Technical</SelectItem>
              <SelectItem value="screening">Screening</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="h-7 gradient-brand text-white cursor-pointer gap-1"
            disabled={!candidateId || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <DataTable
        data={sessions}
        columns={columns}
        getRowId={(r) => r.id}
        selectedId={selectedId}
        onRowClick={(r) => {
          push({
            id: r.id,
            type: "interview",
            label: r.candidates?.full_name ?? "Interview",
            href: `/hr/ai-interview?id=${r.id}`,
          });
          selectId(r.id);
        }}
        emptyMessage={isLoading ? "Loading…" : "No interviews yet"}
        toolbar={
          <span className="text-[10px] text-muted-foreground">
            Select a session or start a new one
          </span>
        }
      />
    </div>
  );

  const detail = selectedId ? (
    <div className="h-full overflow-y-auto scrollbar-thin ws-panel rounded-md p-2">
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-[11px] text-muted-foreground truncate">
          {selected?.candidates?.full_name ?? "Session"} · {selected?.mode}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="h-6 text-[10px] cursor-pointer gap-1"
          onClick={() => router.push(`/hr/ai-interview/${selectedId}`)}
        >
          <Play className="h-3 w-3" /> Full screen
        </Button>
      </div>
      <InterviewSessionView sessionId={selectedId} backHref="/hr/ai-interview" showNotes />
    </div>
  ) : null;

  const context = selected ? (
    <DetailPanel title="Session context" subtitle="Queue tips">
      <div className="space-y-2 text-[11px] text-muted-foreground">
        <p>
          Status: <span className="text-foreground">{selected.status}</span>
        </p>
        <p>
          Mode: <span className="text-foreground">{selected.mode}</span>
        </p>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[11px] w-full cursor-pointer gap-1"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("open-ai-assistant", {
                detail: {
                  prompt: `Prepare follow-up questions for interview with ${selected.candidates?.full_name ?? "candidate"}`,
                },
              })
            )
          }
        >
          <Sparkles className="h-3 w-3" /> Suggest questions
        </Button>
      </div>
    </DetailPanel>
  ) : null;

  return (
    <div className="h-[calc(100svh-var(--ws-toolbar-h)-1.25rem)] min-h-[420px]">
      <EntityWorkspace
        list={list}
        detail={detail}
        context={context}
        listDefaultSize={28}
        detailDefaultSize={52}
        contextDefaultSize={20}
        mobileDetailOpen={!!selectedId}
        onMobileDetailClose={() => selectId(null)}
      />
    </div>
  );
}

export default function AiInterviewListPage() {
  return (
    <Suspense fallback={<div className="p-4 text-xs text-muted-foreground">Loading interviews…</div>}>
      <InterviewsWorkspace />
    </Suspense>
  );
}
