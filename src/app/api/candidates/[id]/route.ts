import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, jsonError, ApiError } from "@/lib/api/helpers";
import { getCandidateById, updateCandidate, updateCandidateSchema } from "@/lib/services/candidates.service";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase } = await requirePermission("candidates.read");
    const candidate = await getCandidateById(supabase, id);
    if (!candidate) throw new ApiError(404, "Candidate not found");
    return NextResponse.json({ data: candidate });
  } catch (err) {
    return jsonError(err);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase } = await requirePermission("candidates.write");
    const json = await request.json();
    const input = updateCandidateSchema.parse(json);
    const existing = await getCandidateById(supabase, id);
    if (!existing) throw new ApiError(404, "Candidate not found");
    const candidate = await updateCandidate(supabase, id, input);
    return NextResponse.json({ data: candidate });
  } catch (err) {
    if (err instanceof z.ZodError) return jsonError(new ApiError(400, err.issues[0]?.message ?? "Invalid request body"));
    return jsonError(err);
  }
}
