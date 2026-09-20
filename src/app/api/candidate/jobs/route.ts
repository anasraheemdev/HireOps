import { NextResponse } from "next/server";
import { requireProfile, jsonError, ApiError } from "@/lib/api/helpers";
import { requireCandidateId } from "@/lib/services/candidate-portal.service";
import { getCandidateJobRecommendations } from "@/lib/services/job-matching.service";

export async function GET(request: Request) {
  try {
    const { supabase, profile } = await requireProfile();
    if (profile.portalRole !== "candidate" && profile.portalRole !== "super_admin") {
      throw new ApiError(403, "Access restricted to candidates");
    }

    const { candidateId } = await requireCandidateId(profile);
    const url = new URL(request.url);
    const thresholdParam = url.searchParams.get("threshold");
    const threshold = thresholdParam ? Math.max(0, Math.min(100, Number(thresholdParam))) : 55;

    const data = await getCandidateJobRecommendations(supabase, candidateId, threshold);

    return NextResponse.json({ data });
  } catch (err) {
    return jsonError(err);
  }
}
