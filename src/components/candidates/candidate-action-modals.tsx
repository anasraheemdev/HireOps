"use client";

import React, { useState } from "react";
import { CheckCircle2, Calendar, XCircle, Loader2 } from "lucide-react";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useSubmitHiringDecisionMutation,
  useScheduleHumanInterviewMutation,
} from "@/lib/queries/use-candidates";
import { toast } from "sonner";

interface SelectCandidateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateName: string;
  applicationId: string;
  jobTitle: string;
}

export function SelectCandidateModal({
  open,
  onOpenChange,
  candidateName,
  applicationId,
  jobTitle,
}: SelectCandidateModalProps) {
  const [candidateMessage, setCandidateMessage] = useState(
    `Congratulations! You have successfully completed the recruitment stages and have been selected for the ${jobTitle} role. The HR team will contact you with further details.`
  );
  const [internalNotes, setInternalNotes] = useState("");

  const submitDecision = useSubmitHiringDecisionMutation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitDecision.mutate(
      {
        applicationId,
        decision: "select",
        candidateMessage: candidateMessage.trim(),
        internalNotes: internalNotes.trim(),
      },
      {
        onSuccess: () => {
          toast.success(`Candidate ${candidateName} selected for ${jobTitle}!`);
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to record decision");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-card border-white/15 text-xs">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="h-5 w-5" /> Select Candidate: {candidateName}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Confirm candidate selection for <strong>{jobTitle}</strong>. This updates the application stage to Hired / Shortlisted and sends an in-app notification to the candidate.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs">Candidate Notification Message</Label>
            <Textarea
              rows={3}
              value={candidateMessage}
              onChange={(e) => setCandidateMessage(e.target.value)}
              className="bg-white/5 border-white/10 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Internal HR Notes (Confidential)</Label>
            <Textarea
              rows={2}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Private notes for HR team..."
              className="bg-white/5 border-white/10 text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs cursor-pointer"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer gap-1"
              disabled={submitDecision.isPending}
            >
              {submitDecision.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Confirm Selection
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ScheduleHumanInterviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateName: string;
  applicationId: string;
  jobTitle: string;
}

export function ScheduleHumanInterviewModal({
  open,
  onOpenChange,
  candidateName,
  applicationId,
  jobTitle,
}: ScheduleHumanInterviewModalProps) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [timezone, setTimezone] = useState("GST (UTC+4)");
  const [interviewType, setInterviewType] = useState<"video" | "in_person" | "phone">("video");
  const [interviewerName, setInterviewerName] = useState("HR Director");
  const [interviewerEmail, setInterviewerEmail] = useState("");
  const [meetingLink, setMeetingLink] = useState("https://meet.google.com/xyz-abc");
  const [location, setLocation] = useState("Oman Investment Authority HQ, Muscat");
  const [candidateInstructions, setCandidateInstructions] = useState(
    `Your human interview for ${jobTitle} has been scheduled. Please be ready 5 minutes before the scheduled time.`
  );
  const [internalNotes, setInternalNotes] = useState("");

  const scheduleMutation = useScheduleHumanInterviewMutation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      toast.error("Please select an interview date");
      return;
    }
    const scheduledAt = new Date(`${date}T${time}:00`).toISOString();

    scheduleMutation.mutate(
      {
        applicationId,
        scheduledAt,
        timezone,
        interviewType,
        interviewerName: interviewerName.trim(),
        interviewerEmail: interviewerEmail.trim() || undefined,
        meetingLink: interviewType === "video" ? meetingLink.trim() : undefined,
        location: interviewType === "in_person" ? location.trim() : undefined,
        candidateInstructions: candidateInstructions.trim(),
        internalNotes: internalNotes.trim(),
      },
      {
        onSuccess: () => {
          toast.success(`Human interview scheduled for ${candidateName}!`);
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to schedule interview");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg glass-card border-white/15 text-xs max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2 text-primary">
            <Calendar className="h-5 w-5" /> Schedule Human Interview: {candidateName}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Schedule a face-to-face, video, or phone interview for <strong>{jobTitle}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 py-1">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label className="text-xs">Interview Date *</Label>
              <Input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-white/5 border-white/10 h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Interview Time *</Label>
              <Input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="bg-white/5 border-white/10 h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label className="text-xs">Interview Type</Label>
              <Select value={interviewType} onValueChange={(v) => setInterviewType(v as "video" | "in_person" | "phone")}>
                <SelectTrigger className="bg-white/5 border-white/10 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Video Call</SelectItem>
                  <SelectItem value="in_person">In-Person</SelectItem>
                  <SelectItem value="phone">Phone Call</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Timezone</Label>
              <Input
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="bg-white/5 border-white/10 h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label className="text-xs">Interviewer Name *</Label>
              <Input
                required
                value={interviewerName}
                onChange={(e) => setInterviewerName(e.target.value)}
                className="bg-white/5 border-white/10 h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Interviewer Email</Label>
              <Input
                type="email"
                value={interviewerEmail}
                onChange={(e) => setInterviewerEmail(e.target.value)}
                className="bg-white/5 border-white/10 h-8 text-xs"
              />
            </div>
          </div>

          {interviewType === "video" && (
            <div className="space-y-1">
              <Label className="text-xs">Meeting Link (Google Meet / Teams / Zoom)</Label>
              <Input
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://..."
                className="bg-white/5 border-white/10 h-8 text-xs"
              />
            </div>
          )}

          {interviewType === "in_person" && (
            <div className="space-y-1">
              <Label className="text-xs">Physical Location</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Office location..."
                className="bg-white/5 border-white/10 h-8 text-xs"
              />
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Instructions for Candidate</Label>
            <Textarea
              rows={2}
              value={candidateInstructions}
              onChange={(e) => setCandidateInstructions(e.target.value)}
              className="bg-white/5 border-white/10 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Internal Notes (Confidential)</Label>
            <Textarea
              rows={2}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Preparation notes..."
              className="bg-white/5 border-white/10 text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs cursor-pointer"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-8 text-xs gradient-brand text-white cursor-pointer gap-1"
              disabled={scheduleMutation.isPending}
            >
              {scheduleMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calendar className="h-3.5 w-3.5" />}
              Confirm Schedule
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface RejectCandidateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateName: string;
  applicationId: string;
  jobTitle: string;
}

export function RejectCandidateModal({
  open,
  onOpenChange,
  candidateName,
  applicationId,
  jobTitle,
}: RejectCandidateModalProps) {
  const [rejectionReason, setRejectionReason] = useState("Qualifications did not meet minimum requirements for this specific role.");
  const [candidateMessage, setCandidateMessage] = useState(
    `Thank you for your interest in the ${jobTitle} position and for taking the time to participate in our recruitment process. After careful review, we have decided to proceed with other candidates whose qualifications more closely match our current requirements.`
  );

  const submitDecision = useSubmitHiringDecisionMutation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      toast.error("Internal rejection reason is required");
      return;
    }

    submitDecision.mutate(
      {
        applicationId,
        decision: "reject",
        candidateMessage: candidateMessage.trim(),
        rejectionReason: rejectionReason.trim(),
        internalNotes: rejectionReason.trim(),
      },
      {
        onSuccess: () => {
          toast.error(`Candidate ${candidateName} marked as rejected`);
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to record rejection");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-card border-white/15 text-xs">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2 text-rose-400">
            <XCircle className="h-5 w-5" /> Reject Candidate: {candidateName}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Update stage for <strong>{jobTitle}</strong> to Rejected. Internal rejection reason will be stored for audit purposes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs">Internal Rejection Reason * (Confidential)</Label>
            <Textarea
              required
              rows={2}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="bg-white/5 border-white/10 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Candidate Notification Message</Label>
            <Textarea
              rows={3}
              value={candidateMessage}
              onChange={(e) => setCandidateMessage(e.target.value)}
              className="bg-white/5 border-white/10 text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs cursor-pointer"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="destructive"
              className="h-8 text-xs cursor-pointer gap-1"
              disabled={submitDecision.isPending}
            >
              {submitDecision.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
