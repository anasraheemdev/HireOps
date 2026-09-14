import { requireFeature } from '@/lib/services/feature-access';
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, jsonError } from "@/lib/api/helpers";
import {
  careerAssistantReply,
  requireCandidateId,
} from "@/lib/services/candidate-portal.service";

export async function POST(request: Request) {
  try {
    const { supabase, profile } = await requireProfile();
    await requireFeature(profile.organizationId, 'career_assistant');
    const { candidateId } = await requireCandidateId(profile);
    const body = z.object({ message: z.string().min(1).max(4000) }).parse(await request.json());
    const data = await careerAssistantReply(supabase, candidateId, body.message);
    return NextResponse.json({ data });
  } catch (err) {
    return jsonError(err);
  }
}
