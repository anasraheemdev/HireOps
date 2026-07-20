import { NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, jsonError } from "@/lib/api/helpers";
import {
  listMyMessages,
  requireCandidateId,
  sendPortalMessage,
} from "@/lib/services/candidate-portal.service";

export async function GET() {
  try {
    const { supabase, profile } = await requireProfile();
    const { candidateId } = await requireCandidateId(profile);
    const data = await listMyMessages(supabase, candidateId);
    return NextResponse.json({ data });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user, profile } = await requireProfile();
    const { candidateId, organizationId } = await requireCandidateId(profile);
    const body = z
      .object({
        body: z.string().min(1).max(5000),
        subject: z.string().optional(),
        applicationId: z.string().uuid().optional(),
      })
      .parse(await request.json());
    const data = await sendPortalMessage(supabase, {
      organizationId,
      candidateId,
      senderId: user.id,
      body: body.body,
      subject: body.subject,
      applicationId: body.applicationId,
    });
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
