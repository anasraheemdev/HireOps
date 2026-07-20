import { NextResponse } from "next/server";
import { requirePermission, jsonError, ApiError } from "@/lib/api/helpers";
import { matchCandidatesForJob } from "@/lib/services/matching.service";

export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { supabase } = await requirePermission("candidates.read");
    const { id } = await params;
    if (!id) throw new ApiError(400, "Missing job id");

    const result = await matchCandidatesForJob(supabase, id);
    return NextResponse.json({ data: result });
  } catch (err) {
    return jsonError(err);
  }
}
