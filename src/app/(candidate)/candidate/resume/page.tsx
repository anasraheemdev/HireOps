"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, PageSkeleton } from "@/components/shared/enterprise-ui";
import { MotionPage } from "@/components/shared/motion";
import { Button } from "@/components/ui/button";
import { useMeQuery } from "@/lib/queries/use-candidate-portal";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function CandidateResumePage() {
  const { data, isLoading, isError, error, refetch } = useMeQuery();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/candidate/resume", { method: "POST", body: form });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      toast.success("Resume uploaded");
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["candidate-documents"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) return <PageSkeleton rows={3} />;
  if (isError) {
    return <ErrorState title="Could not load resume" description={error instanceof Error ? error.message : ""} onRetry={() => refetch()} />;
  }

  const path = data?.candidate?.resume_file_path as string | null | undefined;

  return (
    <MotionPage>
      <PageHeader title="Resume" description="Upload a PDF or DOCX. HR and AI matching use this file." />
      <div
        className={`glass-card p-10 border-dashed text-center transition-colors ${dragOver ? "border-primary/50 bg-primary/5" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void upload(file);
        }}
      >
        <FileUp className="h-8 w-8 text-primary mx-auto mb-3" />
        <p className="text-sm font-medium mb-1">{path ? "Replace your resume" : "Drop your resume here"}</p>
        <p className="text-xs text-muted-foreground mb-4">PDF or DOCX, up to 10MB</p>
        {path && <p className="text-[11px] text-muted-foreground mb-4 font-mono break-all">{path}</p>}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx,application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <Button
          className="gradient-brand text-white cursor-pointer"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Uploading…
            </>
          ) : (
            "Choose file"
          )}
        </Button>
      </div>
    </MotionPage>
  );
}
