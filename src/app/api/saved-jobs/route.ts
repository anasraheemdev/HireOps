import { NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, jsonError, ApiError } from "@/lib/api/helpers";
import {
  listSavedJobs,
  requireCandidateId,
  saveJob,
  unsaveJob,
} from "@/lib/services/candidate-portal.service";

export async function GET() {
  try {
    const { supabase, profile } = await requireProfile();
    const { candidateId } = await requireCandidateId(profile);
    const data = await listSavedJobs(supabase, candidateId);
    return NextResponse.json({ data });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, profile } = await requireProfile();
    const { candidateId } = await requireCandidateId(profile);
    const body = z.object({ jobId: z.string().uuid() }).parse(await request.json());
    const data = await saveJob(supabase, candidateId, body.jobId);
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(request: Request) {
  try {
    const { supabase, profile } = await requireProfile();
    const { candidateId } = await requireCandidateId(profile);
    const url = new URL(request.url);
    const jobId = url.searchParams.get("jobId");
    if (!jobId) throw new ApiError(400, "jobId required");
    z.string().uuid().parse(jobId);
    await unsaveJob(supabase, candidateId, jobId);
    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    return jsonError(err);
  }
}
