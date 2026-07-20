"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Search, MapPin, Users, Briefcase, Sparkles, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JobFormSheet } from "@/components/jobs/job-form-sheet";
import { EntityWorkspace } from "@/components/workspace/entity-workspace";
import { DetailPanel } from "@/components/workspace/detail-panel";
import { DataTable } from "@/components/workspace/data-table";
import { useFavorites } from "@/components/workspace/favorites-store";
import { useRecent } from "@/components/workspace/recent-store";
import { useJobsQuery } from "@/lib/queries/use-jobs";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetcher";
import type { Job } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

const statusStyles: Record<string, string> = {
  Open: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  Closed: "bg-slate-500/15 text-slate-300 border-slate-500/25",
  Draft: "bg-sky-500/15 text-sky-300 border-sky-500/25",
  "On Hold": "bg-amber-500/15 text-amber-300 border-amber-500/25",
};

const statuses = ["All Status", "Open", "Closed", "Draft", "On Hold"];

function JobDetail({ job }: { job: Job }) {
  const { toggle, isFavorite } = useFavorites();
  const { push } = useRecent();
  const [tab, setTab] = useState("details");
  const fav = isFavorite(job.id, "job");

  useEffect(() => {
    push({ id: job.id, type: "job", label: job.title, href: `/hr/jobs?id=${job.id}` });
  }, [job, push]);

  const { data: matchPayload } = useQuery({
    queryKey: ["job-matches", job.id],
    queryFn: () =>
      apiFetch<{ matches: { id: string; name: string; matchScore: number; similarity: number }[] }>(
        `/api/jobs/${job.id}/matches`
      ),
    enabled: tab === "matches",
  });
  const matches = matchPayload?.matches ?? [];

  return (
    <DetailPanel
      title={job.title}
      subtitle={`${job.department} · ${job.location}`}
      actions={
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 cursor-pointer"
          onClick={() =>
            toggle({ id: job.id, type: "job", label: job.title, href: `/hr/jobs?id=${job.id}` })
          }
        >
          <Star className={cn("h-3.5 w-3.5", fav && "fill-amber-400 text-amber-400")} />
        </Button>
      }
      tabs={[
        { id: "details", label: "Details" },
        { id: "matches", label: "AI Matches" },
        { id: "applicants", label: "Applicants" },
      ]}
      activeTab={tab}
      onTabChange={setTab}
    >
      {tab === "details" && (
        <div className="space-y-3 text-[12px]">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className={cn("text-[10px]", statusStyles[job.status])}>
              {job.status}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {job.priority}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {job.applicants} applicants
            </Badge>
          </div>
          <p className="text-muted-foreground whitespace-pre-wrap">{job.description || "No description."}</p>
          {(job.requiredSkills ?? []).length > 0 && (
            <div>
              <p className="font-semibold text-[11px] mb-1">Required skills</p>
              <div className="flex flex-wrap gap-1">
                {job.requiredSkills.map((s) => (
                  <span key={s} className="text-[10px] rounded-full border border-white/10 px-2 py-0.5">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {tab === "matches" && (
        <div className="space-y-2">
          {matches.length === 0 && <p className="text-[11px] text-muted-foreground">No matches yet.</p>}
          {matches.map((m) => (
            <div key={m.id} className="flex justify-between text-[11px] border-b border-white/5 py-1.5">
              <span>{m.name}</span>
              <span className="text-primary font-medium">{m.matchScore}%</span>
            </div>
          ))}
        </div>
      )}
      {tab === "applicants" && (
        <p className="text-[11px] text-muted-foreground">
          {job.applicants} applicants tracked. Open Candidates filtered by this role for the full pipeline.
        </p>
      )}
    </DetailPanel>
  );
}

function JobContext({ job }: { job: Job }) {
  return (
    <DetailPanel title="Analytics" subtitle="Role insights">
      <div className="space-y-3 text-[11px]">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md border border-white/8 p-2">
            <p className="text-muted-foreground">Applicants</p>
            <p className="text-sm font-semibold">{job.applicants}</p>
          </div>
          <div className="rounded-md border border-white/8 p-2">
            <p className="text-muted-foreground">Priority</p>
            <p className="text-sm font-semibold">{job.priority}</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[11px] w-full cursor-pointer gap-1"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("open-ai-assistant", {
                detail: { prompt: `Recommend next steps for job ${job.title}` },
              })
            )
          }
        >
          <Sparkles className="h-3 w-3" /> AI recommendations
        </Button>
      </div>
    </DetailPanel>
  );
}

function JobsWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");
  const openCreate = searchParams.get("create") === "1";
  void openCreate;
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("All Departments");
  const [status, setStatus] = useState("All Status");

  const { data: jobs, isLoading, isError, error, refetch } = useJobsQuery();

  const departments = useMemo(
    () => ["All Departments", ...Array.from(new Set((jobs ?? []).map((j) => j.department)))],
    [jobs]
  );

  const filtered = useMemo(() => {
    return (jobs ?? []).filter((j) => {
      const matchesQuery = j.title.toLowerCase().includes(query.toLowerCase());
      const matchesDept = department === "All Departments" || j.department === department;
      const matchesStatus = status === "All Status" || j.status === status;
      return matchesQuery && matchesDept && matchesStatus;
    });
  }, [jobs, query, department, status]);

  const selected = filtered.find((j) => j.id === selectedId) ?? (jobs ?? []).find((j) => j.id === selectedId);

  const selectId = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("id", id);
      else params.delete("id");
      params.delete("create");
      router.replace(`/hr/jobs?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const columns = useMemo<ColumnDef<Job, unknown>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Job",
        size: 200,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="font-medium truncate">{row.original.title}</p>
            <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
              <MapPin className="h-2.5 w-2.5" /> {row.original.location}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "department",
        header: "Dept",
        size: 100,
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 90,
        cell: ({ row }) => (
          <Badge variant="outline" className={cn("text-[10px]", statusStyles[row.original.status])}>
            {row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: "applicants",
        header: "Apps",
        size: 56,
      },
    ],
    []
  );

  const list = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-white/8 px-2.5 py-2">
        <div>
          <h1 className="text-sm font-semibold">Jobs</h1>
          <p className="text-[10px] text-muted-foreground">
            {(jobs ?? []).filter((j) => j.status === "Open").length} open
          </p>
        </div>
        <JobFormSheet />
      </div>
      {isLoading && (
        <div className="p-3 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      )}
      {isError && (
        <div className="p-6 text-center">
          <AlertTriangle className="h-6 w-6 text-rose-400 mx-auto mb-2" />
          <p className="text-xs">{error instanceof Error ? error.message : "Error"}</p>
          <Button size="sm" variant="outline" className="mt-2 cursor-pointer" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}
      {!isLoading && !isError && (
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(r) => r.id}
          selectedId={selectedId}
          onRowClick={(r) => selectId(r.id)}
          emptyMessage="No jobs"
          toolbar={
            <>
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter jobs…"
                  className="pl-7 h-7 text-[11px] bg-white/5 border-white/10"
                />
              </div>
              <Select value={status} onValueChange={(v) => v != null && setStatus(v)}>
                <SelectTrigger className="w-[100px] h-7 text-[11px] bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={department} onValueChange={(v) => v != null && setDepartment(v)}>
                <SelectTrigger className="w-[120px] h-7 text-[11px] bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          }
        />
      )}
    </div>
  );

  return (
    <div className="h-[calc(100svh-var(--ws-toolbar-h)-1.25rem)] min-h-[420px]">
      <EntityWorkspace
        list={list}
        detail={selected ? <JobDetail job={selected} /> : null}
        context={selected ? <JobContext job={selected} /> : null}
        mobileDetailOpen={!!selected}
        onMobileDetailClose={() => selectId(null)}
      />
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={<div className="p-4 text-xs text-muted-foreground">Loading jobs…</div>}>
      <JobsWorkspace />
    </Suspense>
  );
}
