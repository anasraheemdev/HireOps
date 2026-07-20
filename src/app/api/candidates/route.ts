import { NextResponse } from "next/server";
import { requirePermission, jsonError, ApiError } from "@/lib/api/helpers";
import { listCandidates } from "@/lib/services/candidates.service";
import { createCandidate, createCandidateSchema } from "@/lib/services/create-candidate.service";

export async function GET() {
  try {
    const { supabase } = await requirePermission("candidates.read");
    const candidates = await listCandidates(supabase);
    return NextResponse.json({ data: candidates });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user, profile } = await requirePermission("candidates.write");
    if (!profile.organizationId) throw new ApiError(403, "No organization assigned to your profile");

    const body = await request.json();
    const parsed = createCandidateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid candidate payload");
    }

    const candidate = await createCandidate(supabase, profile.organizationId, user.id, parsed.data);
    return NextResponse.json({ data: candidate }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
