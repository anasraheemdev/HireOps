import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, jsonError, ApiError } from "@/lib/api/helpers";
import { scheduleHumanInterview } from "@/lib/services/hr-candidate-review.service";

const scheduleSchema = z.object({
  scheduledAt: z.string().datetime({ message: "scheduledAt must be a valid ISO date-time string" }),
  timezone: z.string().optional().default("GST"),
  interviewType: z.enum(["in_person", "video", "phone"]).default("video"),
  interviewerName: z.string().min(1, "Interviewer name is required"),
  interviewerEmail: z.string().email().optional().or(z.literal("")),
  meetingLink: z.string().optional().or(z.literal("")),
  location: z.string().optional().or(z.literal("")),
  candidateInstructions: z.string().optional(),
  internalNotes: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: applicationId } = await params;
    const { profile, supabase } = await requirePermission("candidates.write");

    const json = await request.json();
    const body = scheduleSchema.parse(json);

    const scheduledDate = new Date(body.scheduledAt);
    if (scheduledDate.getTime() < Date.now() - 300000) {
      throw new ApiError(400, "Interview date and time must be in the future");
    }

    const record = await scheduleHumanInterview(supabase, applicationId, {
      scheduledAt: body.scheduledAt,
      timezone: body.timezone,
      interviewType: body.interviewType,
      interviewerName: body.interviewerName,
      interviewerEmail: body.interviewerEmail || undefined,
      meetingLink: body.meetingLink || undefined,
      location: body.location || undefined,
      candidateInstructions: body.candidateInstructions,
      internalNotes: body.internalNotes,
      actorId: profile.id,
    });

    return NextResponse.json({ data: record });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(new ApiError(400, err.issues[0]?.message ?? "Invalid interview schedule payload"));
    }
    return jsonError(err);
  }
}
