"use client";

import { useParams } from "next/navigation";
import { InterviewSessionView } from "@/components/interview/interview-session-view";

export default function HrInterviewSessionPage() {
  const { id } = useParams<{ id: string }>();
  return <InterviewSessionView sessionId={id} backHref="/hr/ai-interview" showNotes />;
}
