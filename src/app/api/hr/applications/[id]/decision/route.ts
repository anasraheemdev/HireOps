import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, jsonError, ApiError } from "@/lib/api/helpers";
import { submitHiringDecision } from "@/lib/services/hr-candidate-review.service";

const decisionSchema = z.object({
  decision: z.enum(["select", "reject"]),
  candidateMessage: z.string().optional(),
  internalNotes: z.string().optional(),
  rejectionReason: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: applicationId } = await params;
    const { profile, supabase } = await requirePermission("candidates.write");

    const json = await request.json();
    const body = decisionSchema.parse(json);

    const decisionRecord = await submitHiringDecision(supabase, applicationId, {
      decision: body.decision,
      candidateMessage: body.candidateMessage,
      internalNotes: body.internalNotes || body.rejectionReason,
      actorId: profile.id,
    });

    return NextResponse.json({ data: decisionRecord });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(new ApiError(400, err.issues[0]?.message ?? "Invalid decision payload"));
    }
    return jsonError(err);
  }
}
