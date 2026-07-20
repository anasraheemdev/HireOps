"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, Upload } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/enterprise-ui";
import { MotionPage, MotionList, MotionItem } from "@/components/shared/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDocumentsQuery } from "@/lib/queries/use-candidate-portal";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function CandidateDocumentsPage() {
  const { data: docs = [], isLoading, isError, error, refetch } = useDocumentsQuery();
  const inputRef = useRef<HTMLInputElement>(null);
  const [label, setLabel] = useState("Certificate");
  const [uploading, setUploading] = useState(false);
  const qc = useQueryClient();

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("label", label || file.name);
      const res = await fetch("/api/candidate/documents", { method: "POST", body: form });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      toast.success("Document uploaded");
      qc.invalidateQueries({ queryKey: ["candidate-documents"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <MotionPage>
      <PageHeader title="Documents" description="Certificates, transcripts, and supporting files." />
      <div className="glass-card p-4 mb-4 flex flex-col sm:flex-row gap-2 items-end">
        <div className="flex-1 w-full space-y-1.5">
          <label className="text-xs text-muted-foreground">Label</label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
        />
        <Button
          className="gradient-brand text-white cursor-pointer"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
          Upload
        </Button>
      </div>

      {isLoading && <PageSkeleton rows={3} />}
      {isError && (
        <ErrorState title="Could not load documents" description={error instanceof Error ? error.message : ""} onRetry={() => refetch()} />
      )}
      {!isLoading && !isError && docs.length === 0 && (
        <EmptyState icon={FileText} title="No documents" description="Upload certificates or other supporting files." />
      )}
      <MotionList className="space-y-2">
        {docs.map((d) => (
          <MotionItem key={String(d.id)}>
            <div className="glass-card p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{String(d.label)}</p>
                <p className="text-[11px] text-muted-foreground font-mono truncate">{String(d.file_path)}</p>
              </div>
              <p className="text-[11px] text-muted-foreground shrink-0">
                {d.size_bytes ? `${Math.round(Number(d.size_bytes) / 1024)} KB` : ""}
              </p>
            </div>
          </MotionItem>
        ))}
      </MotionList>
    </MotionPage>
  );
}
