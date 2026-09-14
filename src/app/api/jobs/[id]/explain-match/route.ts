import { requireFeature } from '@/lib/services/feature-access';
import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, jsonError, ApiError } from "@/lib/api/helpers";
import { explainMatch } from "@/lib/services/matching.service";

export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  candidateId: z.string().uuid(),
});

export async function POST(request: Request, { params }: Params) {
  try {
    const { supabase, profile } = await requirePermission("candidates.read");
    await requireFeature(profile.organizationId, "semantic_matching");
    const { id: jobId } = await params;
    const body = bodySchema.safeParse(await request.json());
    if (!body.success) throw new ApiError(400, "candidateId is required");

    const reasoning = await explainMatch(supabase, jobId, body.data.candidateId);
    return NextResponse.json({ data: reasoning });
  } catch (err) {
    return jsonError(err);
  }
}
