import { NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, jsonError, ApiError } from "@/lib/api/helpers";
import { acceptAndLinkInvitation } from "@/lib/services/invitation.service";

const acceptSchema = z.object({
  token: z.string().min(1, "Token required"),
});

export async function POST(req: Request) {
  try {
    const { profile } = await requireProfile();
    if (!profile.email) {
      throw new ApiError(400, "Authenticated user email required");
    }

    const body = acceptSchema.parse(await req.json());
    const data = await acceptAndLinkInvitation(body.token.trim(), profile.id, profile.email);

    return NextResponse.json({ data });
  } catch (err) {
    return jsonError(err);
  }
}
