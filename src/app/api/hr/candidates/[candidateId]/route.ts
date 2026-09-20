import { NextResponse } from "next/server";
import { requirePermission, jsonError } from "@/lib/api/helpers";
import { getHrCandidateReviewData } from "@/lib/services/hr-candidate-review.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  try {
    const { candidateId } = await params;
    const { profile, supabase } = await requirePermission("candidates.read");

    const url = new URL(request.url);
    const applicationId = url.searchParams.get("applicationId");

    const data = await getHrCandidateReviewData(
      supabase,
      candidateId,
      applicationId,
      profile.organizationId
    );

    return NextResponse.json({ data });
  } catch (err) {
    return jsonError(err);
  }
}
