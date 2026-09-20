"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Trash2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  useCandidateDeletionPreviewQuery,
  useDeleteCandidateMutation,
  type AdminUser,
} from "@/lib/queries/use-admin";

interface PermanentDeleteCandidateModalProps {
  candidateUser: AdminUser | { id: string; email: string; fullName: string | null };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PermanentDeleteCandidateModal({
  candidateUser,
  open,
  onOpenChange,
  onSuccess,
}: PermanentDeleteCandidateModalProps) {
  const [confirmationText, setConfirmationText] = useState("");
  const [emailText, setEmailText] = useState("");
  const [reasonText, setReasonText] = useState("");

  const { data: previewResponse, isLoading: isPreviewLoading, isError: isPreviewError } =
    useCandidateDeletionPreviewQuery(candidateUser.id, open);

  const deleteMutation = useDeleteCandidateMutation();

  const preview = previewResponse?.data;
  const targetEmail = preview?.candidate.email ?? candidateUser.email;
  const canDelete = preview?.canDelete ?? true;

  const isConfirmationValid =
    confirmationText.trim() === "DELETE" &&
    emailText.trim().toLowerCase() === targetEmail.toLowerCase() &&
    reasonText.trim().length >= 3 &&
    canDelete;

  const handleDelete = () => {
    if (!isConfirmationValid) return;

    deleteMutation.mutate(
      {
        candidateId: candidateUser.id,
        confirmation: "DELETE",
        candidateEmail: emailText.trim(),
        reason: reasonText.trim(),
      },
      {
        onSuccess: () => {
          toast.success("Candidate permanently deleted. Account, recruitment data, and files removed.");
          onOpenChange(false);
          if (onSuccess) onSuccess();
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to delete candidate");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !deleteMutation.isPending && onOpenChange(v)}>
      <DialogContent className="sm:max-w-lg bg-[#0D1424] border border-rose-500/30 text-[#F8FAFC]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-400 text-lg">
            <Trash2 className="h-5 w-5" /> Permanently Delete Candidate
          </DialogTitle>
          <DialogDescription className="text-xs text-[#94A3B8]">
            This is an irreversible, security-sensitive operation. All candidate database records, authentication credentials, and storage files will be permanently purged.
          </DialogDescription>
        </DialogHeader>

        {/* Warning Banner */}
        <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-3 flex items-start gap-3 text-xs text-rose-200">
          <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-rose-300">Irreversible Action Warning</p>
            <p className="mt-0.5 leading-relaxed">
              This permanently deletes the candidate account, recruitment history, assessment data, interview data, uploaded CVs/documents, and login access. This action cannot be undone.
            </p>
          </div>
        </div>

        {/* Target Candidate & Dependency Preview */}
        {isPreviewLoading ? (
          <div className="flex items-center justify-center py-6 text-xs text-[#94A3B8] gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-[#C5A059]" /> Loading candidate dependency report...
          </div>
        ) : isPreviewError ? (
          <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-lg text-xs text-amber-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" /> Could not load full preview report. Target details: {candidateUser.email}
          </div>
        ) : (
          <div className="space-y-3 bg-[#080D16] border border-[#263140] rounded-xl p-3.5 text-xs">
            <div className="flex justify-between items-center border-b border-[#263140] pb-2">
              <span className="font-medium text-[#F8FAFC]">{preview?.candidate.fullName || candidateUser.fullName || "Candidate"}</span>
              <span className="text-[#94A3B8] font-mono text-[11px]">{targetEmail}</span>
            </div>

            {preview?.warnings && preview.warnings.length > 0 && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded text-rose-300 space-y-1">
                {preview.warnings.map((w, idx) => (
                  <p key={idx} className="font-medium">⚠️ {w}</p>
                ))}
              </div>
            )}

            <p className="text-[11px] text-[#94A3B8] font-medium">The following records will be permanently removed:</p>
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <div className="bg-[#0D1424] p-2 rounded border border-[#263140]">
                <span className="text-[#94A3B8]">Applications:</span> <strong className="text-[#F8FAFC]">{preview?.dependencies.applications ?? 0}</strong>
              </div>
              <div className="bg-[#0D1424] p-2 rounded border border-[#263140]">
                <span className="text-[#94A3B8]">Assessments:</span> <strong className="text-[#F8FAFC]">{preview?.dependencies.assessments ?? 0}</strong>
              </div>
              <div className="bg-[#0D1424] p-2 rounded border border-[#263140]">
                <span className="text-[#94A3B8]">AI Interviews:</span> <strong className="text-[#F8FAFC]">{preview?.dependencies.interviewSessions ?? 0}</strong>
              </div>
              <div className="bg-[#0D1424] p-2 rounded border border-[#263140]">
                <span className="text-[#94A3B8]">Documents:</span> <strong className="text-[#F8FAFC]">{preview?.dependencies.documents ?? 0}</strong>
              </div>
              <div className="bg-[#0D1424] p-2 rounded border border-[#263140]">
                <span className="text-[#94A3B8]">Offers:</span> <strong className="text-[#F8FAFC]">{preview?.dependencies.offers ?? 0}</strong>
              </div>
              <div className="bg-[#0D1424] p-2 rounded border border-[#263140]">
                <span className="text-[#94A3B8]">Storage Files:</span> <strong className="text-[#F8FAFC]">{preview?.storageFiles.length ?? 0}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Form */}
        <div className="space-y-3 pt-1 text-xs">
          <div className="space-y-1">
            <Label className="text-xs text-[#CBD5E1]">
              1. Type <span className="font-mono text-rose-400 font-bold">DELETE</span> to confirm:
            </Label>
            <Input
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="DELETE"
              disabled={deleteMutation.isPending}
              className="bg-[#080D16] border-[#263140] text-[#F8FAFC] font-mono focus:border-rose-500 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-[#CBD5E1]">
              2. Confirm candidate email (<span className="font-mono text-[#C5A059]">{targetEmail}</span>):
            </Label>
            <Input
              value={emailText}
              onChange={(e) => setEmailText(e.target.value)}
              placeholder={targetEmail}
              disabled={deleteMutation.isPending}
              className="bg-[#080D16] border-[#263140] text-[#F8FAFC] focus:border-rose-500 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-[#CBD5E1]">3. Reason for permanent deletion:</Label>
            <Textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="e.g. Duplicate test account requested by candidate..."
              disabled={deleteMutation.isPending}
              rows={2}
              className="bg-[#080D16] border-[#263140] text-[#F8FAFC] focus:border-rose-500 text-xs"
            />
          </div>
        </div>

        <DialogFooter className="pt-2 gap-2">
          <DialogClose
            render={
              <Button
                type="button"
                variant="outline"
                disabled={deleteMutation.isPending}
                className="border-[#263140] bg-[#080D16] text-[#94A3B8] hover:text-[#F8FAFC]"
              />
            }
          >
            Cancel
          </DialogClose>
          <Button
            type="button"
            disabled={!isConfirmationValid || deleteMutation.isPending}
            onClick={handleDelete}
            className="bg-rose-600 hover:bg-rose-700 text-white font-medium cursor-pointer disabled:opacity-40"
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Deleting candidate and associated records...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-1.5" /> Permanently Delete Candidate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
