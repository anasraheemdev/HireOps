import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, requireProfile, jsonError, ApiError } from "@/lib/api/helpers";
import { listInterviewSessions, createInterviewSession } from "@/lib/services/enterprise.service";
import { listMyInterviews, requireCandidateId } from "@/lib/services/candidate-portal.service";

export async function GET(request: Request) {
  try {
    const { supabase, profile } = await requireProfile();
    const url = new URL(request.url);
    const mine = url.searchParams.get("mine") === "1" || profile.portalRole === "candidate";

    if (mine) {
      const { candidateId } = await requireCandidateId(profile);
      const data = await listMyInterviews(supabase, candidateId);
      return NextResponse.json({ data });
    }

    await requirePermission("interviews.read", "interviews.conduct");
    const data = await listInterviewSessions(supabase);
    return NextResponse.json({ data });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user, profile } = await requirePermission("interviews.write", "interviews.conduct");
    if (!profile.organizationId) throw new ApiError(403, "No organization");
    const body = z
      .object({
        candidateId: z.string().uuid(),
        jobId: z.string().uuid().optional(),
        applicationId: z.string().uuid().optional(),
        mode: z.string().optional(),
        templateId: z.string().uuid().optional(),
      })
      .parse(await request.json());
    const data = await createInterviewSession(supabase, profile.organizationId, user.id, body);
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
