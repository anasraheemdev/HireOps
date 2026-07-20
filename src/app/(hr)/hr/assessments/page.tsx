"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Plus, Loader2, Clock, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, KpiTile, PageSkeleton, StatusBadge } from "@/components/shared/enterprise-ui";
import { apiFetch } from "@/lib/api/fetcher";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type Assessment = {
  id: string;
  title: string;
  description: string | null;
  difficulty: string;
  duration_minutes: number;
  status: string;
  question_count: number;
};

export default function AssessmentsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ["assessments"],
    queryFn: () => apiFetch<Assessment[]>("/api/assessments"),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<Assessment>("/api/assessments", {
        method: "POST",
        body: JSON.stringify({ title, description }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assessments"] });
      toast.success("Assessment created");
      setOpen(false);
      setTitle("");
      setDescription("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const avgDuration = Math.round(
    assessments.reduce((s, a) => s + (a.duration_minutes || 0), 0) / Math.max(assessments.length, 1)
  );

  return (
    <div className="space-y-3 max-w-[1400px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Assessments</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Structured evaluations across the hiring pipeline
          </p>
        </div>
        <Button size="sm" className="h-8 text-[12px] gradient-brand text-white gap-1.5 cursor-pointer" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> New assessment
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <KpiTile label="Total" value={assessments.length} />
        <KpiTile label="Active" value={assessments.filter((a) => a.status === "active").length} />
        <KpiTile label="Draft" value={assessments.filter((a) => a.status === "draft").length} />
        <KpiTile label="Avg duration" value={`${avgDuration}m`} />
      </div>

      {isLoading && <PageSkeleton />}
      {!isLoading && assessments.length === 0 && (
        <EmptyState
          icon={ClipboardList}
          title="No assessments yet"
          description="Create your first assessment template for candidates."
          actionLabel="Create assessment"
          onAction={() => setOpen(true)}
        />
      )}

      {!isLoading && assessments.length > 0 && (
        <div className="ws-panel rounded-xl overflow-hidden divide-y divide-white/[0.05]">
          {assessments.map((a) => (
            <div key={a.id} className="flex items-center gap-3 px-3.5 py-3 hover:bg-white/[0.03] transition-colors">
              <div className="h-9 w-9 rounded-lg bg-primary/12 flex items-center justify-center shrink-0">
                <ClipboardList className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-medium truncate">{a.title}</p>
                  <StatusBadge tone={a.status === "active" ? "success" : "neutral"}>{a.status}</StatusBadge>
                </div>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {a.description || "No description"}
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-3 text-[11px] text-muted-foreground shrink-0">
                <span className="capitalize">{a.difficulty}</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {a.duration_minutes}m
                </span>
                <span className="inline-flex items-center gap-1">
                  <HelpCircle className="h-3 w-3" /> {a.question_count}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-popover border-white/10">
          <DialogHeader>
            <DialogTitle>Create assessment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="bg-white/5 border-white/10" />
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="bg-white/5 border-white/10" />
          </div>
          <DialogFooter>
            <Button variant="outline" className="cursor-pointer" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button className="gradient-brand text-white cursor-pointer" disabled={!title || createMutation.isPending} onClick={() => createMutation.mutate()}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
