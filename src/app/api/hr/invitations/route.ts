import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, jsonError, ApiError } from "@/lib/api/helpers";
import { createCandidateInvitation } from "@/lib/services/invitation.service";

const inviteSchema = z.object({
  jobId: z.string().uuid("Invalid job ID"),
  email: z.string().email("Invalid candidate email"),
  fullName: z.string().min(1, "Candidate full name required"),
  expiresInDays: z.number().int().min(1).max(30).optional(),
});

export async function POST(req: Request) {
  try {
    const ctx = await requirePermission("candidates.create");
    if (ctx.profile.portalRole !== "hr" && ctx.profile.portalRole !== "super_admin") {
      throw new ApiError(403, "Only HR or Super Admin can issue candidate invitations");
    }

    const body = inviteSchema.parse(await req.json());
    const data = await createCandidateInvitation(ctx.supabase, {
      organizationId: ctx.profile.organizationId!,
      jobId: body.jobId,
      email: body.email.trim(),
      fullName: body.fullName.trim(),
      actorId: ctx.profile.id,
      expiresInDays: body.expiresInDays,
    });

    return NextResponse.json({ data });
  } catch (err) {
    return jsonError(err);
  }
}
