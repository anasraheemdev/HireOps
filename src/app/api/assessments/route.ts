import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, requireProfile, jsonError, ApiError } from "@/lib/api/helpers";
import { listAssessmentsRaw, createAssessment } from "@/lib/services/enterprise.service";
import { listMyAssessmentAssignments, requireCandidateId } from "@/lib/services/candidate-portal.service";

export async function GET(request: Request) {
  try {
    const { supabase, profile } = await requireProfile();
    const url = new URL(request.url);
    const mine = url.searchParams.get("mine") === "1" || profile.portalRole === "candidate";

    if (mine) {
      const { candidateId } = await requireCandidateId(profile);
      const data = await listMyAssessmentAssignments(supabase, candidateId);
      return NextResponse.json({ data });
    }

    await requirePermission("assessments.read");
    const data = await listAssessmentsRaw(supabase);
    return NextResponse.json({ data });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user, profile } = await requirePermission("assessments.write");
    if (!profile.organizationId) throw new ApiError(403, "No organization");
    const body = z
      .object({
        title: z.string().min(3),
        description: z.string().optional(),
        difficulty: z.string().optional(),
        durationMinutes: z.number().optional(),
      })
      .parse(await request.json());
    const data = await createAssessment(supabase, profile.organizationId, user.id, body);
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
