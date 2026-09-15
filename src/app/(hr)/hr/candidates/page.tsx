"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Search,
  Upload,
  Star,
  MapPin,
  AlertTriangle,
  Users,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  Mail,
  Briefcase,
  Plus,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StageBadge, MatchBadge } from "@/components/shared/stage-badge";
import { ScoreRing } from "@/components/shared/score-ring";
import { CandidateScoringPanel } from "@/components/candidates/scoring-panel";
import { EntityWorkspace } from "@/components/workspace/entity-workspace";
import { DetailPanel } from "@/components/workspace/detail-panel";
import { DataTable } from "@/components/workspace/data-table";
import { useFavorites } from "@/components/workspace/favorites-store";
import { useRecent } from "@/components/workspace/recent-store";
import { useCandidatesQuery, useCandidateQuery, useApplicationDecisionMutation } from "@/lib/queries/use-candidates";
import { useCreateCandidateMutation } from "@/lib/queries/use-ai";
import { useJobsQuery } from "@/lib/queries/use-jobs";
import type { Candidate, PipelineStage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const stages: (PipelineStage | "All Stages")[] = [
  "All Stages",
  "Applied",
  "Screening",
  "Assessment",
  "AI Interview",
  "Final Interview",
  "Offer",
  "Hired",
  "Rejected",
];

function CandidateDetail({ id }: { id: string }) {
  const { data: candidate, isLoading, isError } = useCandidateQuery(id);
  const decision = useApplicationDecisionMutation();
  const { toggle, isFavorite } = useFavorites();
  const { push } = useRecent();
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    if (candidate) {
      push({
        id: candidate.id,
        type: "candidate",
        label: candidate.name,
        href: `/hr/candidates?id=${candidate.id}`,
      });
    }
  }, [candidate, push]);

  const handleDecision = (type: "shortlist" | "reject") => {
    if (!candidate?.applicationId) {
      toast.error("No active application");
      return;
    }
    decision.mutate(
      { applicationId: candidate.applicationId, decision: type },
      {
        onSuccess: () =>
          toast[type === "shortlist" ? "success" : "error"](
            type === "shortlist" ? "Shortlisted" : "Rejected"
          ),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed"),
      }
    );
  };

  if (isLoading) {
    return (
      <DetailPanel title="Loading…">
        <Skeleton className="h-24 w-full" />
      </DetailPanel>
    );
  }
  if (isError || !candidate) {
    return (
      <DetailPanel title="Candidate">
        <p className="text-xs text-muted-foreground">Could not load candidate.</p>
      </DetailPanel>
    );
  }

  const fav = isFavorite(candidate.id, "candidate");

  return (
    <DetailPanel
      title={candidate.name}
      subtitle={`${candidate.title} · ${candidate.appliedFor}`}
      actions={
        <>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 cursor-pointer"
            onClick={() =>
              toggle({
                id: candidate.id,
                type: "candidate",
                label: candidate.name,
                href: `/hr/candidates?id=${candidate.id}`,
              })
            }
          >
            <Star className={cn("h-3.5 w-3.5", fav && "fill-amber-400 text-amber-400")} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] text-rose-400 cursor-pointer"
            disabled={decision.isPending}
            onClick={() => handleDecision("reject")}
          >
            <ThumbsDown className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            className="h-7 text-[11px] gradient-brand text-white cursor-pointer"
            disabled={decision.isPending}
            onClick={() => handleDecision("shortlist")}
          >
            <ThumbsUp className="h-3 w-3" />
          </Button>
        </>
      }
      tabs={[
        { id: "overview", label: "Overview" },
        { id: "skills", label: "Skills" },
        { id: "experience", label: "Experience" },
        { id: "scoring", label: "Scoring" },
      ]}
      activeTab={tab}
      onTabChange={setTab}
    >
      {tab === "overview" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border border-white/10">
              <AvatarFallback className={cn("bg-gradient-to-br text-white text-sm", candidate.avatarColor)}>
                {candidate.initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <StageBadge stage={candidate.stage} />
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {candidate.location}
              </p>
            </div>
            <div className="ml-auto">
              <ScoreRing score={candidate.matchScore} size={56} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-md border border-white/8 bg-white/[0.02] p-2">
              <p className="text-muted-foreground">Experience</p>
              <p className="font-medium">{candidate.experienceYears} years</p>
            </div>
            <div className="rounded-md border border-white/8 bg-white/[0.02] p-2">
              <p className="text-muted-foreground">Applied</p>
              <p className="font-medium">{candidate.appliedDate}</p>
            </div>
            <div className="rounded-md border border-white/8 bg-white/[0.02] p-2 col-span-2">
              <p className="text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" /> Email
              </p>
              <p className="font-medium truncate">{candidate.email ?? "—"}</p>
            </div>
          </div>
          {candidate.aiRecommendation && (
            <div>
              <p className="text-[11px] font-semibold mb-1">AI recommendation</p>
              <p className="text-[12px] text-muted-foreground whitespace-pre-wrap">{candidate.aiRecommendation}</p>
            </div>
          )}
          {candidate.strengths?.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold mb-1">Strengths</p>
              <ul className="text-[11px] text-muted-foreground list-disc pl-4">
                {candidate.strengths.slice(0, 5).map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {tab === "skills" && (
        <div className="flex flex-wrap gap-1.5">
          {(candidate.skills ?? []).map((s) => (
            <span key={s} className="text-[11px] rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
              {s}
            </span>
          ))}
          {(candidate.skills ?? []).length === 0 && (
            <p className="text-[11px] text-muted-foreground">No skills listed</p>
          )}
        </div>
      )}
      {tab === "experience" && (
        <div className="space-y-2">
          <p className="text-[12px] flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5 text-primary" /> {candidate.title}
          </p>
          <p className="text-[11px] text-muted-foreground">{candidate.experienceYears} years · {candidate.department}</p>
        </div>
      )}
      {tab === "scoring" && <CandidateScoringPanel candidate={candidate} />}
    </DetailPanel>
  );
}

function CandidateContext({ id }: { id: string }) {
  const { data: candidate } = useCandidateQuery(id);
  return (
    <DetailPanel title="AI & Activity" subtitle="Insights and timeline">
      <div className="space-y-3">
        <div className="rounded-md border border-primary/20 bg-primary/10 p-2.5">
          <p className="text-[11px] font-semibold flex items-center gap-1 mb-1">
            <Sparkles className="h-3 w-3 text-primary" /> Match insight
          </p>
          <p className="text-[11px] text-muted-foreground">
            {candidate
              ? `${candidate.name} scores ${candidate.matchScore}% against ${candidate.appliedFor}. Review skills alignment and schedule AI interview if stage allows.`
              : "Select a candidate for insights."}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-2 h-7 text-[11px] cursor-pointer"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("open-ai-assistant", {
                  detail: { prompt: candidate ? `Summarize candidate ${candidate.name}` : "Summarize pipeline" },
                })
              )
            }
          >
            Ask AI
          </Button>
        </div>
        <div>
          <p className="text-[11px] font-semibold mb-1.5">Timeline</p>
          <ul className="space-y-2 text-[11px] text-muted-foreground">
            <li className="border-l-2 border-primary/40 pl-2">Applied · {candidate?.appliedDate ?? "—"}</li>
            <li className="border-l-2 border-white/15 pl-2">Stage · {candidate?.stage ?? "—"}</li>
            <li className="border-l-2 border-white/15 pl-2">Match score · {candidate?.matchScore ?? "—"}%</li>
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-semibold mb-1.5">Notes</p>
          <p className="text-[11px] text-muted-foreground">
            Use recruiter notes from the interview workspace. Activity feeds sync via notifications.
          </p>
        </div>
      </div>
    </DetailPanel>
  );
}

function CandidatesWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<string>("All Stages");
  const [department, setDepartment] = useState<string>("All Departments");
  const [selectedRows, setSelectedRows] = useState<Candidate[]>([]);

  const { data: candidates, isLoading, isError, error, refetch } = useCandidatesQuery();
  const { data: openJobsData = [] } = useJobsQuery();
  const decision = useApplicationDecisionMutation();
  const createCandidateMutation = useCreateCandidateMutation();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [headline, setHeadline] = useState("");
  const [location, setLocation] = useState("Muscat, Oman");
  const [expYears, setExpYears] = useState(2);
  const [jobId, setJobId] = useState("");
  const [skills, setSkills] = useState("");

  const handleAddCandidateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    try {
      await createCandidateMutation.mutateAsync({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone || null,
        headline: headline || null,
        location: location || null,
        experienceYears: Number(expYears) || 0,
        skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
        jobId: jobId || null,
        source: "manual_hr_add",
      });
      toast.success(`Candidate "${fullName}" added to pipeline`);
      setAddModalOpen(false);
      setFullName("");
      setEmail("");
      setPhone("");
      setHeadline("");
      setSkills("");
      setJobId("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add candidate");
    }
  };

  const departments = useMemo(
    () => ["All Departments", ...Array.from(new Set((candidates ?? []).map((c) => c.department)))],
    [candidates]
  );

  const filtered = useMemo(() => {
    return (candidates ?? []).filter((c) => {
      const matchesQuery =
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.title.toLowerCase().includes(query.toLowerCase()) ||
        c.skills.some((s) => s.toLowerCase().includes(query.toLowerCase()));
      const matchesStage = stage === "All Stages" || c.stage === stage;
      const matchesDept = department === "All Departments" || c.department === department;
      return matchesQuery && matchesStage && matchesDept;
    });
  }, [candidates, query, stage, department]);

  const selectId = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("id", id);
      else params.delete("id");
      router.replace(`/hr/candidates?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!filtered.length) return;
      const idx = selectedId ? filtered.findIndex((c) => c.id === selectedId) : -1;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = filtered[Math.min(idx + 1, filtered.length - 1)];
        if (next) selectId(next.id);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const next = filtered[Math.max(idx - 1, 0)];
        if (next) selectId(next.id);
      }
      if (e.key === "Enter" && selectedId) {
        e.preventDefault();
      }
      if (e.key === "Escape") {
        selectId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtered, selectedId, selectId]);

  const columns = useMemo<ColumnDef<Candidate, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Candidate",
        size: 200,
        cell: ({ row }) => (
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-7 w-7 border border-white/10 shrink-0">
              <AvatarFallback className={cn("bg-gradient-to-br text-white text-[10px]", row.original.avatarColor)}>
                {row.original.initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium truncate">{row.original.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{row.original.location}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "appliedFor",
        header: "Role",
        size: 140,
        cell: ({ getValue }) => <span className="text-muted-foreground truncate block">{String(getValue())}</span>,
      },
      {
        accessorKey: "stage",
        header: "Stage",
        size: 120,
        cell: ({ row }) => <StageBadge stage={row.original.stage} />,
      },
      {
        accessorKey: "matchScore",
        header: "Match",
        size: 80,
        cell: ({ row }) => <MatchBadge score={row.original.matchScore} />,
      },
      {
        accessorKey: "experienceYears",
        header: "Exp",
        size: 56,
        cell: ({ getValue }) => <span className="text-muted-foreground">{String(getValue())}y</span>,
      },
    ],
    []
  );

  const list = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-white/8 px-2.5 py-2 shrink-0">
        <div>
          <h1 className="text-sm font-semibold">Candidates</h1>
          <p className="text-[10px] text-muted-foreground">
            {isLoading ? "Loading…" : `${filtered.length} of ${(candidates ?? []).length}`}
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            className="h-7 text-[11px] gap-1 cursor-pointer gradient-brand text-white"
            onClick={() => setAddModalOpen(true)}
          >
            <Plus className="h-3 w-3" /> Candidate
          </Button>
          <Link href="/hr/cv-parsing">
            <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1 cursor-pointer">
              <Upload className="h-3 w-3" /> CV
            </Button>
          </Link>
        </div>
      </div>

      {/* Add Candidate Modal Form */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-md glass-card border-white/15">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Add New Candidate
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Manually add a candidate to your organization pool and assign a role.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddCandidateSubmit} className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Full Name *</Label>
              <Input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Salim Al-Rawahi"
                className="bg-white/5 border-white/10 h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Email *</Label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="candidate@example.com"
                  className="bg-white/5 border-white/10 h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+968 9123 4567"
                  className="bg-white/5 border-white/10 h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Headline / Current Role</Label>
              <Input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Senior Data Engineer"
                className="bg-white/5 border-white/10 h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Location</Label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="bg-white/5 border-white/10 h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Years of Experience</Label>
                <Input
                  type="number"
                  min={0}
                  max={50}
                  value={expYears}
                  onChange={(e) => setExpYears(Number(e.target.value) || 0)}
                  className="bg-white/5 border-white/10 h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Assign Open Position (Optional)</Label>
              <Select value={jobId} onValueChange={(v) => v != null && setJobId(v)}>
                <SelectTrigger className="bg-white/5 border-white/10 h-9 text-xs">
                  <SelectValue placeholder="Select a open job…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None (Pool only)</SelectItem>
                  {openJobsData.filter((j) => j.status === "Open").map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.title} ({j.department})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Skills (Comma-separated)</Label>
              <Input
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="Python, PostgreSQL, React, AWS"
                className="bg-white/5 border-white/10 h-9 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setAddModalOpen(false)}
                disabled={createCandidateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="gradient-brand text-white text-xs gap-1.5 cursor-pointer"
                disabled={createCandidateMutation.isPending}
              >
                {createCandidateMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Adding…
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" /> Save Candidate
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {isLoading && (
        <div className="p-3 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      )}
      {isError && (
        <div className="p-6 text-center">
          <AlertTriangle className="h-6 w-6 text-rose-400 mx-auto mb-2" />
          <p className="text-xs">{error instanceof Error ? error.message : "Error"}</p>
          <Button variant="outline" size="sm" className="mt-2 cursor-pointer" onClick={() => refetch()}>
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
          enableSelection
          onSelectionChange={setSelectedRows}
          emptyMessage="No candidates match filters"
          bulkActions={
            <div className="flex items-center gap-1.5">
              <Select
                onValueChange={(stageVal) => {
                  if (!stageVal || !selectedRows.length) return;
                  let count = 0;
                  const isShortlist = stageVal === "Shortlist";
                  const isReject = stageVal === "Reject";
                  selectedRows.forEach((cand) => {
                    if (cand.applicationId) {
                      decision.mutate({
                        applicationId: cand.applicationId,
                        decision: isReject ? "reject" : "shortlist",
                      });
                      count++;
                    }
                  });
                  toast.success(`Updated ${count} selected candidates`);
                }}
              >
                <SelectTrigger className="h-6 text-[10px] w-[130px] bg-white/10 border-white/20">
                  <SelectValue placeholder="Batch decision…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Shortlist">Shortlist selected</SelectItem>
                  <SelectItem value="Reject">Reject selected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
          toolbar={
            <>
              <div className="relative flex-1 min-w-[120px]">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter…"
                  className="pl-7 h-7 text-[11px] bg-white/5 border-white/10"
                />
              </div>
              <Select value={stage} onValueChange={(v) => v != null && setStage(v)}>
                <SelectTrigger className="w-[110px] h-7 text-[11px] bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
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
      {!isLoading && !isError && filtered.length === 0 && (
        <div className="p-8 text-center text-muted-foreground">
          <Users className="h-6 w-6 mx-auto mb-2 opacity-50" />
          <p className="text-xs">No matches</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-[calc(100svh-var(--ws-toolbar-h)-1.25rem)] min-h-[420px]">
      <EntityWorkspace
        list={list}
        detail={selectedId ? <CandidateDetail id={selectedId} /> : null}
        context={selectedId ? <CandidateContext id={selectedId} /> : null}
        mobileDetailOpen={!!selectedId}
        onMobileDetailClose={() => selectId(null)}
        listDefaultSize={34}
        detailDefaultSize={40}
        contextDefaultSize={26}
      />
    </div>
  );
}

export default function CandidatesPage() {
  return (
    <Suspense fallback={<div className="p-4 text-xs text-muted-foreground">Loading candidates…</div>}>
      <CandidatesWorkspace />
    </Suspense>
  );
}
