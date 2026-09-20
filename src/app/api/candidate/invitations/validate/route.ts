import { NextResponse } from "next/server";
import { jsonError, ApiError } from "@/lib/api/helpers";
import { validateInvitationToken } from "@/lib/services/invitation.service";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token?.trim()) {
      throw new ApiError(400, "Invitation token is required");
    }

    const data = await validateInvitationToken(token.trim());
    return NextResponse.json({ data });
  } catch (err) {
    return jsonError(err);
  }
}
