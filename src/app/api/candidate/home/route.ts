import { NextResponse } from "next/server";
import { requireProfile, jsonError } from "@/lib/api/helpers";
import {
  candidateHomeStats,
  requireCandidateId,
} from "@/lib/services/candidate-portal.service";

export async function GET() {
  try {
    const { supabase, user, profile } = await requireProfile();
    const { candidateId } = await requireCandidateId(profile);
    const data = await candidateHomeStats(supabase, candidateId, user.id);
    return NextResponse.json({ data });
  } catch (err) {
    return jsonError(err);
  }
}
