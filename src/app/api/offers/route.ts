import { NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, jsonError, ApiError } from "@/lib/api/helpers";
import {
  listMyOffers,
  requireCandidateId,
  respondToOffer,
  createNotification,
} from "@/lib/services/candidate-portal.service";

export async function GET() {
  try {
    const { supabase, profile } = await requireProfile();
    const { candidateId } = await requireCandidateId(profile);
    const data = await listMyOffers(supabase, candidateId);
    return NextResponse.json({ data });
  } catch (err) {
    return jsonError(err);
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase, user, profile } = await requireProfile();
    const { candidateId } = await requireCandidateId(profile);
    const body = z
      .object({
        offerId: z.string().uuid(),
        status: z.enum(["accepted", "declined"]),
      })
      .parse(await request.json());
    const data = await respondToOffer(supabase, body.offerId, candidateId, body.status);
    await createNotification(supabase, {
      recipientId: user.id,
      type: "offer",
      title: body.status === "accepted" ? "Offer accepted" : "Offer declined",
      body: `You ${body.status} an offer.`,
      metadata: { offerId: body.offerId },
    }).catch(() => null);
    return NextResponse.json({ data });
  } catch (err) {
    if (err instanceof Error && err.message.includes("candidate")) {
      return jsonError(new ApiError(400, err.message));
    }
    return jsonError(err);
  }
}
