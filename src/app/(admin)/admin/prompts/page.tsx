"use client";

import { useState } from "react";
import { Plus, Copy, Loader2, AlertTriangle } from "lucide-react";
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
import { useInterviewTemplatesQuery, useCreateInterviewTemplateMutation } from "@/lib/queries/use-admin";

const modes = ["behavioral", "technical", "leadership", "coding", "case"];

const promptSchema = z.object({
  name: z.string().min(2, "Name is required"),
  mode: z.string().min(2),
  systemPrompt: z.string().min(10, "Prompt body is required"),
});
type PromptFormValues = z.infer<typeof promptSchema>;

function NewPromptDialog() {
  const [open, setOpen] = useState(false);
  const create = useCreateInterviewTemplateMutation();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PromptFormValues>({
    resolver: zodResolver(promptSchema),
    defaultValues: { name: "", mode: "behavioral", systemPrompt: "" },
  });

  const onSubmit = (values: PromptFormValues) => {
    create.mutate(values, {
      onSuccess: () => {
        toast.success(`Prompt "${values.name}" saved`);
        reset();
        setOpen(false);
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to save prompt"),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger render={<Button className="gradient-brand text-white gap-2 cursor-pointer" />}>
        <Plus className="h-4 w-4" /> New prompt
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg bg-popover border-white/10">
        <DialogHeader>
          <DialogTitle>New system prompt</DialogTitle>
          <DialogDescription>Stored as an interview template so AI interviews can use it immediately.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input {...register("name")} placeholder="e.g. Resume parse system" className="bg-white/5 border-white/10" />
            {errors.name && <p className="text-xs text-rose-400">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Category / mode</Label>
            <LabeledSelect
              value={watch("mode")}
              onValueChange={(v) => setValue("mode", v)}
              options={modes.map((m) => ({ value: m, label: m[0].toUpperCase() + m.slice(1) }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Prompt body</Label>
            <Textarea {...register("systemPrompt")} rows={6} className="bg-white/5 border-white/10 font-mono text-xs" placeholder="Extract structured candidate fields..." />
            {errors.systemPrompt && <p className="text-xs text-rose-400">{errors.systemPrompt.message}</p>}
          </div>
          <DialogFooter className="px-0">
            <DialogClose render={<Button type="button" variant="outline" className="bg-white/5 border-white/10 cursor-pointer" />}>
              Cancel
            </DialogClose>
            <Button type="submit" className="gradient-brand text-white cursor-pointer" disabled={create.isPending}>
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save prompt"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminPromptsPage() {
  const { data: templates, isLoading, isError, error, refetch } = useInterviewTemplatesQuery();

  return (
    <div>
      <PageHeader
        title="Prompt library"
        description="System prompts used by AI interview workflows, stored as interview templates."
        actions={<NewPromptDialog />}
      />

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <div className="glass-card p-10 text-center">
          <AlertTriangle className="h-8 w-8 text-rose-400 mx-auto mb-3" />
          <p className="text-sm font-medium">Couldn&apos;t load prompts</p>
          <p className="text-xs text-muted-foreground mt-1">{error instanceof Error ? error.message : "Unknown error"}</p>
          <Button variant="outline" className="mt-4 bg-white/5 border-white/10 cursor-pointer" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {!isLoading && !isError && (templates?.length ?? 0) === 0 && (
        <EmptyState title="No prompts yet" description="Create your first system prompt to power AI interviews." />
      )}

      {!isLoading && !isError && (templates?.length ?? 0) > 0 && (
        <div className="space-y-3">
          {templates!.map((p) => (
            <div key={p.id} className="glass-card p-5 flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="text-sm font-medium">{p.name}</p>
                  <Badge variant="outline" className="bg-white/5 border-white/10 text-[10px] capitalize">
                    {p.mode}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{p.system_prompt ?? "No prompt body set."}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/5 border-white/10 gap-1.5 shrink-0 cursor-pointer"
                onClick={() => {
                  navigator.clipboard.writeText(p.system_prompt ?? "");
                  toast.success(`Copied "${p.name}" to clipboard.`);
                }}
              >
                <Copy className="h-3.5 w-3.5" /> Copy
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
