"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Plus, Loader2, AlertTriangle, MessageSquareText } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LabeledSelect } from "@/components/shared/labeled-select";
import { EmptyState } from "@/components/shared/enterprise-ui";
import { apiFetch } from "@/lib/api/fetcher";
import { cn } from "@/lib/utils";
import { useInterviewTemplatesQuery, useCreateInterviewTemplateMutation } from "@/lib/queries/use-admin";

type AssessmentRow = {
  id: string;
  title: string;
  difficulty: string;
  duration_minutes: number;
  question_count: number;
  status: string;
};

const modes = ["behavioral", "technical", "leadership", "coding", "case"];

const templateSchema = z.object({
  name: z.string().min(2, "Name is required"),
  mode: z.string().min(2),
  systemPrompt: z.string().optional(),
});
type TemplateFormValues = z.infer<typeof templateSchema>;

function NewTemplateDialog() {
  const [open, setOpen] = useState(false);
  const create = useCreateInterviewTemplateMutation();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: { name: "", mode: "behavioral", systemPrompt: "" },
  });

  const onSubmit = (values: TemplateFormValues) => {
    create.mutate(values, {
      onSuccess: () => {
        toast.success(`Template "${values.name}" created`);
        reset();
        setOpen(false);
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to create template"),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger render={<Button className="gradient-brand text-white gap-2 cursor-pointer" />}>
        <Plus className="h-4 w-4" /> New template
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg bg-popover border-white/10">
        <DialogHeader>
          <DialogTitle>New interview template</DialogTitle>
          <DialogDescription>Define a reusable interview mode and system prompt for AI interviews.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input {...register("name")} placeholder="e.g. Investment Analyst — Panel" className="bg-white/5 border-white/10" />
            {errors.name && <p className="text-xs text-rose-400">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Mode</Label>
            <LabeledSelect
              value={watch("mode")}
              onValueChange={(v) => setValue("mode", v)}
              options={modes.map((m) => ({ value: m, label: m[0].toUpperCase() + m.slice(1) }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>System prompt</Label>
            <Textarea {...register("systemPrompt")} rows={5} className="bg-white/5 border-white/10 font-mono text-xs" placeholder="You are Amina, an AI interviewer..." />
          </div>
          <DialogFooter className="px-0">
            <DialogClose render={<Button type="button" variant="outline" className="bg-white/5 border-white/10 cursor-pointer" />}>
              Cancel
            </DialogClose>
            <Button type="submit" className="gradient-brand text-white cursor-pointer" disabled={create.isPending}>
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminTemplatesPage() {
  const { data: templates, isLoading: templatesLoading, isError: templatesError } = useInterviewTemplatesQuery();
  const { data: assessments, isLoading: assessmentsLoading, isError: assessmentsError } = useQuery({
    queryKey: ["assessments"],
    queryFn: () => apiFetch<AssessmentRow[]>("/api/assessments"),
  });

  return (
    <div>
      <PageHeader
        title="Templates"
        description="Assessment and interview templates shared across hiring teams."
        actions={<NewTemplateDialog />}
      />

      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-muted-foreground" /> Assessments
      </h3>
      {assessmentsLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      )}
      {assessmentsError && <p className="text-xs text-rose-400 mb-8">Couldn&apos;t load assessments.</p>}
      {!assessmentsLoading && !assessmentsError && (assessments?.length ?? 0) === 0 && (
        <div className="mb-8">
          <EmptyState title="No assessments yet" description="Assessments created by HR will appear here." />
        </div>
      )}
      {!assessmentsLoading && !assessmentsError && (assessments?.length ?? 0) > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
          {assessments!.map((t) => (
            <div key={t.id} className="glass-card p-5">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-sm font-medium leading-snug">{t.title}</p>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] shrink-0 capitalize",
                    t.status === "active"
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25"
                      : "bg-white/5 text-muted-foreground border-white/10"
                  )}
                >
                  {t.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground capitalize">
                {t.difficulty} · {t.question_count} questions · {t.duration_minutes} min
              </p>
            </div>
          ))}
        </div>
      )}

      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <MessageSquareText className="h-4 w-4 text-muted-foreground" /> Interview templates
      </h3>
      {templatesLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      )}
      {templatesError && (
        <div className="glass-card p-8 text-center">
          <AlertTriangle className="h-6 w-6 text-rose-400 mx-auto mb-2" />
          <p className="text-sm">Couldn&apos;t load interview templates</p>
        </div>
      )}
      {!templatesLoading && !templatesError && (templates?.length ?? 0) === 0 && (
        <EmptyState title="No interview templates yet" description="Create your first template to standardize AI interviews." />
      )}
      {!templatesLoading && !templatesError && (templates?.length ?? 0) > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates!.map((t) => (
            <div key={t.id} className="glass-card p-5">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-sm font-medium leading-snug">{t.name}</p>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] capitalize shrink-0">
                  {t.mode}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{t.system_prompt ?? "No system prompt set."}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
